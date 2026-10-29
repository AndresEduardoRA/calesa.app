-- Medición del historial de un vehículo con 50.000 y con 250.000 cotizaciones (paso 4.14-1): `pnpm db:medir:volumen`, contra el Supabase LOCAL con la siembra de volumen (la
-- dueña y Ana de `sembrar.sql`). Todo en una transacción que se revierte: ninguna cotización queda. La forma es la de `medir-cotizaciones-lectura.sql`.
--
-- Qué se mide: la lectura que escribirá el 4.14-2 (el historial del vehículo elegido y «Cotizado (n)», que es su primera página con `limit n + 1`, nunca `count`): las
-- cotizaciones de un vehículo, la más nueva primero, `n + 1` filas (`TAMANO_DE_VER_MAS` + 1) por `creado_en desc, id desc`, la primera y una profunda por cursor, con columnas que
-- `authenticated` puede leer. Como `authenticated`, con el plan genérico, `EXPLAIN (ANALYZE, BUFFERS)` ×7 y la mediana de las 5 últimas. Un vehículo «caliente» lleva 5.000
-- cotizaciones; las demás se reparten entre 100 vehículos. Quién: la dueña («todos») y Ana («propios»: ve 5 de las 5.000, las que creó). Por qué 100 y no 1.000: el plan
-- genérico estima las filas de un vehículo por el promedio (N / vehículos). Con 1.000 y 50.000 cotizaciones estima 50 y, con el cursor, menos de una página, y elige a veces ordenar
-- (según la muestra de ANALYZE: una corrida sí y otra no). Así mide el vehículo caliente con el plan de un vehículo muy cotizado; uno con pocas ordena sus pocas filas (4.14-1).
--
-- Asserta para la dueña, con los dos volúmenes: `cotizaciones_vehiculo_creado_idx`, sin `Seq Scan` de `cotizaciones`, sin `Sort` y sin descartar filas que crezcan con N; ≤ 10 ms y ≤ 300
-- buffers; que no crece con N (con 250.000, el tiempo a lo sumo `greatest(1,5 × t, t + 3 ms)` y los buffers 1,2 × + 20). Ana se mide y se anota: recorre las cotizaciones DEL
-- VEHÍCULO hasta llenar la página (crece con ellas, no con N). La guarda: con el índice de antes, `cotizaciones_vehiculo_idx` (sólo `vehiculo_id`), la página ordena las 5.000.
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.cotizaciones;
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null
select set_config('medir.pagina', (:ver_mas + 1)::text, true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') or not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000a1') then
    raise exception 'faltan la dueña y Ana de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  if (select count(*) from public.cotizaciones) > 0 then
    raise exception 'la base ya trae cotizaciones: la medición cuenta con 50.000 y 250.000 propias (pnpm db:reset)';
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir el historial del vehículo: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres: el origen sembrado `subasta_usa` con su fórmula publicada, el vehículo caliente y 100 más (sin triggers)
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('ana', '00000000-0000-0000-0000-0000000000a1');
create temp table _o as select o.id as origen, f.id as formula from public.origenes o join public.formulas f on f.origen_id = o.id and f.estado = 'publicada' where o.clave = 'subasta_usa';
do $$ begin
  if (select count(*) from _o) <> 1 then raise exception 'esperaba el origen sembrado subasta_usa con su fórmula publicada'; end if;
end $$;
create temp table _v (i int primary key, id uuid not null);
set local session_replication_role = replica;
with v as (insert into public.vehiculos (origen_id, titulo, creado_por) select (select origen from _o), 'Medir historial ' || g, '00000000-0000-0000-0000-0000000000d1'
             from generate_series(0, 100) g returning id, titulo)
insert into _v select replace(titulo, 'Medir historial ', '')::int, id from v;
set local session_replication_role = origin;
create temp table _snap as select (select jsonb_object_agg(n ->> 'id', round((n_ord * 13.37)::numeric, 2)) from jsonb_array_elements(f.definicion -> 'nodos') with ordinality x (n, n_ord)) as valores,
                                  (select jsonb_object_agg(n ->> 'id', 'input') from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'tipo' in ('input', 'constante', 'tipo_cambio')) as fuentes
  from public.formulas f join _o on f.id = _o.formula;
grant select on _p, _o, _v to authenticated;

-- Las filas g ∈ [desde, hasta], más nuevas cuanto mayor es g: las 5.000 primeras son del vehículo caliente (`_v.i = 0`; una de cada mil, de Ana), las demás de los otros 100.
create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, creado_en, actualizado_en)
  select o.origen, case when g <= 5000 and g % 1000 = 1 then (select id from _p where clave = 'ana') else (select id from _p where clave = 'duena') end,
         o.formula, (select id from _v where i = case when g <= 5000 then 0 else 1 + g % 100 end),
         s.valores, s.fuentes, '{"oficial": 6.96, "paralelo": 12.4}', '{"usd": 1234.5}', 1234.5, 'Historial ' || g,
         timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds', timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds'
    from generate_series(p_desde, p_hasta) g cross join _o o cross join _snap s;
  set local session_replication_role = origin;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las funciones de medición. Corren como quien las llama (authenticated), con el plan genérico.
-- ---------------------------------------------------------------------------------------------------------------------------------
create function pg_temp.medir(p_ejecutar text) returns jsonb language plpgsql as $$
declare
  v_plan jsonb; v_ms numeric[] := '{}'; v_buf bigint[] := '{}'; v_clave text; v_b bigint; i int; v_texto text;
begin
  for i in 1 .. 7 loop
    execute 'explain (analyze, buffers, format json) ' || p_ejecutar into v_plan;
    continue when i <= 2;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    v_b := 0;
    foreach v_clave in array array['Shared Hit Blocks', 'Shared Read Blocks'] loop
      v_b := v_b + coalesce((v_plan -> 0 -> 'Plan' ->> v_clave)::bigint, 0);
    end loop;
    v_buf := v_buf || v_b;
  end loop;
  v_texto := v_plan::text;
  return jsonb_build_object(
    'ms', (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m),
    'buffers', (select percentile_disc(0.5) within group (order by b) from unnest(v_buf) b),
    'indices', coalesce((select jsonb_agg(distinct m[1]) from regexp_matches(v_texto, '"Index Name": "([^"]+)"', 'g') m), '[]'::jsonb),
    'seq', exists (select 1 from regexp_matches(v_texto, '"Node Type": "Seq Scan"[^{}]*?"Relation Name": "cotizaciones"', 'g')),
    'sort', v_texto ~ '"Node Type": "(Incremental )?Sort"',
    'descartadas', coalesce((select sum(m[1]::numeric) from regexp_matches(v_texto, '"Rows Removed by Filter": (\d+)', 'g') m), 0));
end $$;

create temp table _med (fase text, ruta text, quien text, ms numeric, buffers bigint, indices jsonb, seq boolean, sort boolean, descartadas numeric);
grant all on _med to authenticated;

-- La lectura del historial (`cotizaciones_vehiculo_creado_idx`), con las columnas legibles; la profunda, por el cursor de `aplicarCursor`.
create function pg_temp.preparar() returns void language plpgsql as $$
declare
  v_cols constant text := 'id, numero, origen_id, lead_id, vehiculo_id, creado_por, clase, estado, titulo, total_base, creado_en, actualizado_en';
  v_n constant text := current_setting('medir.pagina');
begin
  execute 'prepare h_pagina(uuid) as select ' || v_cols || ' from public.cotizaciones where vehiculo_id = $1 order by creado_en desc, id desc limit ' || v_n;
  execute 'prepare h_cursor(uuid, timestamptz, uuid) as select ' || v_cols || ' from public.cotizaciones where vehiculo_id = $1 and creado_en <= $2 and (creado_en < $2 or id < $3)'
    || ' order by creado_en desc, id desc limit ' || v_n;
end $$;

create function pg_temp.como(p_quien text) returns void language plpgsql as $$
declare v_id uuid := (select id from _p where clave = p_quien);
begin
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
end $$;

-- Una persona: la página 1 del vehículo caliente y una profunda por cursor (la fila 4.000 de las 5.000).
create function pg_temp.ruta(p_fase text, p_quien text) returns void language plpgsql as $$
declare c record; v_q text; v_m jsonb; v_v uuid := (select id from _v where i = 0);
begin
  perform pg_temp.como(p_quien);
  select * into c from _cur;
  foreach v_q in array array[format('execute h_pagina(%L)', v_v), format('execute h_cursor(%L, %L, %L)', v_v, c.ts, c.id)] loop
    v_m := pg_temp.medir(v_q);
    insert into _med values (p_fase, case when v_q like 'execute h_pagina%' then 'página 1' else 'profunda' end, p_quien, (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint,
      v_m -> 'indices', (v_m ->> 'seq')::boolean, (v_m ->> 'sort')::boolean, (v_m ->> 'descartadas')::numeric);
  end loop;
end $$;

create function pg_temp.fallas(p_fase text, p_indice text) returns text language plpgsql as $$
declare r record; v_fallas text := ''; c_ms constant numeric := 10; c_buf constant bigint := 300;
begin
  for r in select * from _med where fase = p_fase and quien = 'duena' order by ruta loop
    if r.ms > c_ms then v_fallas := v_fallas || format(E'\n  %s · %s: %s ms, el presupuesto es %s', r.fase, r.ruta, round(r.ms, 1), c_ms); end if;
    if r.buffers > c_buf then v_fallas := v_fallas || format(E'\n  %s · %s: %s buffers, el presupuesto es %s', r.fase, r.ruta, r.buffers, c_buf); end if;
    if r.seq then v_fallas := v_fallas || format(E'\n  %s · %s recorre cotizaciones entera', r.fase, r.ruta); end if;
    if r.sort then v_fallas := v_fallas || format(E'\n  %s · %s ordena (Sort)', r.fase, r.ruta); end if;
    if not r.indices ? p_indice then v_fallas := v_fallas || format(E'\n  %s · %s no camina %s: %s', r.fase, r.ruta, p_indice, r.indices); end if;
    -- La profunda descarta la fila del cursor (`creado_en <= $2` es la condición del índice y `(creado_en < $2 or id < $3)` el filtro): una, no crece con N.
    if r.descartadas > 500 then v_fallas := v_fallas || format(E'\n  %s · %s descarta %s filas', r.fase, r.ruta, r.descartadas); end if;
  end loop;
  return v_fallas;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 1: 50.000 cotizaciones; fase 2: 250.000
-- ---------------------------------------------------------------------------------------------------------------------------------
select pg_temp.rellenar(1, 50000);
analyze public.cotizaciones;
-- El cursor profundo: la fila 4.000 del vehículo caliente (como postgres, una vez).
create temp table _cur as select c.creado_en as ts, c.id from public.cotizaciones c where c.vehiculo_id = (select id from _v where i = 0) and c.eliminado_en is null
  order by c.creado_en desc, c.id desc offset 4000 limit 1;
grant select on _cur to authenticated;
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.preparar();
select pg_temp.ruta('50.000', 'duena');
select pg_temp.ruta('50.000', 'ana');
reset role;

select pg_temp.rellenar(50001, 250000);
analyze public.cotizaciones;
do $$ begin
  if (select count(*) from public.cotizaciones) <> 250000 then raise exception 'esperaba 250.000 cotizaciones y hay %', (select count(*) from public.cotizaciones); end if;
  if (select count(*) from public.cotizaciones where vehiculo_id = (select id from _v where i = 0)) <> 5000 then raise exception 'el vehículo caliente debía tener 5.000 cotizaciones'; end if;
end $$;
set local role authenticated;
select pg_temp.ruta('250.000', 'duena');
select pg_temp.ruta('250.000', 'ana');
reset role;

do $$
declare r record; g record; v_fallas text := pg_temp.fallas('50.000', 'cotizaciones_vehiculo_creado_idx') || pg_temp.fallas('250.000', 'cotizaciones_vehiculo_creado_idx');
begin
  for r in select * from _med order by fase, quien, ruta loop
    raise notice 'medicion|Historial del vehículo, % · % · % (ms%)|%', r.fase, r.ruta, r.quien, case r.quien when 'ana' then ', sin assert: crece con las del vehículo' else '' end, round(r.ms, 2);
    raise notice 'medicion|Historial del vehículo, % · % · % (buffers%)|%', r.fase, r.ruta, r.quien, case r.quien when 'ana' then ', sin assert' else '' end, r.buffers;
  end loop;
  for g in select a.ruta, a.ms as ms_50, b.ms as ms_250, a.buffers as b_50, b.buffers as b_250
             from _med a join _med b on b.ruta = a.ruta and b.quien = a.quien and a.fase = '50.000' and b.fase = '250.000' where a.quien = 'duena' loop
    if g.ms_250 > greatest(1.5 * g.ms_50, g.ms_50 + 3) then v_fallas := v_fallas || format(E'\n  %s crece con N: %s ms y %s', g.ruta, round(g.ms_50, 1), round(g.ms_250, 1)); end if;
    if g.b_250 > 1.2 * g.b_50 + 20 then v_fallas := v_fallas || format(E'\n  %s crece con N: %s buffers y %s', g.ruta, g.b_50, g.b_250); end if;
  end loop;
  if v_fallas <> '' then raise exception 'El historial del vehículo rompe su presupuesto:%', v_fallas; end if;
end $$;

-- La guarda: con el índice de antes (sólo `vehiculo_id`), la página ordena las 5.000 del vehículo: tiene que romper los asserts.
drop index public.cotizaciones_vehiculo_creado_idx;
create index cotizaciones_vehiculo_idx on public.cotizaciones (vehiculo_id) where eliminado_en is null;
analyze public.cotizaciones;
set local role authenticated;
deallocate all;
select pg_temp.preparar();
select pg_temp.ruta('antes', 'duena');
reset role;
do $$
declare v_antes text := pg_temp.fallas('antes', 'cotizaciones_vehiculo_idx'); r record;
begin
  for r in select * from _med where fase = 'antes' order by ruta loop
    raise notice 'medicion|Guarda, el índice de antes, 250.000 · % · duena (ms)|%', r.ruta, round(r.ms, 2);
    raise notice 'medicion|Guarda, el índice de antes, 250.000 · % · duena (buffers)|%', r.ruta, r.buffers;
  end loop;
  if v_antes !~ 'página 1' then raise exception 'la guarda no muerde: con el índice de antes la página cumple (fallas:%)', coalesce(nullif(v_antes, ''), ' ninguna'); end if;
end $$;
rollback;
vacuum public.cotizaciones;
