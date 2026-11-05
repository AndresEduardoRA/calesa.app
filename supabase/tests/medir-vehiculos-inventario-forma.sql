-- La forma del plan de `vehiculos_inventario()` (paso 4.16-2a, cierra 4-23) con 50.000 y con 250.000 vehículos vivos: `pnpm db:medir:volumen`, contra el Supabase LOCAL con
-- la siembra de volumen. El terreno y los casos de `medir-vehiculos-inventario.sql` (el costo), copiados. Todo en una transacción que se revierte.
--
-- Por caso y sentido, como `authenticated` con los claims de la persona, un bloque plpgsql corre `execute 'explain (summary, format json) ' || _vehiculos_inventario_sql(…)
-- using <los seis parámetros>`: el mismo texto, por el mismo camino que la función (el plan normal, planeado con los valores). Asserta los cuatro puntos de C8:
--   1. en R1 y R2, el `Index Scan` de su índice (`origen_listado` o `creador`) cuelga del `Limit` de la ruta (con un `Result` posible en medio), en el sentido del caso
--      (`Backward` en «Anterior»): si no, «ordena todas las filas de la ruta»;
--   2. en R3, un `Nested Loop` con `mis_leads` afuera y, adentro, un `Limit` sobre `vehiculos_lead_id_idx`: si no, «la cartera recorre el origen»;
--   3. ningún `Seq Scan` de `vehiculos`; los `Sort`, sólo sobre el `Append` de las rutas, dentro del lateral de R3 o sobre lo ya cortado;
--   4. todo nodo sobre `vehiculos_pkey` cuelga de un `SubPlan` (el `case` de la relectura de R3 o la policy de la portada): si no, «relee la fila».
-- La forma muerde: el texto de Pía sin el `limit $3` de R2 rompe el punto 1, y el marco de antes (la lateral que releía cada fila, copiado aquí como `pg_temp`) rompe el 4,
-- para Beto (`origen`) y para Pía (`propios`); si no, «la forma no muerde».
-- Notas: el `Planning Time` (s2: el texto se planea en cada llamada) y el plegado del filtro de la búsqueda en R2 (s1).
-- Salidas: `medicion|…|número` y `nota|…|` por el runner (`scripts/medir-listado.mjs`); `detalle|…` con la forma de cada caso, sólo en la salida de psql.
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.vehiculos, public.leads_asesores;
begin;
select set_config('medir.carga', :'carga', true), set_config('medir.pagina', (:max_vehiculos + 1)::text, true) \g /dev/null
do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') then raise exception 'falta la dueña de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)'; end if;
  if (select count(*) from public.leads where nombre like 'Volumen %' and eliminado_en is null) < 40000 then raise exception 'faltan los 50.000 leads «Volumen» de la siembra'; end if;
  if (select count(*) from public.vehiculos where eliminado_en is null) > 20000 then raise exception 'la base ya trae demasiados vehículos vivos: la medición llega a 50.000 y 250.000 (pnpm db:reset)'; end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir la forma del inventario: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres (el de medir-vehiculos-inventario.sql)
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('pia', '00000000-0000-0000-0000-0000000000f1'),
  ('beto', '00000000-0000-0000-0000-0000000000f2'), ('chica', '00000000-0000-0000-0000-0000000000f3'), ('vera', '00000000-0000-0000-0000-0000000000f4');
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'medir-veh-pia@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000000f2', 'medir-veh-beto@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000000f3', 'medir-veh-chica@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000000f4', 'medir-veh-vera@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Medir vehículos ' || id, invitacion_aceptada_en = now() where id in (select id from _p where clave <> 'duena');
with r as (insert into public.roles (clave, nombre) values ('medir_veh_propios', 'Medir vehículos propios') returning id),
     c as (insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) select id, 'vehiculos.ver', null, 'propios' from r returning rol_id)
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select p.id, (select id from r), true from _p p where p.clave <> 'duena';
create temp table _o (clave text primary key, id uuid not null);
insert into _o select case clave when 'subasta_usa' then 'a' else 'b' end, id from public.origenes where clave in ('subasta_usa', 'oficina');
create temp table _cartera (i int primary key, lead uuid not null);
insert into _cartera select row_number() over (order by id), id from public.leads where nombre like 'Volumen %' and eliminado_en is null;
grant select on _p, _o to authenticated;
set local session_replication_role = replica;
insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por, desde, lead_creado_en, lead_reciente_en)
select c.lead, p.id, 'compartido', '00000000-0000-0000-0000-0000000000d1', now(), l.creado_en, coalesce(l.ultimo_seguimiento_en, l.creado_en)
  from _cartera c join public.leads l on l.id = c.lead join _p p on p.clave = 'beto' or (p.clave = 'vera' and c.i between 5001 and 10000);
insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, creado_en, actualizado_en)
select (select id from _o where clave = 'a'), ('Medir veh Pía ' || g)::text, '00000000-0000-0000-0000-0000000000f1'::uuid, null::uuid, now() + g * interval '1 second', now() from generate_series(1, 5000) g
union all select (select id from _o where clave = 'b'), 'Medir veh Beto ' || g, '00000000-0000-0000-0000-0000000000d1'::uuid, (select lead from _cartera where i = g), now() + g * interval '1 second', now()
  from generate_series(1, 5000) g
union all select (select id from _o where clave = 'a'), 'Medir veh chica ' || g, '00000000-0000-0000-0000-0000000000f3'::uuid, null::uuid, timestamptz '2000-01-01 00:00:00+00' + g * interval '1 second', now()
  from generate_series(1, 3) g
union all select (select id from _o where clave = 'b'), 'Medir veh Vera ' || g, '00000000-0000-0000-0000-0000000000d1'::uuid, (select lead from _cartera where i = 5000 + g),
       timestamptz '2020-01-01 00:00:00+00' + g * interval '400 seconds' + interval '5 seconds', now() from generate_series(1, 1000) g;
create temp table _fase as select id from public.fases order by id limit 1;
update public.vehiculos set fase_id = (select id from _fase) where titulo like 'Medir veh Pía %' and (substring(titulo from 'Pía (\d+)$'))::int % 5 = 0;
update public.vehiculos set atributos = jsonb_build_object('km', (substring(titulo from 'Vera (\d+)$'))::int) where titulo like 'Medir veh Vera %';
set local session_replication_role = origin;
grant select on _fase to authenticated;

create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, creado_en, actualizado_en)
  select (select id from _o where clave = case when g % 2 = 0 then 'a' else 'b' end), 'Medir veh relleno ' || g, '00000000-0000-0000-0000-0000000000d1', null,
         timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds', timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds'
    from generate_series(p_desde, p_hasta) g;
  set local session_replication_role = origin;
end $$;

create temp table _cur (quien text primary key, ts timestamptz not null, id uuid not null);
insert into _cur select q, v.creado_en, v.id from (values ('pia', 'Pía', 1999), ('beto', 'Beto', 1999), ('chica', 'chica', 0), ('vera', 'Vera', 499)) x (q, t, k)
  cross join lateral (select creado_en, id from public.vehiculos where titulo like 'Medir veh ' || x.t || ' %' order by creado_en desc, id desc offset x.k limit 1) v;
create temp table _caso (caso text primary key, quien text, origen text, cursor text, filtros jsonb, ruta text);
insert into _caso values
  ('pia · página 1', 'pia', 'a', 'primera', '[]', 'propios'), ('pia · profunda', 'pia', 'a', 'siguiente', '[]', 'propios'),
  ('pia · anterior', 'pia', 'a', 'anterior', '[]', 'propios'), ('pia · búsqueda', 'pia', 'a', 'primera', '[{"tipo":"busqueda","texto":"Pía 4"}]', 'propios'),
  ('pia · fase', 'pia', 'a', 'primera', jsonb_build_array(jsonb_build_object('tipo', 'columna_en', 'columna', 'fase_id', 'valores', jsonb_build_array((select id from _fase)), 'incluirNulo', false)), 'propios'),
  ('pia · atributo sin coincidencias', 'pia', 'a', 'primera', '[{"tipo":"atributos_contienen","alternativas":[{"zz_nadie":"x"}]}]', 'propios'),
  ('pia · 500 alternativas', 'pia', 'a', 'primera', jsonb_build_array(jsonb_build_object('tipo', 'atributos_contienen', 'alternativas',
     (select jsonb_agg(jsonb_build_object('zz_nadie', 'x' || g)) from generate_series(1, 500) g))), 'propios'),
  ('chica · página 1', 'chica', 'a', 'primera', '[]', 'propios'), ('chica · profunda', 'chica', 'a', 'siguiente', '[]', 'propios'),
  ('chica · anterior', 'chica', 'a', 'anterior', '[]', 'propios'),
  ('beto · página 1', 'beto', 'b', 'primera', '[]', 'origen'), ('beto · profunda', 'beto', 'b', 'siguiente', '[]', 'origen'),
  ('beto · anterior', 'beto', 'b', 'anterior', '[]', 'origen'),
  ('vera · página 1', 'vera', 'b', 'primera', '[]', 'propios'), ('vera · profunda', 'vera', 'b', 'siguiente', '[]', 'propios'),
  ('vera · anterior', 'vera', 'b', 'anterior', '[]', 'propios'),
  ('vera · atributo', 'vera', 'b', 'primera', '[{"tipo":"atributo_rango_numero","clave":"km","min":500,"max":null}]', 'propios'),
  ('duena · página 1', 'duena', 'a', 'primera', '[]', 'origen');
grant select on _cur, _caso to authenticated;
create temp table _forma (fase text, caso text, forma text, planeo numeric);
grant all on _forma to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- La forma (corre como authenticated)
-- ---------------------------------------------------------------------------------------------------------------------------------
create function pg_temp.como(p_quien text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', (select id from _p where clave = p_quien)::text, true),
         set_config('request.jwt.claims', json_build_object('sub', (select id from _p where clave = p_quien), 'role', 'authenticated')::text, true);
$$;

-- El plan del texto, con los seis parámetros de la función: $1 los filtros, $2 el origen, $3 n + 1, $4 quien mira, $5 y $6 el cursor.
create function pg_temp.plan(p_sql text, c _caso, p_opciones text default 'summary, format json') returns jsonb language plpgsql as $$
declare v_cur _cur; v_plan jsonb;
begin
  perform pg_temp.como(c.quien);
  select * into v_cur from _cur where quien = c.quien and c.cursor <> 'primera';
  execute format('explain (%s) ', p_opciones) || p_sql into v_plan
    using c.filtros, (select id from _o where clave = c.origen), current_setting('medir.pagina')::int, (select id from _p where clave = c.quien), v_cur.ts, v_cur.id;
  return v_plan;
end $$;

-- Los nodos de un plan con su camino ('/0/1…').
create function pg_temp.nodos(p jsonb) returns table (camino text, nodo jsonb) language sql immutable as $$
  with recursive n(camino, nodo) as (
    select '', p
    union all
    select n.camino || '/' || (h.ord - 1)::text, h.x from n, jsonb_array_elements(coalesce(n.nodo -> 'Plans', '[]')) with ordinality h(x, ord))
  select * from n
$$;

-- Los cuatro puntos: '' si cumple; si no, cada falla con su número.
create function pg_temp.forma(p_plan jsonb, p_ruta text, p_cursor text) returns text language plpgsql as $$
declare v_raiz jsonb := p_plan -> 0 -> 'Plan'; v_f text := ''; r record; v_padre jsonb; v_abuelo jsonb;
  v_ix constant text := case p_ruta when 'origen' then 'vehiculos_origen_listado_idx' else 'vehiculos_creador_idx' end;
  v_dir constant text := case p_cursor when 'anterior' then 'Backward' else 'Forward' end;
begin
  if not exists (select 1 from pg_temp.nodos(v_raiz) where nodo ->> 'Index Name' = v_ix) then v_f := v_f || format(' [1] sin %s', v_ix); end if;
  for r in select camino, nodo from pg_temp.nodos(v_raiz) where nodo ->> 'Index Name' = v_ix loop
    select nodo into v_padre from pg_temp.nodos(v_raiz) where camino = regexp_replace(r.camino, '/\d+$', '');
    select nodo into v_abuelo from pg_temp.nodos(v_raiz) where camino = regexp_replace(regexp_replace(r.camino, '/\d+$', ''), '/\d+$', '');
    if not (v_padre ->> 'Node Type' = 'Limit' or (v_padre ->> 'Node Type' = 'Result' and v_abuelo ->> 'Node Type' = 'Limit')) then
      v_f := v_f || format(' [1] %s cuelga de %s: ordena todas las filas de la ruta', v_ix, v_padre ->> 'Node Type');
    end if;
    if r.nodo ->> 'Scan Direction' <> v_dir then v_f := v_f || format(' [1] %s en %s', v_ix, r.nodo ->> 'Scan Direction'); end if;
  end loop;
  if p_ruta = 'propios' and not exists (
      select 1 from pg_temp.nodos(v_raiz) a join pg_temp.nodos(v_raiz) b on b.camino like a.camino || '/0%' join pg_temp.nodos(v_raiz) l on l.camino like a.camino || '/1%'
       join pg_temp.nodos(v_raiz) x on x.camino like l.camino || '/%'
       where a.nodo ->> 'Node Type' = 'Nested Loop' and b.nodo ->> 'Function Name' = 'mis_leads' and l.nodo ->> 'Node Type' = 'Limit'
         and x.nodo ->> 'Index Name' = 'vehiculos_lead_id_idx') then
    v_f := v_f || ' [2] la cartera recorre el origen (no va por un lateral sobre vehiculos_lead_id_idx)';
  end if;
  if exists (select 1 from pg_temp.nodos(v_raiz) where nodo ->> 'Node Type' = 'Seq Scan' and nodo ->> 'Relation Name' = 'vehiculos') then v_f := v_f || ' [3] recorre vehiculos'; end if;
  for r in select camino, nodo from pg_temp.nodos(v_raiz) where nodo ->> 'Node Type' in ('Sort', 'Incremental Sort') loop
    if not (r.nodo -> 'Plans' -> 0 ->> 'Node Type' in ('Append', 'Merge Append')
            or exists (select 1 from pg_temp.nodos(v_raiz) a join pg_temp.nodos(v_raiz) b on b.camino like a.camino || '/0%'
                        where a.nodo ->> 'Node Type' = 'Nested Loop' and b.nodo ->> 'Function Name' = 'mis_leads' and r.camino like a.camino || '/1%')
            or exists (select 1 from pg_temp.nodos(v_raiz) d where d.camino like r.camino || '/%' and d.nodo ->> 'Node Type' = 'Limit')) then
      v_f := v_f || format(' [3] un Sort sobre %s', r.nodo -> 'Plans' -> 0 ->> 'Node Type');
    end if;
  end loop;
  if exists (select 1 from pg_temp.nodos(v_raiz) q where q.nodo ->> 'Index Name' = 'vehiculos_pkey'
              and not exists (select 1 from pg_temp.nodos(v_raiz) s where (q.camino = s.camino or q.camino like s.camino || '/%') and s.nodo ->> 'Parent Relationship' = 'SubPlan')) then
    v_f := v_f || ' [4] relee la fila';
  end if;
  return v_f;
end $$;

-- El marco de antes de P-limpieza (para que el punto 4 muerda): las mismas rutas, y `limpieza_el` por una lateral que relee por id cada una de las n + 1.
create function pg_temp.marco_viejo(p_sql text, p_cursor text) returns text language plpgsql as $$
declare v_rutas text := substring(p_sql from 'from \(select \* from \((.*)\) u order by'); v_d constant text := case p_cursor when 'anterior' then 'asc' else 'desc' end;
begin
  if v_rutas is null then raise exception 'el marco viejo no encuentra las rutas en el texto de _vehiculos_inventario_sql()'; end if;
  return format('select f.*, l.limpieza_el, p.ruta_miniatura from (select * from (%1$s) u order by u.creado_en %2$s, u.id %2$s limit $3) f '
    || 'left join lateral (select public.limpieza_el(w) as limpieza_el from public.vehiculos w where w.id = f.id) l on true '
    || 'left join lateral (select i.ruta_miniatura from public.vehiculos_imagenes i where i.vehiculo_id = f.id and i.es_portada limit 1) p on true '
    || 'order by f.creado_en %2$s, f.id %2$s', v_rutas, v_d);
end $$;

create function pg_temp.fase(p_fase text) returns void language plpgsql as $$
declare c _caso; v_plan jsonb;
begin
  set local role authenticated;
  for c in select * from _caso order by caso loop
    v_plan := pg_temp.plan(public._vehiculos_inventario_sql(c.filtros, c.ruta, c.cursor), c);
    insert into _forma values (p_fase, c.caso, pg_temp.forma(v_plan, c.ruta, c.cursor), (v_plan -> 0 ->> 'Planning Time')::numeric);
  end loop;
  reset role;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

select pg_temp.rellenar(1, 50000 - (select count(*)::int from public.vehiculos where eliminado_en is null));
analyze public.vehiculos; analyze public.leads_asesores;
select pg_temp.fase('50.000') \g /dev/null

-- La forma muerde (con 50.000) y el plegado (s1).
create temp table _muerde (que text, punto text, forma text);
grant all on _muerde to authenticated;
set local role authenticated;
do $$
declare v_pia _caso := (select c from _caso c where caso = 'pia · página 1'); v_beto _caso := (select c from _caso c where caso = 'beto · página 1'); v_plan jsonb;
begin
  insert into _muerde values ('Pía sin el limit de R2', '[1]', pg_temp.forma(pg_temp.plan(replace(public._vehiculos_inventario_sql('[]', 'propios', 'primera'),
    'v.id desc limit $3) union all', 'v.id desc) union all'), v_pia), 'propios', 'primera'));
  insert into _muerde values ('el marco de antes, Beto', '[4]', pg_temp.forma(pg_temp.plan(pg_temp.marco_viejo(public._vehiculos_inventario_sql('[]', 'origen', 'primera'), 'primera'),
    v_beto), 'origen', 'primera'));
  insert into _muerde values ('el marco de antes, Pía', '[4]', pg_temp.forma(pg_temp.plan(pg_temp.marco_viejo(public._vehiculos_inventario_sql('[]', 'propios', 'primera'), 'primera'),
    v_pia), 'propios', 'primera'));
  v_plan := pg_temp.plan(public._vehiculos_inventario_sql(c.filtros, 'propios', 'primera'), c, 'verbose, format json') from _caso c where caso = 'pia · búsqueda';
  raise notice 'nota|plegado (s1): el filtro de la búsqueda de Pía en R2: %|',
    (select nodo ->> 'Filter' from pg_temp.nodos(v_plan -> 0 -> 'Plan') where nodo ->> 'Index Name' = 'vehiculos_creador_idx' limit 1);
end $$;
reset role;

select pg_temp.rellenar(1000001, 1200000);
analyze public.vehiculos;
select pg_temp.fase('250.000') \g /dev/null

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Lo que se asserta
-- ---------------------------------------------------------------------------------------------------------------------------------
do $$
declare r record; v_f text := '';
begin
  for r in select * from _forma order by fase, caso loop
    raise notice 'detalle|% · % · Planning Time % ms|forma %', r.fase, r.caso, r.planeo, coalesce(nullif(r.forma, ''), 'ok');
    if r.forma <> '' then v_f := v_f || format(E'\n  %s · %s:%s', r.fase, r.caso, r.forma); end if;
  end loop;
  for r in select fase, count(*) filter (where forma = '') ok, count(*) n, percentile_cont(0.5) within group (order by planeo) med, max(planeo) mx,
                  (select caso from _forma g where g.fase = f.fase order by planeo desc limit 1) caso
             from _forma f group by fase order by fase loop
    raise notice 'medicion|% · casos con los cuatro puntos de la forma (de %)|%', r.fase, r.n, r.ok;
    raise notice 'nota|Planning Time (s2) con %: mediana % ms, máximo % ms (%)|', r.fase, round(r.med::numeric, 3), r.mx, r.caso;
  end loop;
  if (select count(*) from _forma) <> 2 * (select count(*) from _caso) then v_f := v_f || E'\n  faltan casos en la forma'; end if;
  for r in select * from _muerde loop
    raise notice 'nota|la forma muerde · %: %|', r.que, coalesce(nullif(r.forma, ''), 'NO MUERDE');
    if position(r.punto in r.forma) = 0 then v_f := v_f || format(E'\n  la forma no muerde: %s no rompe el punto %s (%s)', r.que, r.punto, r.forma); end if;
  end loop;
  if v_f <> '' then raise exception 'La forma del inventario (vehiculos_inventario) no es la de C8:%', v_f; end if;
end $$;
rollback;
vacuum public.vehiculos, public.leads_asesores;
