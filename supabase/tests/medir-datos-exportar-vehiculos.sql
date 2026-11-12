-- Medición de «exportar todo» de vehículos (paso 9.05-2b): `MEDIR_SOLO=medir-datos-exportar-vehiculos pnpm db:medir:volumen`, contra el Supabase LOCAL con la
-- siembra de volumen (`pnpm db:sembrar-volumen`: la dueña). Todo en una transacción que se revierte: ningún vehículo, persona ni rol queda.
--
-- Qué se mide: la consulta del route handler (`datos/infra/vehiculos.ts`) a la tabla `vehiculos`, como `authenticated` y con el plan genérico, sobre 250.000 vehículos
-- vivos de un origen (más 5.000 de Pía, «propios», lo más nuevo):
--   V-R1 · la primera página de 1.000 (las 20 columnas del archivo) con `origen_id = A and creado_en <= corte`, `order by creado_en desc, id desc`;
--   V-R2 · una página profunda (el cursor en la fila 150.000) con `creado_en <= c and (creado_en < c or id < i)`;
--   V-R3 · el conteo entero: páginas de `id, creado_en` hasta 250.001 (o hasta que se acaban);
--   V-R4 · la lectura entera: páginas de 1.000 por cursor hasta el final.
-- La dueña («todos») con assert; Pía («propios»), V-R1 y V-R4 sin assert: se informa. V-R3 y V-R4 no cuentan el viaje HTTP ni el JSON de PostgREST.
--
-- Asserta (la dueña): V-R1 y V-R2 caminan `vehiculos_origen_listado_idx`, sin `Seq Scan` de `vehiculos` y sin `Sort` de más de 1.000 filas, ≤ 150 ms; V-R3 ≤ 15 s y
-- V-R4 ≤ 60 s. Si V-R3 + V-R4 pasan 150 s (la mitad de la vida mínima del token, 5 min), `TOPE_POR_ENTIDAD.vehiculos` tiene que bajar: lo dice la nota final.
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.vehiculos;
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null
-- De a cuántas filas lee el flujo y su tope: `FILAS_POR_PEDIDO` y `TOPE_DE_FILAS` de `src/modules/datos/entities/exportacion.ts` (los pasa medir-listado.mjs).
select set_config('medir.pagina', :'filas_exportar', true) \g /dev/null
select set_config('medir.tope', :'tope_exportar_todo', true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') then
    raise exception 'falta la dueña de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  if (select count(*) from public.vehiculos where eliminado_en is null) > 20000 then
    raise exception 'la base ya trae % vehículos vivos: la medición siembra los suyos (pnpm db:reset)', (select count(*) from public.vehiculos where eliminado_en is null);
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir exportar todo de vehículos: %|', current_setting('medir.carga');
end $$;

-- El terreno, como postgres. Pía con los triggers encendidos (el de `auth.users` crea el perfil) y un rol propio de «propios».
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('pia', '00000000-0000-0000-0000-0000000000f1');
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'medir-dex-pia@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Medir exportar Pía', invitacion_aceptada_en = now() where id = '00000000-0000-0000-0000-0000000000f1';
with r as (insert into public.roles (clave, nombre) values ('medir_dex_propios', 'Medir exportar propios') returning id),
     c as (insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) select id, 'vehiculos.ver', null, 'propios' from r returning rol_id)
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select '00000000-0000-0000-0000-0000000000f1', (select id from r), true;
create temp table _o (id uuid not null);
insert into _o select id from public.origenes where clave = 'subasta_usa';
do $$ begin
  if (select count(*) from _o) <> 1 then raise exception 'esperaba el origen subasta_usa de la semilla'; end if;
end $$;

-- Sin triggers (cada fila auditaría y validaría atributos); `numero` es una identidad y se llena igual. Los de Pía, con `creado_en` futuro: lo más nuevo del origen.
set local session_replication_role = replica;
insert into public.vehiculos (origen_id, titulo, marca, modelo, anio, precio, creado_por, creado_en, actualizado_en)
select (select id from _o), 'Medir dex ' || g, 'Marca', 'Modelo', 2020, 10000 + g, '00000000-0000-0000-0000-0000000000d1', now() - g * interval '1 second', now()
  from generate_series(1, 250000) g;
insert into public.vehiculos (origen_id, titulo, creado_por, creado_en, actualizado_en)
select (select id from _o), 'Medir dex Pía ' || g, '00000000-0000-0000-0000-0000000000f1', now() + g * interval '1 second', now()
  from generate_series(1, 5000) g;
set local session_replication_role = origin;
grant select on _p, _o to authenticated;

-- El corte: después de lo de Pía. El cursor profundo: la fila 150.000 del origen (la dueña los ve todos).
create temp table _cur (ts timestamptz not null, id uuid not null);
insert into _cur select creado_en, id from public.vehiculos where origen_id = (select id from _o) and eliminado_en is null
  order by creado_en desc, id desc offset 149999 limit 1;
grant select on _cur to authenticated;
select set_config('medir.corte', (now() + interval '1 day')::text, true) \g /dev/null

create function pg_temp.medir(p_ejecutar text, p_corridas int default 7) returns jsonb language plpgsql as $$
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
    'seq', v_texto ~ '"Node Type": "Seq Scan"[^{}]*?"Relation Name": "vehiculos"',
    'sort_grande', coalesce((select max(m[1]::numeric) from regexp_matches(v_texto, '"Node Type": "Sort"[^{}]*?"Actual Rows": (\d+)', 'g') m), 0) > current_setting('medir.pagina')::numeric);
end $$;

create temp table _med (ruta text, quien text, ms numeric, buffers bigint, indices jsonb, seq boolean, sort_grande boolean);
grant all on _med to authenticated;
create temp table _total (ruta text, quien text, ms numeric, filas bigint, paginas int);
grant all on _total to authenticated;

-- La consulta del route handler: las 20 columnas del archivo, nunca `*`.
create function pg_temp.preparar() returns void language plpgsql as $$
declare
  v_cols constant text := 'id, numero, titulo, marca, modelo, anio, vin, lote, plataforma, url_origen, precio, precio_negociable, acepta_permuta, placado, '
    || 'kilometraje, categoria_id, fase_id, atributos, creado_en, actualizado_en';
  v_n constant text := current_setting('medir.pagina');
begin
  execute 'prepare r_primera(uuid, timestamptz) as select ' || v_cols || ' from public.vehiculos where origen_id = $1 and creado_en <= $2 order by creado_en desc, id desc limit ' || v_n;
  execute 'prepare r_cursor(uuid, timestamptz, timestamptz, uuid) as select ' || v_cols || ' from public.vehiculos where origen_id = $1 and creado_en <= $2 and creado_en <= $3 and (creado_en < $3 or id < $4) order by creado_en desc, id desc limit ' || v_n;
  execute 'prepare r_ids(uuid, timestamptz, timestamptz, uuid) as select id, creado_en from public.vehiculos where origen_id = $1 and creado_en <= $2 and creado_en <= $3 and (creado_en < $3 or id < $4) order by creado_en desc, id desc limit ' || v_n;
end $$;

create function pg_temp.como(p_quien text) returns void language plpgsql as $$
declare v_id uuid := (select id from _p where clave = p_quien);
begin
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
end $$;

create function pg_temp.guardar(p_ruta text, p_quien text, p_consulta text) returns void language plpgsql as $$
declare v_m jsonb := pg_temp.medir(p_consulta);
begin
  insert into _med values (p_ruta, p_quien, (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint, v_m -> 'indices', (v_m ->> 'seq')::boolean, (v_m ->> 'sort_grande')::boolean);
end $$;

-- Recorre por cursor, de a 1.000, como el flujo: `p_solo_ids` es el conteo (hasta 250.001), si no, la lectura entera.
create function pg_temp.recorrer(p_quien text, p_solo_ids boolean) returns void language plpgsql as $$
declare v_pagina constant int := current_setting('medir.pagina')::int; v_tope constant int := current_setting('medir.tope')::int;
        v_origen uuid := (select id from _o); v_corte timestamptz := current_setting('medir.corte')::timestamptz;
        v_ts timestamptz := 'infinity'; v_id uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff'; v_n bigint := 0; v_pag int := 0;
        v_leidas int; t0 timestamptz := clock_timestamp(); r record;
begin
  loop
    v_leidas := 0;
    for r in execute format('execute %s(%L, %L, %L, %L)', case when p_solo_ids then 'r_ids' else 'r_cursor' end, v_origen, v_corte, v_ts, v_id) loop
      v_leidas := v_leidas + 1; v_ts := r.creado_en; v_id := r.id;
    end loop;
    v_n := v_n + v_leidas; v_pag := v_pag + 1;
    exit when v_leidas < v_pagina or (p_solo_ids and v_n > v_tope);
  end loop;
  insert into _total values (case when p_solo_ids then 'V-R3 conteo entero' else 'V-R4 lectura entera' end, p_quien,
    extract(epoch from clock_timestamp() - t0) * 1000, v_n, v_pag);
end $$;
grant execute on all functions in schema pg_temp to authenticated;

analyze public.vehiculos;
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.preparar();
select pg_temp.como('duena');
select pg_temp.guardar('V-R1 primera página', 'duena', format('execute r_primera(%L, %L)', (select id from _o), current_setting('medir.corte')));
select pg_temp.guardar('V-R2 página profunda', 'duena',
  format('execute r_cursor(%L, %L, %L, %L)', (select id from _o), current_setting('medir.corte'), (select ts from _cur), (select id from _cur)));
select pg_temp.recorrer('duena', true);
select pg_temp.recorrer('duena', false);
select pg_temp.como('pia');
select pg_temp.guardar('V-R1 primera página', 'pia', format('execute r_primera(%L, %L)', (select id from _o), current_setting('medir.corte')));
select pg_temp.recorrer('pia', false);
reset role;

do $$
declare r record; v_fallas text := ''; v_r3 numeric; v_r4 numeric;
begin
  for r in select * from _med order by quien, ruta loop
    raise notice 'medicion|Exportar vehículos, % · % (ms%)|%', r.ruta, r.quien, case r.quien when 'pia' then ', sin assert' else '' end, round(r.ms, 2);
    raise notice 'medicion|Exportar vehículos, % · % (buffers%)|%', r.ruta, r.quien, case r.quien when 'pia' then ', sin assert' else '' end, r.buffers;
    continue when r.quien <> 'duena';
    if r.ms > 150 then v_fallas := v_fallas || format(E'\n  %s: %s ms, el presupuesto es 150', r.ruta, round(r.ms, 1)); end if;
    if not r.indices ? 'vehiculos_origen_listado_idx' then v_fallas := v_fallas || format(E'\n  %s no camina vehiculos_origen_listado_idx: %s', r.ruta, r.indices); end if;
    if r.seq then v_fallas := v_fallas || format(E'\n  %s recorre vehiculos (Seq Scan)', r.ruta); end if;
    if r.sort_grande then v_fallas := v_fallas || format(E'\n  %s ordena más de 1.000 filas', r.ruta); end if;
  end loop;
  for r in select * from _total order by quien, ruta loop
    raise notice 'medicion|Exportar vehículos, % · % (ms%, % filas en % páginas)|%', r.ruta, r.quien,
      case r.quien when 'pia' then ', sin assert' else '' end, r.filas, r.paginas, round(r.ms);
  end loop;
  select ms into v_r3 from _total where quien = 'duena' and ruta = 'V-R3 conteo entero';
  select ms into v_r4 from _total where quien = 'duena' and ruta = 'V-R4 lectura entera';
  if v_r3 > 15000 then v_fallas := v_fallas || format(E'\n  V-R3 conteo entero: %s ms, el presupuesto es 15.000', round(v_r3)); end if;
  if v_r4 > 60000 then v_fallas := v_fallas || format(E'\n  V-R4 lectura entera: %s ms, el presupuesto es 60.000', round(v_r4)); end if;
  if v_r3 + v_r4 > 150000 then
    raise notice 'nota|V-R3 + V-R4 (% s) pasan 150 s: TOPE_POR_ENTIDAD.vehiculos tiene que bajar|', round((v_r3 + v_r4) / 1000);
  end if;
  if v_fallas <> '' then raise exception 'Exportar vehículos rompe su presupuesto:%', v_fallas; end if;
end $$;
rollback;
