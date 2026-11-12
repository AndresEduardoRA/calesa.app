-- Medición de «exportar todo» de leads (paso 9.05-2): `MEDIR_SOLO=medir-datos-exportar pnpm db:medir:volumen`, contra el Supabase LOCAL con la siembra de volumen
-- (`pnpm db:sembrar-volumen`, 62.000 leads; se repite con `-- --leads 200000`, 212.000, y se anota). Todo en una transacción que se revierte.
--
-- Qué se mide: la consulta del route handler (`datos/infra/exportacion.ts`) a `datos_exportar_leads()`, como `authenticated` y con el plan genérico:
--   R1 · la primera página de 1.000 (las 11 columnas del archivo) con `creado_en <= corte`, `order by creado_en desc, id desc`;
--   R2 · una página profunda (el cursor en la fila 40.000) con `creado_en <= c and (creado_en < c or id < i)`;
--   R3 · una página profunda sólo de `id, creado_en` (el conteo previo);
--   R4 · el conteo entero: páginas de ids hasta 250.001 (o hasta que se acaban);
--   R5 · la lectura entera: páginas de 1.000 por cursor hasta el final.
-- La dueña («todos») con assert; Berta («propios»), sin assert: se informa. R4 y R5 no cuentan el viaje HTTP ni el JSON de cada página de PostgREST: el flujo real tarda más.
--
-- Asserta: R1 y R2 caminan `leads_listado_idx`, sin `Function Scan` (la función se inlinea) y sin `Sort` de más de 1.000 filas, ≤ 250 ms; R3 no llama `telefono_lead`
-- ni `atributos_lead` en el plan, ≤ 60 ms; R4 ≤ 15 s y R5 ≤ 90 s. Si R5 extrapolado a 250.000 filas pasa 150 s (la mitad de la vida mínima del token, 5 min), el tope
-- de filas del código (`TOPE_DE_FILAS`) tiene que bajar: lo dice la nota final.
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.leads;
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null
-- De a cuántas filas lee el flujo y su tope: `FILAS_POR_PEDIDO` y `TOPE_DE_FILAS` de `src/modules/datos/entities/exportacion.ts` (los pasa medir-listado.mjs).
select set_config('medir.pagina', :'filas_exportar', true) \g /dev/null
select set_config('medir.tope', :'tope_exportar_todo', true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') then
    raise exception 'falta la dueña de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir exportar todo: %|', current_setting('medir.carga');
  raise notice 'nota|Leads vivos en la base: %|', (select count(*) from public.leads where eliminado_en is null);
end $$;

create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('berta', '00000000-0000-0000-0000-0000000000b1');
grant select on _p to authenticated;

-- El cursor profundo: la fila 40.000 de los vivos por `creado_en desc, id desc` (la dueña los ve todos).
create temp table _cur (ts timestamptz not null, id uuid not null);
insert into _cur select creado_en, id from public.leads where eliminado_en is null order by creado_en desc, id desc offset 39999 limit 1;
do $$ begin
  if (select count(*) from _cur) <> 1 then raise exception 'la base no llega a 40.000 leads vivos: corre pnpm db:sembrar-volumen'; end if;
end $$;
grant select on _cur to authenticated;

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
    'funcion', v_texto ~ '"Node Type": "Function Scan"',
    -- Un Sort de más de 1.000 filas: ordena lo que el índice tendría que dar ordenado.
    'sort_grande', coalesce((select max(m[1]::numeric) from regexp_matches(v_texto, '"Node Type": "Sort"[^{}]*?"Actual Rows": (\d+)', 'g') m), 0) > current_setting('medir.pagina')::numeric,
    'privadas', v_texto ~ '(telefono_lead|atributos_lead)');
end $$;

create temp table _med (ruta text, quien text, ms numeric, buffers bigint, indices jsonb, funcion boolean, sort_grande boolean, privadas boolean);
grant all on _med to authenticated;
create temp table _total (ruta text, quien text, ms numeric, filas bigint, paginas int);
grant all on _total to authenticated;

-- La consulta del route handler: las 11 columnas del archivo, nunca `*`.
create function pg_temp.preparar() returns void language plpgsql as $$
declare
  v_cols constant text := 'id, numero, nombre, telefono_principal, telefono_visible, tipo_lead_id, origen_lead_id, atributos, dueno_id, creado_en, ultimo_seguimiento_en';
  v_n constant text := current_setting('medir.pagina');
begin
  execute 'prepare r_primera(timestamptz) as select ' || v_cols || ' from public.datos_exportar_leads() where creado_en <= $1 order by creado_en desc, id desc limit ' || v_n;
  execute 'prepare r_cursor(timestamptz, timestamptz, uuid) as select ' || v_cols || ' from public.datos_exportar_leads() where creado_en <= $1 and creado_en <= $2 and (creado_en < $2 or id < $3) order by creado_en desc, id desc limit ' || v_n;
  execute 'prepare r_ids(timestamptz, timestamptz, uuid) as select id, creado_en from public.datos_exportar_leads() where creado_en <= $1 and creado_en <= $2 and (creado_en < $2 or id < $3) order by creado_en desc, id desc limit ' || v_n;
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
  insert into _med values (p_ruta, p_quien, (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint, v_m -> 'indices', (v_m ->> 'funcion')::boolean,
    (v_m ->> 'sort_grande')::boolean, (v_m ->> 'privadas')::boolean);
end $$;

-- Recorre por cursor, de a 1.000, como el flujo: `p_solo_ids` es el conteo (hasta 250.001), si no, la lectura entera.
create function pg_temp.recorrer(p_quien text, p_solo_ids boolean) returns void language plpgsql as $$
declare v_pagina constant int := current_setting('medir.pagina')::int; v_tope constant int := current_setting('medir.tope')::int;
        v_corte timestamptz := now(); v_ts timestamptz := 'infinity'; v_id uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff'; v_n bigint := 0; v_pag int := 0;
        v_leidas int; t0 timestamptz := clock_timestamp(); r record;
begin
  loop
    v_leidas := 0;
    if p_solo_ids then
      for r in execute format('execute r_ids(%L, %L, %L)', v_corte, v_ts, v_id) loop
        v_leidas := v_leidas + 1; v_ts := r.creado_en; v_id := r.id;
      end loop;
    else
      for r in execute format('execute r_cursor(%L, %L, %L)', v_corte, v_ts, v_id) loop
        v_leidas := v_leidas + 1; v_ts := r.creado_en; v_id := r.id;
      end loop;
    end if;
    v_n := v_n + v_leidas; v_pag := v_pag + 1;
    exit when v_leidas < v_pagina or (p_solo_ids and v_n > v_tope);
  end loop;
  insert into _total values (case when p_solo_ids then 'R4 conteo entero' else 'R5 lectura entera' end, p_quien,
    extract(epoch from clock_timestamp() - t0) * 1000, v_n, v_pag);
end $$;
grant execute on all functions in schema pg_temp to authenticated;

analyze public.leads;
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.preparar();
select pg_temp.como('duena');
select pg_temp.guardar('R1 primera página', 'duena', format('execute r_primera(%L)', now()));
select pg_temp.guardar('R2 página profunda', 'duena', format('execute r_cursor(%L, %L, %L)', now(), (select ts from _cur), (select id from _cur)));
select pg_temp.guardar('R3 página de ids', 'duena', format('execute r_ids(%L, %L, %L)', now(), (select ts from _cur), (select id from _cur)));
select pg_temp.recorrer('duena', true);
select pg_temp.recorrer('duena', false);
select pg_temp.como('berta');
select pg_temp.guardar('R1 primera página', 'berta', format('execute r_primera(%L)', now()));
select pg_temp.guardar('R2 página profunda', 'berta', format('execute r_cursor(%L, %L, %L)', now(), (select ts from _cur), (select id from _cur)));
select pg_temp.recorrer('berta', false);
reset role;

do $$
declare r record; v_fallas text := ''; v_r5 record; v_extrapolado numeric;
begin
  for r in select * from _med order by quien, ruta loop
    raise notice 'medicion|Exportar todo, % · % (ms%)|%', r.ruta, r.quien, case r.quien when 'berta' then ', sin assert' else '' end, round(r.ms, 2);
    raise notice 'medicion|Exportar todo, % · % (buffers%)|%', r.ruta, r.quien, case r.quien when 'berta' then ', sin assert' else '' end, r.buffers;
    continue when r.quien <> 'duena';
    if r.ruta in ('R1 primera página', 'R2 página profunda') then
      if r.ms > 250 then v_fallas := v_fallas || format(E'\n  %s: %s ms, el presupuesto es 250', r.ruta, round(r.ms, 1)); end if;
      if not r.indices ? 'leads_listado_idx' then v_fallas := v_fallas || format(E'\n  %s no camina leads_listado_idx: %s', r.ruta, r.indices); end if;
      if r.funcion then v_fallas := v_fallas || format(E'\n  %s no inlinea la función (Function Scan)', r.ruta); end if;
      if r.sort_grande then v_fallas := v_fallas || format(E'\n  %s ordena más de 1.000 filas', r.ruta); end if;
    else
      if r.ms > 60 then v_fallas := v_fallas || format(E'\n  %s: %s ms, el presupuesto es 60', r.ruta, round(r.ms, 1)); end if;
      if r.privadas then v_fallas := v_fallas || format(E'\n  %s llama telefono_lead o atributos_lead (el conteo sólo pide ids)', r.ruta); end if;
    end if;
  end loop;
  for r in select * from _total order by quien, ruta loop
    raise notice 'medicion|Exportar todo, % · % (ms%, % filas en % páginas)|%', r.ruta, r.quien,
      case r.quien when 'berta' then ', sin assert' else '' end, r.filas, r.paginas, round(r.ms);
  end loop;
  select * into r from _total where quien = 'duena' and ruta = 'R4 conteo entero';
  if r.ms > 15000 then v_fallas := v_fallas || format(E'\n  R4 conteo entero: %s ms, el presupuesto es 15.000', round(r.ms)); end if;
  select * into v_r5 from _total where quien = 'duena' and ruta = 'R5 lectura entera';
  if v_r5.ms > 90000 then v_fallas := v_fallas || format(E'\n  R5 lectura entera: %s ms, el presupuesto es 90.000', round(v_r5.ms)); end if;
  v_extrapolado := v_r5.ms * current_setting('medir.tope')::numeric / greatest(v_r5.filas, 1);
  raise notice 'medicion|Exportar todo, R5 extrapolado a % filas (el tope) · duena (ms)|%', current_setting('medir.tope'), round(v_extrapolado);
  if v_extrapolado > 150000 then
    raise notice 'nota|R5 extrapolado (%s) pasa 150 s: TOPE_DE_FILAS tiene que bajar a ≈ %|', round(v_extrapolado / 1000), floor(150000 * v_r5.filas / v_r5.ms);
  end if;
  if v_fallas <> '' then raise exception 'Exportar todo rompe su presupuesto:%', v_fallas; end if;
end $$;
rollback;
