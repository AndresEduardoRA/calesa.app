-- Medición de «exportar todo» de cotizaciones (paso 9.05-2c): `MEDIR_SOLO=medir-datos-exportar-cotizaciones pnpm db:medir:volumen`, contra el Supabase LOCAL con
-- la siembra de volumen (`pnpm db:sembrar-volumen`: la dueña y sus 50.000 cotizaciones). Todo en una transacción que se revierte: ninguna cotización, persona ni rol queda.
--
-- Qué se mide: la consulta del route handler (`datos/infra/cotizaciones.ts`) a la tabla `cotizaciones`, como `authenticated` y con el plan genérico, sobre ≈ 250.000
-- cotizaciones vivas (las 50.000 de la siembra y 200.000 de la dueña sembradas acá, más 5.000 de Pía, «propios», lo más nuevo):
--   C-R1 · la primera página de 1.000 (las 11 columnas del archivo), sin origen, `eliminado_en is null and creado_en <= corte`, `order by creado_en desc, id desc`;
--   C-R2 · una página profunda (el cursor en la fila 150.000), sin origen;
--   C-R3 · la primera página con `origen_id = O`;
--   C-R4 · el conteo entero: páginas de `id, creado_en` hasta 250.001 (o hasta que se acaban);
--   C-R5 · la lectura entera: páginas de 1.000 por cursor hasta el final;
--   C-R6 · los nombres de los clientes de una página: `leads_vista_por_ids` con sus 1.000 `lead_id` distintos (`select id, nombre … limit n`);
--   C-R7 · los títulos de los vehículos de una página: `vehiculos` con 100 de sus `vehiculo_id` (`IDS_POR_CONSULTA_DE_NOMBRES`), sin papelera.
-- La dueña («todos») con assert; Pía («propios»: `en_cartera(lead_id)` en cada fila ajena), C-R1, C-R4 y C-R5 sin assert: se informa, con la página más cara de C-R4
-- y de C-R5 (si una pasa 8 s, el `statement_timeout` de `authenticated` en PostgREST la cortaría: se anota como límite conocido). C-R4 y C-R5 no cuentan el viaje HTTP.
--
-- Asserta (la dueña): C-R1 y C-R2 caminan `cotizaciones_listado_idx`, C-R3 `cotizaciones_origen_creado_idx`, sin `Seq Scan` de `cotizaciones` y sin `Sort` de más de
-- 1.000 filas, ≤ 150 ms; C-R4 ≤ 15 s; C-R5 ≤ 60 s; C-R6 ≤ 300 ms y C-R7 por `vehiculos_pkey` ≤ 30 ms (provisionales). Si C-R4 + C-R5 + páginas × (C-R6 + 10 × C-R7)
-- pasan 150 s (la mitad de la vida mínima del token, 5 min), `TOPE_POR_ENTIDAD.cotizaciones` tiene que bajar: lo dice la nota final.
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.cotizaciones;
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null
-- De a cuántas filas lee el flujo, su tope y de a cuántos ids pide los títulos: `FILAS_POR_PEDIDO`, `TOPE_DE_FILAS` e `IDS_POR_CONSULTA_DE_NOMBRES` de
-- `src/modules/datos/entities/exportacion.ts` (los pasa medir-listado.mjs).
select set_config('medir.pagina', :'filas_exportar', true) \g /dev/null
select set_config('medir.tope', :'tope_exportar_todo', true) \g /dev/null
select set_config('medir.ids', :'ids_nombres_exportar', true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') then
    raise exception 'falta la dueña de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  if (select count(*) from public.cotizaciones where eliminado_en is null) not between 40000 and 60000 then
    raise exception 'esperaba entre 40.000 y 60.000 cotizaciones vivas y hay %: corre pnpm db:sembrar-volumen después de un pnpm db:reset',
      (select count(*) from public.cotizaciones where eliminado_en is null);
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir exportar todo de cotizaciones: %|', current_setting('medir.carga');
end $$;

-- El terreno, como postgres. Pía con los triggers encendidos (el de `auth.users` crea el perfil) y un rol propio de «propios».
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('pia', '00000000-0000-0000-0000-0000000000f1');
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'medir-dexc-pia@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Medir exportar Pía', invitacion_aceptada_en = now() where id = '00000000-0000-0000-0000-0000000000f1';
with r as (insert into public.roles (clave, nombre) values ('medir_dexc_propios', 'Medir exportar cotizaciones propios') returning id),
     c as (insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) select id, 'cotizaciones.ver', null, 'propios' from r returning rol_id)
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select '00000000-0000-0000-0000-0000000000f1', (select id from r), true;
-- Los orígenes activos con su fórmula publicada (como la siembra) y su `valores`/`fuentes`; 1.000 leads de la dueña y 1.000 vehículos vivos de la siembra.
create temp table _o (i int primary key, id uuid not null, formula uuid not null, valores jsonb not null, fuentes jsonb not null);
insert into _o
select row_number() over (order by o.orden, o.id), o.id, f.id,
       (select jsonb_object_agg(n ->> 'id', round((n_ord * 13.37)::numeric, 2)) from jsonb_array_elements(f.definicion -> 'nodos') with ordinality x (n, n_ord)),
       coalesce((select jsonb_object_agg(n ->> 'id', 'input') from jsonb_array_elements(f.definicion -> 'nodos') n
                  where n ->> 'tipo' in ('input', 'constante', 'tipo_cambio')), '{}')
  from public.origenes o join public.formulas f on f.origen_id = o.id and f.estado = 'publicada' where o.activo;
create temp table _l (i int primary key, id uuid not null);
insert into _l select row_number() over (order by id), id from public.leads
 where creado_por = '00000000-0000-0000-0000-0000000000d1' and nombre like 'Volumen %' and eliminado_en is null order by id limit 1000;
create temp table _v (i int primary key, id uuid not null);
insert into _v select row_number() over (order by id), id from public.vehiculos where titulo like 'Volumen %' and eliminado_en is null order by id limit 1000;
do $$ begin
  if (select count(*) from _o) < 1 then raise exception 'esperaba al menos un origen activo con fórmula publicada'; end if;
  if (select count(*) from _l) <> 1000 or (select count(*) from _v) <> 1000 then
    raise exception 'esperaba 1.000 leads de la dueña y 1.000 vehículos vivos de la siembra (hay % y %)', (select count(*) from _l), (select count(*) from _v);
  end if;
end $$;

-- Sin triggers (cada fila auditaría y validaría); `numero` es una identidad y se llena igual. Las de Pía, sin lead y con `creado_en` futuro: lo más nuevo.
set local session_replication_role = replica;
insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, creado_en,
                                 actualizado_en)
select o.id, '00000000-0000-0000-0000-0000000000d1', o.formula, (select id from _l where i = 1 + g % 1000), (select id from _v where i = 1 + g % 1000), o.valores,
       o.fuentes, '{}', '{}', 1000 + g * 0.01, 'Medir dexc ' || g, now() - g * interval '1 second', now()
  from generate_series(1, 200000) g
  join _o o on o.i = 1 + g % (select count(*) from _o);
insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, creado_en, actualizado_en)
select o.id, '00000000-0000-0000-0000-0000000000f1', o.formula, o.valores, o.fuentes, '{}', '{}', 10, 'Medir dexc Pía ' || g, now() + g * interval '1 second', now()
  from generate_series(1, 5000) g
  join _o o on o.i = 1 + g % (select count(*) from _o);
set local session_replication_role = origin;

-- El corte: después de lo de Pía. El cursor profundo: la fila 150.000 (la dueña las ve todas). Los ids de los nombres: los de una página de la dueña (1.000 leads
-- distintos; los primeros `IDS_POR_CONSULTA_DE_NOMBRES` vehículos distintos).
create temp table _cur (ts timestamptz not null, id uuid not null);
insert into _cur select creado_en, id from public.cotizaciones where eliminado_en is null order by creado_en desc, id desc offset 149999 limit 1;
create temp table _ids (lead uuid[] not null, vehiculo uuid[] not null);
insert into _ids
select (select array_agg(distinct lead_id) from (select lead_id from public.cotizaciones where titulo like 'Medir dexc %' and creado_por = '00000000-0000-0000-0000-0000000000d1'
                                                 order by creado_en desc limit current_setting('medir.pagina')::int) x),
       (select array_agg(id) from (select id from _v order by i limit current_setting('medir.ids')::int) y);
grant select on _p, _o, _cur, _ids to authenticated;
select set_config('medir.corte', (now() + interval '1 day')::text, true) \g /dev/null

create function pg_temp.medir(p_ejecutar text, p_tabla text, p_corridas int default 7) returns jsonb language plpgsql as $$
declare v_plan jsonb; v_ms numeric[] := '{}'; v_buf bigint[] := '{}'; v_b bigint; i int; v_texto text;
begin
  for i in 1 .. p_corridas loop
    execute 'explain (analyze, buffers, verbose, format json) ' || p_ejecutar into v_plan;
    continue when i <= least(2, p_corridas - 1);
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    v_b := coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Hit Blocks')::bigint, 0) + coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Read Blocks')::bigint, 0);
    v_buf := v_buf || v_b;
  end loop;
  v_texto := v_plan::text;
  return jsonb_build_object(
    'ms', (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m),
    'buffers', (select percentile_disc(0.5) within group (order by b) from unnest(v_buf) b),
    'indices', coalesce((select jsonb_agg(distinct m[1]) from regexp_matches(v_texto, '"Index Name": "([^"]+)"', 'g') m), '[]'::jsonb),
    'seq', v_texto ~ ('"Node Type": "Seq Scan"[^{}]*?"Relation Name": "' || p_tabla || '"'),
    'sort_grande', coalesce((select max(m[1]::numeric) from regexp_matches(v_texto, '"Node Type": "Sort"[^{}]*?"Actual Rows": (\d+)', 'g') m), 0) > current_setting('medir.pagina')::numeric);
end $$;

create temp table _med (ruta text, quien text, ms numeric, buffers bigint, indices jsonb, seq boolean, sort_grande boolean);
grant all on _med to authenticated;
create temp table _total (ruta text, quien text, ms numeric, filas bigint, paginas int, max_pagina_ms numeric);
grant all on _total to authenticated;

-- La consulta del route handler: las 11 columnas del archivo (nunca `*`), sin papelera explícito; y las de los nombres, como las arma PostgREST.
create function pg_temp.preparar() returns void language plpgsql as $$
declare
  v_cols constant text := 'id, numero, origen_id, lead_id, vehiculo_id, clase, estado, titulo, total_base, creado_en, actualizado_en';
  v_n constant text := current_setting('medir.pagina');
  v_ids constant text := current_setting('medir.ids');
begin
  execute 'prepare r_primera(timestamptz) as select ' || v_cols || ' from public.cotizaciones where eliminado_en is null and creado_en <= $1 order by creado_en desc, id desc limit ' || v_n;
  execute 'prepare r_cursor(timestamptz, timestamptz, uuid) as select ' || v_cols || ' from public.cotizaciones where eliminado_en is null and creado_en <= $1 and creado_en <= $2 and (creado_en < $2 or id < $3) order by creado_en desc, id desc limit ' || v_n;
  execute 'prepare r_ids(timestamptz, timestamptz, uuid) as select id, creado_en from public.cotizaciones where eliminado_en is null and creado_en <= $1 and creado_en <= $2 and (creado_en < $2 or id < $3) order by creado_en desc, id desc limit ' || v_n;
  execute 'prepare r_origen(uuid, timestamptz) as select ' || v_cols || ' from public.cotizaciones where eliminado_en is null and origen_id = $1 and creado_en <= $2 order by creado_en desc, id desc limit ' || v_n;
  execute 'prepare r_clientes(uuid[]) as select id, nombre from public.leads_vista_por_ids($1) limit ' || v_n;
  execute 'prepare r_titulos(uuid[]) as select id, titulo from public.vehiculos where id = any ($1) and eliminado_en is null limit ' || v_ids;
end $$;

create function pg_temp.como(p_quien text) returns void language plpgsql as $$
declare v_id uuid := (select id from _p where clave = p_quien);
begin
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
end $$;

create function pg_temp.guardar(p_ruta text, p_quien text, p_consulta text, p_tabla text default 'cotizaciones') returns void language plpgsql as $$
declare v_m jsonb := pg_temp.medir(p_consulta, p_tabla);
begin
  insert into _med values (p_ruta, p_quien, (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint, v_m -> 'indices', (v_m ->> 'seq')::boolean, (v_m ->> 'sort_grande')::boolean);
end $$;

-- Recorre por cursor, de a 1.000, como el flujo: `p_solo_ids` es el conteo (hasta 250.001), si no, la lectura entera. Guarda también la página más cara.
create function pg_temp.recorrer(p_quien text, p_solo_ids boolean) returns void language plpgsql as $$
declare v_pagina constant int := current_setting('medir.pagina')::int; v_tope constant int := current_setting('medir.tope')::int;
        v_corte timestamptz := current_setting('medir.corte')::timestamptz;
        v_ts timestamptz := 'infinity'; v_id uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff'; v_n bigint := 0; v_pag int := 0;
        v_leidas int; t0 timestamptz := clock_timestamp(); t_pag timestamptz; v_max numeric := 0; r record;
begin
  loop
    v_leidas := 0; t_pag := clock_timestamp();
    for r in execute format('execute %s(%L, %L, %L)', case when p_solo_ids then 'r_ids' else 'r_cursor' end, v_corte, v_ts, v_id) loop
      v_leidas := v_leidas + 1; v_ts := r.creado_en; v_id := r.id;
    end loop;
    v_max := greatest(v_max, extract(epoch from clock_timestamp() - t_pag) * 1000);
    v_n := v_n + v_leidas; v_pag := v_pag + 1;
    exit when v_leidas < v_pagina or (p_solo_ids and v_n > v_tope);
  end loop;
  insert into _total values (case when p_solo_ids then 'C-R4 conteo entero' else 'C-R5 lectura entera' end, p_quien,
    extract(epoch from clock_timestamp() - t0) * 1000, v_n, v_pag, v_max);
end $$;
grant execute on all functions in schema pg_temp to authenticated;

analyze public.cotizaciones;
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.preparar();
select pg_temp.como('duena');
select pg_temp.guardar('C-R1 primera página', 'duena', format('execute r_primera(%L)', current_setting('medir.corte')));
select pg_temp.guardar('C-R2 página profunda', 'duena',
  format('execute r_cursor(%L, %L, %L)', current_setting('medir.corte'), (select ts from _cur), (select id from _cur)));
select pg_temp.guardar('C-R3 primera página de un origen', 'duena', format('execute r_origen(%L, %L)', (select id from _o where i = 1), current_setting('medir.corte')));
select pg_temp.guardar('C-R6 nombres de los clientes', 'duena', format('execute r_clientes(%L)', (select lead from _ids)), 'leads');
select pg_temp.guardar('C-R7 títulos de los vehículos', 'duena', format('execute r_titulos(%L)', (select vehiculo from _ids)), 'vehiculos');
select pg_temp.recorrer('duena', true);
select pg_temp.recorrer('duena', false);
select pg_temp.como('pia');
select pg_temp.guardar('C-R1 primera página', 'pia', format('execute r_primera(%L)', current_setting('medir.corte')));
select pg_temp.recorrer('pia', true);
select pg_temp.recorrer('pia', false);
reset role;

do $$
declare r record; v_fallas text := ''; v_r4 numeric; v_r5 numeric; v_r6 numeric; v_r7 numeric; v_pags int; v_estimado numeric;
        v_indice text;
begin
  for r in select * from _med order by quien, ruta loop
    raise notice 'medicion|Exportar cotizaciones, % · % (ms%)|%', r.ruta, r.quien, case r.quien when 'pia' then ', sin assert' else '' end, round(r.ms, 2);
    raise notice 'medicion|Exportar cotizaciones, % · % (buffers%)|%', r.ruta, r.quien, case r.quien when 'pia' then ', sin assert' else '' end, r.buffers;
    continue when r.quien <> 'duena';
    v_indice := case when r.ruta like 'C-R1%' or r.ruta like 'C-R2%' then 'cotizaciones_listado_idx'
                     when r.ruta like 'C-R3%' then 'cotizaciones_origen_creado_idx'
                     when r.ruta like 'C-R7%' then 'vehiculos_pkey' end;
    if r.ruta like 'C-R6%' then
      if r.ms > 300 then v_fallas := v_fallas || format(E'\n  %s: %s ms, el presupuesto es 300', r.ruta, round(r.ms, 1)); end if;
      continue;
    end if;
    if r.ruta like 'C-R7%' and r.ms > 30 then v_fallas := v_fallas || format(E'\n  %s: %s ms, el presupuesto es 30', r.ruta, round(r.ms, 1)); end if;
    if r.ruta not like 'C-R7%' and r.ms > 150 then v_fallas := v_fallas || format(E'\n  %s: %s ms, el presupuesto es 150', r.ruta, round(r.ms, 1)); end if;
    if not r.indices ? v_indice then v_fallas := v_fallas || format(E'\n  %s no camina %s: %s', r.ruta, v_indice, r.indices); end if;
    if r.seq then v_fallas := v_fallas || format(E'\n  %s recorre la tabla (Seq Scan)', r.ruta); end if;
    if r.sort_grande then v_fallas := v_fallas || format(E'\n  %s ordena más de 1.000 filas', r.ruta); end if;
  end loop;
  for r in select * from _total order by quien, ruta loop
    raise notice 'medicion|Exportar cotizaciones, % · % (ms%, % filas en % páginas)|%', r.ruta, r.quien,
      case r.quien when 'pia' then ', sin assert' else '' end, r.filas, r.paginas, round(r.ms);
    raise notice 'medicion|Exportar cotizaciones, % · % (ms de la página más cara, sin assert)|%', r.ruta, r.quien, round(r.max_pagina_ms, 1);
    if r.quien = 'pia' and r.max_pagina_ms > 8000 then
      raise notice 'nota|Pía («propios»): la página más cara de % tarda % s, más que el statement_timeout de authenticated: límite conocido|', r.ruta, round(r.max_pagina_ms / 1000, 1);
    end if;
  end loop;
  select ms into v_r4 from _total where quien = 'duena' and ruta = 'C-R4 conteo entero';
  select ms, paginas into v_r5, v_pags from _total where quien = 'duena' and ruta = 'C-R5 lectura entera';
  select ms into v_r6 from _med where quien = 'duena' and ruta like 'C-R6%';
  select ms into v_r7 from _med where quien = 'duena' and ruta like 'C-R7%';
  if v_r4 > 15000 then v_fallas := v_fallas || format(E'\n  C-R4 conteo entero: %s ms, el presupuesto es 15.000', round(v_r4)); end if;
  if v_r5 > 60000 then v_fallas := v_fallas || format(E'\n  C-R5 lectura entera: %s ms, el presupuesto es 60.000', round(v_r5)); end if;
  v_estimado := v_r4 + v_r5 + v_pags * (v_r6 + (current_setting('medir.pagina')::numeric / current_setting('medir.ids')::numeric) * v_r7);
  raise notice 'medicion|Exportar cotizaciones, estimado de la exportación entera con nombres · duena (s, sin assert)|%', round(v_estimado / 1000, 1);
  if v_estimado > 150000 then
    raise notice 'nota|La exportación entera con nombres (% s) pasa 150 s: TOPE_POR_ENTIDAD.cotizaciones tiene que bajar|', round(v_estimado / 1000);
  end if;
  if v_fallas <> '' then raise exception 'Exportar cotizaciones rompe su presupuesto:%', v_fallas; end if;
end $$;
rollback;
