-- Medición del listado de leads con 2.000 leads sintéticos (`pnpm db:medir`, contra el Supabase LOCAL).
--
-- Todo pasa en una transacción que se revierte: no deja filas. Sí consume números de las identidades
-- de `leads` y `actividad` (huecos en la numeración, nada más). Cada consulta es la que arma
-- PostgREST sobre `leads_vista` (con `json_agg`), corre como `authenticated` con la sesión de una
-- persona, 7 veces, y se informa la mediana de las 5 últimas (las 2 primeras calientan).
--
-- El terreno: una dueña («todos») con 1.950 leads y un asesor («propios») con 50; la dueña tiene 200
-- favoritos, 286 tachados y 12 etiquetas en ~1.700 asignaciones; el asesor, sus propias marcas.
-- «antes» es la consulta sin las marcas (como era hasta la parte 5b) y «hoy» la que pide el
-- listado ahora: con `es_favorito`, `esta_tachado` y `etiquetas`, y los tachados ocultos.
\set ON_ERROR_STOP 1
begin;

-- Las dos personas nacen invitadas (el registro abierto lo decide la base viva) y con su rol. En
-- una base sin nadie la primera nace dueña sola: por eso `on conflict`.
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'duena-medir@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000000a1', 'asesor-medir@ejemplo.com', '{"invitado": true}');
insert into public.usuarios_roles (usuario_id, rol_id)
select '00000000-0000-0000-0000-0000000000d1', id from public.roles where clave = 'dueno'
on conflict do nothing;
insert into public.usuarios_roles (usuario_id, rol_id)
select '00000000-0000-0000-0000-0000000000a1', id from public.roles where clave = 'asesor'
on conflict do nothing;

insert into public.leads (nombre, telefono_principal, creado_por, atributos, creado_en)
select 'Medir ' || g, (79000000 + g)::text,
       case when g % 40 = 0 then '00000000-0000-0000-0000-0000000000a1'::uuid
            else '00000000-0000-0000-0000-0000000000d1'::uuid end,
       jsonb_build_object('ciudad', (array['Santa Cruz', 'La Paz', 'Cochabamba', 'Sucre'])[1 + g % 4], 'edad', 20 + g % 50),
       now() - make_interval(mins => g)
from generate_series(1, 2000) g;

create temporary table medir_leads on commit drop as
select id, row_number() over (order by creado_en) as n from public.leads where nombre like 'Medir %';

insert into public.leads_favoritos (lead_id, usuario_id)
select id, '00000000-0000-0000-0000-0000000000d1' from medir_leads where n % 10 = 0;
insert into public.leads_tachados (lead_id, usuario_id)
select id, '00000000-0000-0000-0000-0000000000d1' from medir_leads where n % 7 = 1;
insert into public.leads_favoritos (lead_id, usuario_id)
select id, '00000000-0000-0000-0000-0000000000a1' from medir_leads where n % 40 = 0;
insert into public.etiquetas (id, usuario_id, nombre)
select ('00000000-0000-0000-0000-0000000e00' || lpad(g::text, 2, '0'))::uuid, '00000000-0000-0000-0000-0000000000d1', 'Medir ' || g
from generate_series(1, 12) g;
insert into public.leads_etiquetas (lead_id, etiqueta_id)
select l.id, ('00000000-0000-0000-0000-0000000e00' || lpad((1 + (l.n + k) % 12)::text, 2, '0'))::uuid
from medir_leads l cross join generate_series(0, 1) k where l.n % 7 in (2, 3, 4)
on conflict do nothing;
analyze public.leads;
analyze public.leads_asesores;
analyze public.leads_favoritos;
analyze public.leads_tachados;
analyze public.etiquetas;
analyze public.leads_etiquetas;

-- Mide una consulta como `authenticated` (con la persona de `request.jwt.claim.sub`): 7 corridas
-- con EXPLAIN ANALYZE, la mediana de las 5 últimas en ms. El rol se cambia adentro: la función vive
-- en el esquema temporal de quien la creó.
create function pg_temp.medir(p_nombre text, p_sql text) returns void language plpgsql as $$
declare v_plan json; v_tiempos numeric[] := '{}'; v_mediana numeric; i int;
begin
  set local role authenticated;
  for i in 1..7 loop
    execute 'explain (analyze, format json) ' || p_sql into v_plan;
    if i > 2 then
      v_tiempos := v_tiempos || ((v_plan -> 0 ->> 'Execution Time')::numeric);
    end if;
  end loop;
  reset role;
  select percentile_cont(0.5) within group (order by t) into v_mediana from unnest(v_tiempos) t;
  raise notice 'medicion|%|%', p_nombre, round(v_mediana, 1);
end $$;

create function pg_temp.pagina(p_columnas text, p_donde text) returns text language sql as $$
  select format('select coalesce(json_agg(t), ''[]'') from (select %s from public.leads_vista where %s order by creado_en desc, id desc limit 51) t',
                p_columnas, p_donde);
$$;

-- Las columnas que pide el listado (`COLUMNAS_FIJAS` y un atributo de la tabla).
create function pg_temp.antes() returns text language sql as $$
  select 'id, numero, nombre, telefono_principal, en_cartera, tipo_lead_id, origen_lead_id, creado_en, atributos -> ''ciudad'' as a_ciudad';
$$;
create function pg_temp.hoy() returns text language sql as $$
  select pg_temp.antes() || ', es_favorito, esta_tachado, etiquetas';
$$;

-- La dueña («todos»).
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
select pg_temp.medir('página sin filtro · antes', pg_temp.pagina(pg_temp.antes(), 'true'));
select pg_temp.medir('página sin filtro · hoy (tachados ocultos)', pg_temp.pagina(pg_temp.hoy(), 'esta_tachado = false'));
select pg_temp.medir('un atributo · antes', pg_temp.pagina(pg_temp.antes(), $q$atributos ->> 'ciudad' = 'La Paz'$q$));
select pg_temp.medir('un atributo · hoy', pg_temp.pagina(pg_temp.hoy(), $q$atributos ->> 'ciudad' = 'La Paz' and esta_tachado = false$q$));
select pg_temp.medir('búsqueda por nombre · antes', pg_temp.pagina(pg_temp.antes(), $q$nombre ilike '%Medir 15%'$q$));
select pg_temp.medir('búsqueda por nombre · hoy (no oculta)', pg_temp.pagina(pg_temp.hoy(), $q$nombre ilike '%Medir 15%'$q$));
select pg_temp.medir('página 2 por cursor · antes', pg_temp.pagina(pg_temp.antes(),
  '(creado_en, id) < (select creado_en, id from public.leads order by creado_en desc, id desc offset 60 limit 1)'));
select pg_temp.medir('página 2 por cursor · hoy', pg_temp.pagina(pg_temp.hoy(),
  'esta_tachado = false and (creado_en, id) < (select creado_en, id from public.leads order by creado_en desc, id desc offset 60 limit 1)'));
select pg_temp.medir('solo favoritos', pg_temp.pagina(pg_temp.hoy(), 'es_favorito = true and esta_tachado = false'));
select pg_temp.medir('solo tachados', pg_temp.pagina(pg_temp.hoy(), 'esta_tachado = true'));
select pg_temp.medir('etiqueta «cualquiera de» 2', pg_temp.pagina(pg_temp.hoy(),
  $q$etiquetas && '{00000000-0000-0000-0000-0000000e0001,00000000-0000-0000-0000-0000000e0002}'::uuid[] and esta_tachado = false$q$));
select pg_temp.medir('conteo de ocultos sin filtros', 'select count(*) from public.leads_vista where esta_tachado = true');
select pg_temp.medir('conteo de ocultos con un atributo',
  $q$select count(*) from public.leads_vista where esta_tachado = true and atributos ->> 'ciudad' = 'La Paz'$q$);

-- El asesor («propios»: 50 de 2.000).
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select pg_temp.medir('asesor «propios» · antes', pg_temp.pagina(pg_temp.antes(), 'true'));
select pg_temp.medir('asesor «propios» · hoy', pg_temp.pagina(pg_temp.hoy(), 'esta_tachado = false'));

rollback;
