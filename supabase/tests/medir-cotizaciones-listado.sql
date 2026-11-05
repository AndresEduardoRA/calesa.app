-- Medición del listado `/cotizaciones` (paso 4.16-1, cierra 4-14) con 50.000 y con 250.000 cotizaciones: `pnpm db:medir:volumen`, contra el Supabase LOCAL con la siembra de
-- volumen (la dueña, Ana y su cartera de `sembrar.sql`). Todo en una transacción que se revierte: ninguna cotización queda.
--
-- Qué se mide: `cotizaciones_listado()` (invocadora: la RLS decide) como `authenticated`, con el plan genérico (`plan_cache_mode = force_generic_plan`: lo que arma plpgsql
-- tras unas llamadas), la página 1, una profunda por cursor y, donde se marca, una profunda hacia atrás, de cuatro personas:
--   - la dueña («todos» en todo): sin filtro, por origen, finales, preventas, origen y finales, y «mías»;
--   - Ana («propios»: 5.000 propias, 3.000 con la misma fecha, y 1.000 de otras personas sobre leads de su cartera, más un lead con 300 de otros de a tres con el mismo instante):
--     sin filtro (también hacia atrás), por origen, por clase, «mías» y un vehículo con 5.005 cotizaciones de las que ve 5;
--   - la «chica» («propios», 3 propias, sin cartera): sin filtro;
--   - Teo («todos» en subasta_usa, «propios» en los otros dos, 50 propias): sin filtro, finales y el origen de «propios».
-- Por caso: 7 corridas de `EXPLAIN (ANALYZE, BUFFERS)` y la mediana de las 5 últimas (las 2 primeras calientan y planifican: tras el `vacuum` y el `analyze` el planificador lee la
-- metapágina de cada btree, y eso no es de la consulta); lo leído de `cotizaciones` por relación (el heap, cada índice y el TOAST; `pg_stat_get_xact_blocks_fetched`, el promedio de
-- las 5 calientes), los recorridos enteros del heap (`pg_stat_get_xact_numscans`) y las llamadas a funciones (`pg_stat_xact_user_functions`, la última corrida).
--
-- Asserta, con los dos volúmenes:
--   - el tiempo: la dueña y la «chica» ≤ 10 ms; Ana y Teo ≤ 50 ms (Ana con un vehículo de 5.005, ≤ 100);
--   - la dueña: ≤ 116 bloques de `cotizaciones` en cada filtro (los buffers totales, como nota: ≈ 160–240 son el costo fijo de `mis_permisos()`, 4-77);
--   - que no crece con N: con 250.000, lo leído de `cotizaciones` es a lo sumo 1,2 × lo de 50.000 + 20 (con la cartera, + |cartera| · d, con d los niveles que ganó el índice de la
--     cartera: 0 o 1) y el tiempo a lo sumo `greatest(1,5 × t, t + 3 ms)`; y las llamadas, iguales;
--   - ningún recorrido entero de `cotizaciones`;
--   - los índices que lee cada caso, por nombre (uno que no existe es una falla), y ningún otro índice de `cotizaciones` con bloques;
--   - las llamadas: `mis_leads()` una vez si la ruta de la cartera está activa y ninguna si no; `origenes_con_alcance()` a lo sumo 2 + 2 por ruta activa; `en_cartera()` a lo sumo
--     una vez por fila leída de la cartera o del vehículo (su máximo por caso); ninguna a `alcance_de()` ni a `_bajas_en_curso()`.
-- La guarda (queda): «lo de hoy», la consulta que leería el listado por PostgREST (`order by creado_en desc, id desc limit n + 1` con la RLS), con los mismos datos, rompe los
-- topes de Ana y de la «chica» (4-14: recorre `cotizaciones_listado_idx` descartando lo ajeno). Si no los rompe, «la guarda no muerde».
-- Con `-v contra_hoy=1` (el rojo del 4.16-1 contra HEAD, sin la función) mide «lo de hoy» como si fuera el listado, con los mismos topes: tiene que caer.
-- Cada línea `medicion|…|número` sale por el runner (`scripts/medir-listado.mjs`); las `nota|…`, también.
-- La siembra de volumen trae 50.000 cotizaciones (4.16-3): esta medición las vacía en su transacción (`truncate … cascade`, que el `rollback` devuelve) y mide sólo las suyas.
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
\if :{?contra_hoy}
\else
\set contra_hoy 0
\endif
vacuum public.cotizaciones;
begin;
select set_config('medir.carga', :'carga', true), set_config('medir.pagina', (:max_cotizaciones)::text, true), set_config('medir.contra_hoy', :'contra_hoy', true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') or not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000a1') then
    raise exception 'faltan la dueña y Ana de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  -- La base puede traer la siembra de cotizaciones (`sembrar-cotizaciones.sql`, 4.16-3) y esta medición cuenta con las suyas solas: vacía la tabla en su
  -- transacción y el `rollback` del final la devuelve entera. Nunca en autocommit, donde el truncate borraría la siembra.
  if transaction_timestamp() = statement_timestamp() then
    raise exception 'la medición tiene que correr dentro de su begin: vaciar las cotizaciones fuera de una transacción borraría la siembra';
  end if;
  raise notice 'nota|La medición vacía las % cotizaciones de la base en su transacción (se revierte)|', (select count(*) from public.cotizaciones);
  truncate public.cotizaciones cascade;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir el listado de cotizaciones: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres: la «chica», Teo con su rol, los tres orígenes de la semilla, 100 vehículos (y uno muy cotizado) y la cartera de Ana
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('ana', '00000000-0000-0000-0000-0000000000a1'), ('berta', '00000000-0000-0000-0000-0000000000b1'),
  ('carlos', '00000000-0000-0000-0000-0000000000b2'), ('diana', '00000000-0000-0000-0000-0000000000b3'), ('elias', '00000000-0000-0000-0000-0000000000b4'),
  ('chica', '00000000-0000-0000-0000-0000000000c9'), ('teo', '00000000-0000-0000-0000-0000000000e1');
insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000000c9', 'medir-listado-chica@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000000e1', 'medir-listado-teo@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Chica listado', invitacion_aceptada_en = now() where id = '00000000-0000-0000-0000-0000000000c9';
update public.perfiles set nombre = 'Teo listado', invitacion_aceptada_en = now() where id = '00000000-0000-0000-0000-0000000000e1';
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select '00000000-0000-0000-0000-0000000000c9', id, true from public.roles where clave = 'asesor' on conflict do nothing;
create temp table _o (i int primary key, clave text not null, origen uuid not null, formula uuid not null);
insert into _o select row_number() over (order by o.clave), o.clave, o.id, f.id from public.origenes o join public.formulas f on f.origen_id = o.id and f.estado = 'publicada'
  where o.clave in ('subasta_usa', 'planilla_usa', 'oficina');
with r as (insert into public.roles (clave, nombre) values ('medir_teo', 'Medir Teo') returning id)
insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
select r.id, 'cotizaciones.ver', o.origen, (case when o.clave = 'subasta_usa' then 'todos' else 'propios' end)::public.alcance_permiso from r cross join _o o;
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select '00000000-0000-0000-0000-0000000000e1', id, true from public.roles where clave = 'medir_teo';
create temp table _snap as select (select jsonb_object_agg(n ->> 'id', round((n_ord * 13.37)::numeric, 2)) from jsonb_array_elements(f.definicion -> 'nodos') with ordinality x (n, n_ord)) as valores,
                                  (select jsonb_object_agg(n ->> 'id', 'input') from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'tipo' in ('input', 'constante', 'tipo_cambio')) as fuentes
  from public.formulas f join public.origenes o on o.id = f.origen_id where o.clave = 'subasta_usa' and f.estado = 'publicada';
create temp table _leads_de_ana (i int primary key, lead uuid not null);
insert into _leads_de_ana select row_number() over (order by la.lead_id), la.lead_id from public.leads_asesores la
 where la.usuario_id = '00000000-0000-0000-0000-0000000000a1' and la.revocado_en is null order by la.lead_id limit 1001;
-- Los vehículos van sin fila en `vehiculos` (la FK no se mira al sembrar): el listado sólo filtra por `vehiculo_id`.
create temp table _v (i int primary key, id uuid not null);
insert into _v select i, gen_random_uuid() from generate_series(0, 100) i;   -- el 0 es el muy cotizado
do $$ begin
  if (select count(*) from _o) <> 3 then raise exception 'esperaba los tres orígenes de la semilla con su fórmula publicada y hay %', (select count(*) from _o); end if;
  if (select count(*) from _leads_de_ana) < 1001 then raise exception 'Ana debía tener al menos 1.001 leads en su cartera y tiene %', (select count(*) from _leads_de_ana); end if;
end $$;
grant select on _p, _o, _v, _leads_de_ana to authenticated;

-- Las filas g ∈ [desde, hasta], más nuevas cuanto mayor es g. En las primeras 50.000: Ana (g % 10 = 1: 5.000, 3.000 con la misma fecha, 100 finales), la «chica» (3: g que no
-- cumplen g % 10 = 1 ni g % 50 = 2), Teo (g % 1000 = 4: 50), 1.000 de Berta sobre leads de la cartera de Ana (g % 50 = 2) y 100 vehículos (g % 10 = 5) más uno con 5.000
-- (g % 10 = 9) y 5 de Ana; el resto, de la dueña y de cuatro asesores. Un 2 % de finales, parejas (g % 50 = 7), y un 2 % en la papelera, parejo (g % 50 = 13: ninguna de Ana, de la
-- «chica», de Teo ni final), que los índices enteros (por origen y por lead) leen y descartan. Sin triggers (cada fila auditaría y numeraría).
create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, vehiculo_id, clase, valores, fuentes, tipos_cambio, totales, total_base, titulo, creado_en, actualizado_en,
                                   eliminado_en)
  select o.origen,
         case when g <= 50000 and g % 10 = 1 then (select id from _p where clave = 'ana')
              when g in (10003, 20003, 30003) then (select id from _p where clave = 'chica')
              when g <= 50000 and g % 1000 = 4 then (select id from _p where clave = 'teo')
              when g <= 50000 and g % 50 = 2 then (select id from _p where clave = 'berta')
              else (select id from _p where clave = (array['duena', 'berta', 'carlos', 'diana', 'elias'])[1 + g % 5]) end,
         o.formula,
         case when g <= 50000 and g % 50 = 2 then (select lead from _leads_de_ana where i = 1 + (g / 50) % 1000) end,
         case when g in (11, 10011, 20011, 30011, 40011) or (g <= 50000 and g % 10 = 9) then (select id from _v where i = 0)
              when g <= 50000 and g % 10 = 5 then (select id from _v where i = 1 + (g / 10) % 100) end,
         (case when g % 50 = 7 or (g <= 50000 and g % 500 = 1) then 'final' else 'preventa' end)::public.clase_cotizacion,
         s.valores, s.fuentes, '{"oficial": 6.96, "paralelo": 12.4}', '{"usd": 1234.5}', 1234.5,
         case when g <= 50000 and g % 10 = 1 then 'Cotización ' || g end,
         case when g between 2000 and 32000 and g % 10 = 1 then timestamptz '2026-01-01 00:00:00+00' else timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds' end,
         timestamptz '2026-01-01 00:00:00+00',
         case when g % 50 = 13 then timestamptz '2026-02-01 00:00:00+00' end
    from generate_series(p_desde, p_hasta) g
    join _o o on o.i = 1 + g % 3
   cross join _snap s;
  set local session_replication_role = origin;
end $$;

-- El lead 1.001 de la cartera de Ana, con 300 cotizaciones de Berta, de a tres con el mismo instante: un lateral por lead lee `n + 1` y no todo el lead (sin `id` en el
-- índice, ordenaría las 300). 30 de ellas (una de cada diez) en la papelera: la ruta de la cartera también descarta papelera.
create function pg_temp.lead_grande() returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, valores, fuentes, tipos_cambio, totales, total_base, creado_en, actualizado_en, eliminado_en)
  select o.origen, (select id from _p where clave = 'berta'), o.formula, (select lead from _leads_de_ana where i = 1001), s.valores, s.fuentes, '{}', '{}', 10,
         timestamptz '2026-01-02 00:00:00+00' + ((k - 1) / 3) * interval '17 minutes', timestamptz '2026-01-01 00:00:00+00',
         case when k % 10 = 0 then timestamptz '2026-02-01 00:00:00+00' end
    from generate_series(1, 300) k join _o o on o.i = 1 + k % 3 cross join _snap s;
  set local session_replication_role = origin;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Los casos y la medición. Corren como quien mira (authenticated), con el plan genérico.
-- ---------------------------------------------------------------------------------------------------------------------------------
-- Un caso: quién, sus filtros, hasta qué fila llega su profunda, si mide también hacia atrás, su tope, los índices de `cotizaciones` que tiene que leer, cuántas rutas se
-- encienden y si una es la de la cartera (con `mis_leads()`).
create temp table _casos (caso text primary key, quien text not null, origen text, clase public.clase_cotizacion, mias boolean not null default false, vehiculo boolean not null default false,
                          profundidad int not null, atras boolean not null default false, tope_ms numeric not null, indices text[] not null, rutas int not null, cartera boolean not null,
                          max_en_cartera int not null);
insert into _casos values
  ('dueña · todas', 'duena', null, null, false, false, 2000, false, 10, '{cotizaciones_listado_idx}', 1, false, 0),
  ('dueña · un origen', 'duena', 'planilla_usa', null, false, false, 2000, false, 10, '{cotizaciones_origen_creado_idx}', 1, false, 0),
  ('dueña · finales', 'duena', null, 'final', false, false, 200, false, 10, '{cotizaciones_finales_idx}', 1, false, 0),
  ('dueña · preventas', 'duena', null, 'preventa', false, false, 2000, false, 10, '{cotizaciones_listado_idx}', 1, false, 0),
  ('dueña · finales de un origen', 'duena', 'planilla_usa', 'final', false, false, 200, false, 10, '{cotizaciones_origen_finales_idx}', 1, false, 0),
  ('dueña · mías', 'duena', null, null, true, false, 2000, false, 10, '{cotizaciones_creador_idx}', 1, false, 0),
  ('Ana · todas', 'ana', null, null, false, false, 2500, true, 50, '{cotizaciones_creador_idx,cotizaciones_lead_creado_idx}', 2, true, 1270),
  ('Ana · un origen', 'ana', 'planilla_usa', null, false, false, 1000, false, 50, '{cotizaciones_creador_idx,cotizaciones_lead_creado_idx}', 2, true, 1270),
  ('Ana · finales', 'ana', null, 'final', false, false, 50, false, 50, '{cotizaciones_creador_idx,cotizaciones_lead_creado_idx}', 2, true, 1270),
  ('Ana · mías', 'ana', null, null, true, false, 2500, false, 50, '{cotizaciones_creador_idx}', 1, false, 0),
  -- 100 ms: ≈ 2× los 45 ms medidos (un en_cartera() por cada una de las 5.000 ajenas del vehículo), para que no caiga por la carga; lo que vigila son los bloques y las llamadas.
  ('Ana · un vehículo', 'ana', null, null, false, true, 2, false, 100, '{cotizaciones_vehiculo_creado_idx}', 1, false, 5005),
  ('chica · todas', 'chica', null, null, false, false, 1, false, 10, '{cotizaciones_creador_idx}', 2, true, 0),
  ('Teo · todas', 'teo', null, null, false, false, 2000, false, 50, '{cotizaciones_origen_creado_idx,cotizaciones_creador_idx}', 3, true, 0),
  ('Teo · finales', 'teo', null, 'final', false, false, 200, false, 50, '{cotizaciones_origen_finales_idx,cotizaciones_creador_idx}', 3, true, 0),
  ('Teo · un origen de «propios»', 'teo', 'oficina', null, false, false, 5, false, 50, '{cotizaciones_creador_idx}', 2, true, 0);
-- Contra HEAD (sin la función) sólo se miden las dos páginas de 4-14 con «lo de hoy».
delete from _casos where current_setting('medir.contra_hoy') = '1' and caso not in ('Ana · todas', 'chica · todas');
grant select on _casos to authenticated;
-- Las relaciones de `cotizaciones`: el heap, su TOAST (y el índice del TOAST) y cada índice.
create temp table _rel as
select c.oid, case when c.oid = 'public.cotizaciones'::regclass then 'heap' else c.relname::text end as nombre from pg_class c
 where c.oid = 'public.cotizaciones'::regclass or c.oid in (select indexrelid from pg_index where indrelid = 'public.cotizaciones'::regclass)
union all select t.reltoastrelid, 'toast' from pg_class t where t.oid = 'public.cotizaciones'::regclass
union all select i.indexrelid, 'toast_idx' from pg_index i where i.indrelid = (select reltoastrelid from pg_class where oid = 'public.cotizaciones'::regclass);
grant select on _rel to authenticated;
create temp table _med (fase text, caso text, pagina text, ms numeric, buffers bigint, bloques jsonb, total numeric, seq bigint, llamadas jsonb);
grant all on _med to authenticated;
-- d (C7): los bloques de `cotizaciones_lead_creado_idx` en la sonda de un lead (limit 1, plan genérico), y |cartera| de Ana, por fase.
create temp table _d (fase text primary key, bloques bigint, cartera int);
grant all on _d to authenticated;

-- El SQL de una página del caso: la función, o «lo de hoy» (la consulta por PostgREST, sólo sin filtros) contra HEAD y en la guarda.
create function pg_temp.sql_de(p_caso text, p_n int, p_en timestamptz, p_id uuid, p_atras boolean, p_hoy boolean) returns text language plpgsql as $$
declare c record;
begin
  select * into c from _casos x where x.caso = p_caso;
  if p_hoy then
    return 'select id, numero, origen_id, lead_id, vehiculo_id, creado_por, clase, estado, titulo, total_base, moneda_mostrar, creado_en from public.cotizaciones'
        || case when p_en is null then '' else format(' where (creado_en, id) < (%L::timestamptz, %L::uuid)', p_en, p_id) end
        || ' order by creado_en desc, id desc limit ' || (p_n + 1);
  end if;
  return format('select * from public.cotizaciones_listado(%s, %L::uuid, %L::public.clase_cotizacion, %L, %L::uuid, %L::timestamptz, %L::uuid, %L)', p_n,
                (select o.origen from _o o where o.clave = c.origen), c.clase, c.mias, case when c.vehiculo then (select id from _v where i = 0) end, p_en, p_id, p_atras);
end $$;

create function pg_temp.como(p_quien text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', (select id from _p where clave = p_quien)::text, true),
         set_config('request.jwt.claims', json_build_object('sub', (select id from _p where clave = p_quien), 'role', 'authenticated')::text, true);
$$;

-- El cursor de la fila `p_profundidad` del caso (o de la última, si hay menos), caminando el listado de a lo sumo `n` filas por página.
create function pg_temp.cursor_de(p_caso text, p_profundidad int, p_hoy boolean, out en timestamptz, out id uuid) language plpgsql as $$
declare v_falta int := p_profundidad; v_tam int; v_en timestamptz[]; v_id uuid[]; v_n int := current_setting('medir.pagina')::int;
begin
  while v_falta > 0 loop
    v_tam := least(v_n, v_falta);
    execute format('select array_agg(x.creado_en order by x.creado_en desc, x.id desc), array_agg(x.id order by x.creado_en desc, x.id desc) from (%s) x',
                   pg_temp.sql_de(p_caso, v_tam, en, id, false, p_hoy)) into v_en, v_id;
    exit when coalesce(cardinality(v_id), 0) = 0;
    en := v_en[least(v_tam, cardinality(v_en))]; id := v_id[least(v_tam, cardinality(v_id))];
    exit when cardinality(v_id) <= v_tam;
    v_falta := v_falta - v_tam;
  end loop;
end $$;

-- Una consulta, `p_corridas` veces (las 2 primeras calientan): la mediana de ms y de buffers de las calientes, el promedio de lo leído por relación de `cotizaciones`,
-- los recorridos enteros del heap y las llamadas a funciones de la última.
create function pg_temp.medir(p_sql text, p_corridas int default 7) returns jsonb language plpgsql as $$
declare
  v_plan jsonb; v_ms numeric[] := '{}'; v_buf bigint[] := '{}'; i int; b0 jsonb; b1 jsonb; l0 jsonb; l1 jsonb; s0 bigint; v_seq bigint := 0; v_suma jsonb := '{}'; v_llam jsonb; k text;
  v_heap constant oid := 'public.cotizaciones'::regclass; v_calientes int := 0;
begin
  for i in 1 .. p_corridas loop
    select jsonb_object_agg(r.nombre, pg_stat_get_xact_blocks_fetched(r.oid)) into b0 from _rel r;
    select coalesce(jsonb_object_agg(funcname, calls), '{}') into l0 from pg_stat_xact_user_functions where schemaname = 'public';
    s0 := pg_stat_get_xact_numscans(v_heap);
    execute 'explain (analyze, buffers, format json) ' || p_sql into v_plan;
    select jsonb_object_agg(r.nombre, pg_stat_get_xact_blocks_fetched(r.oid)) into b1 from _rel r;
    select coalesce(jsonb_object_agg(funcname, calls), '{}') into l1 from pg_stat_xact_user_functions where schemaname = 'public';
    v_seq := v_seq + pg_stat_get_xact_numscans(v_heap) - s0;
    continue when i <= least(2, p_corridas - 1);
    v_calientes := v_calientes + 1;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    v_buf := v_buf || (coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Hit Blocks')::bigint, 0) + coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Read Blocks')::bigint, 0));
    for k in select jsonb_object_keys(b1) loop
      v_suma := v_suma || jsonb_build_object(k, coalesce((v_suma ->> k)::numeric, 0) + (b1 ->> k)::numeric - (b0 ->> k)::numeric);
    end loop;
    select coalesce(jsonb_object_agg(x, coalesce((l1 ->> x)::bigint, 0) - coalesce((l0 ->> x)::bigint, 0)), '{}') into v_llam
      from jsonb_object_keys(l1) x where coalesce((l1 ->> x)::bigint, 0) - coalesce((l0 ->> x)::bigint, 0) > 0 and x not like 'medir%';
  end loop;
  return jsonb_build_object('ms', (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m),
                            'buffers', (select percentile_disc(0.5) within group (order by b) from unnest(v_buf) b),
                            'bloques', (select jsonb_object_agg(key, round(value::numeric / v_calientes, 1)) from jsonb_each_text(v_suma)),
                            'seq', v_seq, 'llamadas', v_llam);
end $$;

create function pg_temp.anotar(p_fase text, p_caso text, p_pagina text, m jsonb) returns void language sql as $$
  insert into _med select p_fase, p_caso, p_pagina, (m ->> 'ms')::numeric, (m ->> 'buffers')::bigint, m -> 'bloques',
                          (select sum(value::numeric) from jsonb_each_text(m -> 'bloques')), (m ->> 'seq')::bigint, m -> 'llamadas';
$$;

create function pg_temp.sonda_lead(p_fase text) returns void language plpgsql as $$
declare v_lead uuid := (select lead from _leads_de_ana where i = 1001); v_b0 bigint; v_id uuid; v_ix constant oid := to_regclass('public.cotizaciones_lead_creado_idx');
begin
  -- Sin el índice (una mutación lo quita), d queda nulo y la medición cae con su motivo, en vez de abortar acá.
  select c.id into v_id from public.cotizaciones c where c.lead_id = v_lead order by c.creado_en desc, c.id desc limit 1;
  v_b0 := pg_stat_get_xact_blocks_fetched(v_ix);
  select c.id into v_id from public.cotizaciones c where c.lead_id = v_lead order by c.creado_en desc, c.id desc limit 1;
  insert into _d values (p_fase, case when v_ix is not null then pg_stat_get_xact_blocks_fetched(v_ix) - v_b0 end, (select count(*) from public.mis_leads()));
end $$;

-- Los casos de una fase: la página 1, la profunda y, si se marca, la profunda hacia atrás.
create function pg_temp.fase(p_fase text) returns void language plpgsql as $$
declare c record; v_cur record; v_n int := current_setting('medir.pagina')::int; v_hoy boolean := current_setting('medir.contra_hoy') = '1';
begin
  for c in select * from _casos order by caso loop
    perform pg_temp.como(c.quien);
    perform pg_temp.anotar(p_fase, c.caso, 'página 1', pg_temp.medir(pg_temp.sql_de(c.caso, v_n, null, null, false, v_hoy)));
    select * into v_cur from pg_temp.cursor_de(c.caso, c.profundidad, v_hoy);
    perform pg_temp.anotar(p_fase, c.caso, 'profunda', pg_temp.medir(pg_temp.sql_de(c.caso, v_n, v_cur.en, v_cur.id, false, v_hoy)));
    if c.atras and not v_hoy then
      perform pg_temp.anotar(p_fase, c.caso, 'hacia atrás', pg_temp.medir(pg_temp.sql_de(c.caso, v_n, v_cur.en, v_cur.id, true, false)));
    end if;
  end loop;
  -- d y |cartera|, como Ana.
  if not v_hoy then
    perform pg_temp.como('ana');
    perform pg_temp.sonda_lead(p_fase);
  end if;
  -- La guarda: «lo de hoy», página 1 de Ana y de la «chica» (3 corridas: tarda segundos).
  if not v_hoy then
    for c in select * from _casos where caso in ('Ana · todas', 'chica · todas') loop
      perform pg_temp.como(c.quien);
      perform pg_temp.anotar(p_fase, c.caso, 'guarda: lo de hoy', pg_temp.medir(pg_temp.sql_de(c.caso, v_n, null, null, false, true), 3));
    end loop;
  end if;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 1: 50.000 cotizaciones (y las 300 del lead grande)
-- ---------------------------------------------------------------------------------------------------------------------------------
select pg_temp.rellenar(1, 50000);
select pg_temp.lead_grande();
analyze public.cotizaciones;
do $$ begin
  if (select count(*) from public.cotizaciones) <> 50300 then raise exception 'esperaba 50.300 cotizaciones y hay %', (select count(*) from public.cotizaciones); end if;
  if (select count(*) from public.cotizaciones where creado_por = '00000000-0000-0000-0000-0000000000a1') <> 5000 then raise exception 'Ana debía tener 5.000 propias'; end if;
  if (select count(*) from public.cotizaciones where creado_por = '00000000-0000-0000-0000-0000000000c9') <> 3 then raise exception 'la «chica» debía tener 3'; end if;
  if (select count(*) from public.cotizaciones where creado_por = '00000000-0000-0000-0000-0000000000e1') <> 50 then raise exception 'Teo debía tener 50'; end if;
  if (select count(*) from public.cotizaciones where vehiculo_id = (select id from _v where i = 0)) <> 5005 then raise exception 'el vehículo muy cotizado debía tener 5.005'; end if;
  if (select count(*) from public.cotizaciones where eliminado_en is not null) <> 1000 + 30 then raise exception 'esperaba 1.030 en la papelera'; end if;
  if exists (select 1 from public.cotizaciones where eliminado_en is not null and (clase = 'final' or creado_por in (select id from _p where clave in ('ana', 'chica', 'teo')))) then
    raise exception 'la papelera sembrada toca a Ana, a la «chica», a Teo o una final';
  end if;
end $$;
set local track_functions = 'all';
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.fase('50.000');
reset role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 2: 250.000 cotizaciones (200.000 más nuevas, de la dueña y de cuatro asesores)
-- ---------------------------------------------------------------------------------------------------------------------------------
select pg_temp.rellenar(50001, 250000);
analyze public.cotizaciones;
set local role authenticated;
select pg_temp.fase('250.000');
reset role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Lo que se asserta
-- ---------------------------------------------------------------------------------------------------------------------------------
do $$
declare
  r record; v_g record; v_fallas text := ''; v_ix text; v_mis int; v_d bigint; v_cartera int; v_holgura numeric; v_leidos text[]; v_indices text[]; v_hoy boolean := current_setting('medir.contra_hoy') = '1';
begin
  for r in select m.*, c.quien, c.tope_ms, c.indices, c.rutas, c.cartera, c.max_en_cartera from _med m join _casos c using (caso) where m.pagina not like 'guarda%' order by m.fase, m.caso, m.pagina loop
    raise notice 'medicion|% · % · % (ms)|%', r.fase, r.caso, r.pagina, round(r.ms, 2);
    raise notice 'medicion|% · % · % (bloques de cotizaciones)|%', r.fase, r.caso, r.pagina, round(r.total, 1);
    raise notice 'medicion|% · % · % (buffers)|%', r.fase, r.caso, r.pagina, r.buffers;
    if r.ms > r.tope_ms then v_fallas := v_fallas || format(E'\n  %s · %s · %s: %s ms, el tope es %s', r.fase, r.caso, r.pagina, round(r.ms, 1), r.tope_ms); end if;
    -- La dueña: ≤ 116 bloques de cotizaciones (101 filas, un bloque del heap por fila, ≤ 2 % de finales y ≤ 2 % de papelera descartadas: ⌈101 / 0,98²⌉ = 106, más 10 de índice).
    -- Los buffers totales van como nota: ≈ 160–240 son el costo fijo de mis_permisos() (4-77).
    if r.quien = 'duena' and r.total > 116 then v_fallas := v_fallas || format(E'\n  %s · %s · %s: %s bloques de cotizaciones, el tope de la dueña es 116', r.fase, r.caso, r.pagina, r.total); end if;
    if r.seq > 0 then v_fallas := v_fallas || format(E'\n  %s · %s · %s recorre cotizaciones entera', r.fase, r.caso, r.pagina); end if;
    -- Los índices: los del caso existen y leen; ningún otro lee.
    foreach v_ix in array r.indices loop
      if to_regclass('public.' || v_ix) is null then v_fallas := v_fallas || format(E'\n  %s · %s · %s: no existe el índice %s', r.fase, r.caso, r.pagina, v_ix); end if;
    end loop;
    v_leidos := array(select key from jsonb_each_text(r.bloques) where value::numeric > 0 and key not in ('heap', 'toast', 'toast_idx') order by key);
    v_indices := array(select x from unnest(r.indices) x order by x);
    if v_leidos is distinct from v_indices then
      v_fallas := v_fallas || format(E'\n  %s · %s · %s lee los índices %s y debía leer %s', r.fase, r.caso, r.pagina, v_leidos, v_indices);
    end if;
    if not v_hoy then
      -- (un `if` termina en el primer `then`, también el de un `case`: va a una variable)
      v_mis := case when r.cartera then 1 else 0 end;
      if coalesce((r.llamadas ->> 'mis_leads')::int, 0) <> v_mis then
        v_fallas := v_fallas || format(E'\n  %s · %s · %s llama a mis_leads %s veces: %s', r.fase, r.caso, r.pagina, coalesce(r.llamadas ->> 'mis_leads', '0'), r.llamadas);
      end if;
      if coalesce((r.llamadas ->> 'origenes_con_alcance')::int, 0) > 2 + 2 * r.rutas then
        v_fallas := v_fallas || format(E'\n  %s · %s · %s calcula los orígenes de más (%s rutas): %s', r.fase, r.caso, r.pagina, r.rutas, r.llamadas);
      end if;
      if coalesce((r.llamadas ->> 'en_cartera')::int, 0) > r.max_en_cartera then
        v_fallas := v_fallas || format(E'\n  %s · %s · %s llama a en_cartera %s veces (a lo sumo %s): %s', r.fase, r.caso, r.pagina, r.llamadas ->> 'en_cartera', r.max_en_cartera, r.llamadas);
      end if;
      if r.llamadas ? 'alcance_de' or r.llamadas ? '_bajas_en_curso' then
        v_fallas := v_fallas || format(E'\n  %s · %s · %s lee la cartera como quien mira (alcance_de o _bajas_en_curso): %s', r.fase, r.caso, r.pagina, r.llamadas);
      end if;
    end if;
  end loop;
  -- d: los niveles que ganó el índice de la cartera entre los dos volúmenes (la sonda de un lead). Con d = 0 no hay holgura; d > 1 cae.
  if not v_hoy then
    select (select bloques from _d where fase = '250.000') - (select bloques from _d where fase = '50.000'), (select cartera from _d where fase = '50.000') into v_d, v_cartera;
    raise notice 'medicion|d: niveles que ganó cotizaciones_lead_creado_idx de 50.000 a 250.000 (bloques)|%', v_d;
    raise notice 'medicion|La cartera de Ana (filas de mis_leads())|%', v_cartera;
    if v_d is null or v_d > 1 or v_d < 0 then v_fallas := v_fallas || format(E'\n  d = %s: el índice de la cartera ganó más de un nivel (o no se midió)', v_d); end if;
  end if;
  -- No crece con N, y las llamadas son las mismas.
  for v_g in select a.caso, a.pagina, a.ms as ms_chico, a.total as bl_chico, b.ms as ms_grande, b.total as bl_grande, a.llamadas as l_chico, b.llamadas as l_grande, c.cartera
               from _med a join _med b on b.caso = a.caso and b.pagina = a.pagina and a.fase = '50.000' and b.fase = '250.000' join _casos c on c.caso = a.caso
              where a.pagina not like 'guarda%' loop
    raise notice 'medicion|% · % · razón de bloques con 250.000 sobre 50.000 (veces)|%', v_g.caso, v_g.pagina, round(v_g.bl_grande / nullif(v_g.bl_chico, 0), 2);
    if v_g.ms_grande > greatest(1.5 * v_g.ms_chico, v_g.ms_chico + 3) then
      v_fallas := v_fallas || format(E'\n  %s · %s crece con N: %s ms con 50.000 y %s con 250.000', v_g.caso, v_g.pagina, round(v_g.ms_chico, 1), round(v_g.ms_grande, 1));
    end if;
    v_holgura := case when v_g.cartera then coalesce(v_cartera * greatest(v_d, 0), 0) else 0 end;   -- (un `if` termina en el primer `then`: va aparte)
    if v_g.bl_grande > 1.2 * v_g.bl_chico + 20 + v_holgura then
      v_fallas := v_fallas || format(E'\n  %s · %s crece con N: %s bloques de cotizaciones con 50.000 y %s con 250.000', v_g.caso, v_g.pagina, v_g.bl_chico, v_g.bl_grande);
    end if;
    if not v_hoy and v_g.l_chico is distinct from v_g.l_grande then
      v_fallas := v_fallas || format(E'\n  %s · %s llama distinto con 50.000 (%s) que con 250.000 (%s)', v_g.caso, v_g.pagina, v_g.l_chico, v_g.l_grande);
    end if;
  end loop;
  if v_fallas <> '' then raise exception 'El listado de cotizaciones rompe su presupuesto:%', v_fallas; end if;
end $$;

-- La guarda: «lo de hoy» rompe los topes de Ana y de la «chica» (tiempo, o lectura que crece con N).
do $$
declare v_g record; v_mala text := '';
begin
  for v_g in select a.caso, c.tope_ms, a.ms as ms_chico, b.ms as ms_grande, a.total as bl_chico, b.total as bl_grande
               from _med a join _med b on b.caso = a.caso and b.pagina = a.pagina and a.fase = '50.000' and b.fase = '250.000' join _casos c on c.caso = a.caso
              where a.pagina = 'guarda: lo de hoy' loop
    raise notice 'medicion|Guarda, lo de hoy, %, página 1, 250.000 (ms; tiene que pasar de % o crecer con N)|%', v_g.caso, v_g.tope_ms, round(v_g.ms_grande, 2);
    raise notice 'medicion|Guarda, lo de hoy, %, página 1, 250.000 (bloques de cotizaciones)|%', v_g.caso, round(v_g.bl_grande, 1);
    if v_g.ms_grande <= v_g.tope_ms and v_g.bl_grande <= 1.2 * v_g.bl_chico + 20 then v_mala := v_mala || v_g.caso || ' '; end if;
  end loop;
  if current_setting('medir.contra_hoy') <> '1' and (v_mala <> '' or (select count(*) from _med where pagina = 'guarda: lo de hoy') <> 4) then
    raise exception 'la guarda no muerde: lo de hoy cumple el tope para %', v_mala;
  end if;
end $$;
rollback;
vacuum public.cotizaciones;
