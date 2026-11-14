-- Medición de la cotización aprobada (`cotizaciones_aprobadas`, B4): `pnpm db:medir:volumen`, contra el Supabase LOCAL con la siembra de volumen (la dueña y Ana de
-- `sembrar.sql`; la siembra de cotizaciones trae 50.000 y `_cotizaciones_aprobadas_rellenar()` una aprobada por vehículo cotizado). Todo en una transacción que se revierte.
--
-- Qué se mide:
--   1. Las dos lecturas de la app, de una página de 100 ids como `authenticated` y con el plan genérico (`EXPLAIN (ANALYZE, BUFFERS)` ×7, mediana de las 5 últimas):
--      la lista de vehículos (`where vehiculo_id = any($1)`, por la clave primaria) y el listado y el historial (`where cotizacion_id = any($1)`, por el único). Asserta
--      para la dueña: el índice, sin `Seq Scan` de `cotizaciones_aprobadas`, ≤ 10 ms y ≤ 600 buffers; Ana («propios») se mide y se anota.
--   2. La reposición al confirmar (`_aprobada_reponer()`): sobre un vehículo con 100 y sobre otro con 1.000 cotizaciones, con la aprobada borrada (hay que elegir la más antigua
--      activa): los bloques leídos de `cotizaciones` no crecen con las cotizaciones del vehículo (`cotizaciones_vehiculo_creado_idx` hacia atrás: la primera fila).
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') or not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000a1') then
    raise exception 'faltan la dueña y Ana de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  if (select count(*) from public.cotizaciones_aprobadas) < 1000 then
    raise exception 'la base no trae la siembra de cotizaciones con sus aprobadas: corre pnpm db:sembrar-volumen';
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir la aprobada: %|', current_setting('medir.carga');
end $$;

create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('ana', '00000000-0000-0000-0000-0000000000a1');
create temp table _ids as
  select array_agg(vehiculo_id) as vehiculos, array_agg(cotizacion_id) as cotizaciones
    from (select vehiculo_id, cotizacion_id from public.cotizaciones_aprobadas order by vehiculo_id limit 100) x;
grant select on _p, _ids to authenticated;

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
    'seq', exists (select 1 from regexp_matches(v_texto, '"Node Type": "Seq Scan"[^{}]*?"Relation Name": "cotizaciones_aprobadas"', 'g')));
end $$;

create temp table _med (ruta text, quien text, ms numeric, buffers bigint, indices jsonb, seq boolean, filas integer);
grant all on _med to authenticated;

create function pg_temp.como(p_quien text) returns void language plpgsql as $$
declare v_id uuid := (select id from _p where clave = p_quien);
begin
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
end $$;

create function pg_temp.preparar() returns void language plpgsql as $$
begin
  execute 'prepare a_vehiculos(uuid[]) as select vehiculo_id, cotizacion_id, monto::text, moneda from public.cotizaciones_aprobadas where vehiculo_id = any($1) limit 100';  -- clave primaria
  execute 'prepare a_cotizaciones(uuid[]) as select vehiculo_id, cotizacion_id, monto::text, moneda from public.cotizaciones_aprobadas where cotizacion_id = any($1) limit 100';  -- único de cotizacion_id
end $$;

create function pg_temp.ruta(p_quien text) returns void language plpgsql as $$
declare v_m jsonb; v_q text; v_n integer; v_nombre text;
begin
  perform pg_temp.como(p_quien);
  foreach v_nombre in array array['vehiculos', 'cotizaciones'] loop
    v_q := format('execute a_%s(%L)', v_nombre, (select case v_nombre when 'vehiculos' then vehiculos else cotizaciones end from _ids));
    v_m := pg_temp.medir(v_q);
    execute format('select count(*) from public.cotizaciones_aprobadas where %s = any(%L)', case v_nombre when 'vehiculos' then 'vehiculo_id' else 'cotizacion_id' end,
                   (select case v_nombre when 'vehiculos' then vehiculos else cotizaciones end from _ids)) into v_n;
    insert into _med values (v_nombre, p_quien, (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint, v_m -> 'indices', (v_m ->> 'seq')::boolean, v_n);
  end loop;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.preparar();
select pg_temp.ruta('duena');
select pg_temp.ruta('ana');
reset role;

-- La reposición: un vehículo con 100 y otro con 1.000 cotizaciones, sin su aprobada; los bloques leídos de `cotizaciones` no crecen.
create temp table _rep (n integer primary key, vehiculo uuid not null, bloques bigint);
do $$
declare
  v_o uuid; v_f uuid; v_n integer; v_v uuid; v_antes bigint; v_despues bigint; v_snap record;
begin
  select o.id, f.id into v_o, v_f from public.origenes o join public.formulas f on f.origen_id = o.id and f.estado = 'publicada' where o.clave = 'subasta_usa';
  select c.valores, c.fuentes, c.tipos_cambio into v_snap from public.cotizaciones c where c.origen_id = v_o limit 1;
  foreach v_n in array array[100, 1000] loop
    set local session_replication_role = replica;
    insert into public.vehiculos (origen_id, titulo, creado_por) values (v_o, 'Medir aprobada ' || v_n, '00000000-0000-0000-0000-0000000000d1') returning id into v_v;
    insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, creado_en, actualizado_en)
    select v_o, '00000000-0000-0000-0000-0000000000d1', v_f, v_v, v_snap.valores, v_snap.fuentes, v_snap.tipos_cambio, '{"usd": 1234.5}', 1234.5, 'Aprobada ' || g,
           timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds', timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds'
      from generate_series(1, v_n) g;
    set local session_replication_role = origin;
    analyze public.cotizaciones;
    select coalesce(sum(pg_stat_get_xact_blocks_fetched(c.oid)), 0) into v_antes from pg_class c where c.oid = 'public.cotizaciones'::regclass;
    perform public._aprobada_reponer(v_v);
    select coalesce(sum(pg_stat_get_xact_blocks_fetched(c.oid)), 0) into v_despues from pg_class c where c.oid = 'public.cotizaciones'::regclass;
    if (select cotizacion_id from public.cotizaciones_aprobadas where vehiculo_id = v_v) is distinct from
       (select id from public.cotizaciones where vehiculo_id = v_v order by creado_en, id limit 1) then
      raise exception 'la reposición de % cotizaciones no eligió la más antigua', v_n;
    end if;
    insert into _rep values (v_n, v_v, v_despues - v_antes);
  end loop;
end $$;

do $$
declare r record; v_fallas text := ''; c_ms constant numeric := 10; c_buf constant bigint := 600;
begin
  for r in select * from _med order by ruta, quien loop
    raise notice 'medicion|Aprobada, % · % (ms%)|%', r.ruta, r.quien, case r.quien when 'ana' then ', sin assert' else '' end, round(r.ms, 2);
    raise notice 'medicion|Aprobada, % · % (buffers%)|%', r.ruta, r.quien, case r.quien when 'ana' then ', sin assert' else '' end, r.buffers;
    if r.seq then v_fallas := v_fallas || format(E'\n  %s · %s recorre cotizaciones_aprobadas entera', r.ruta, r.quien); end if;
    if r.quien = 'duena' then
      if r.ms > c_ms then v_fallas := v_fallas || format(E'\n  %s: %s ms, el presupuesto es %s', r.ruta, round(r.ms, 1), c_ms); end if;
      if r.buffers > c_buf then v_fallas := v_fallas || format(E'\n  %s: %s buffers, el presupuesto es %s', r.ruta, r.buffers, c_buf); end if;
      if r.filas <> 100 then v_fallas := v_fallas || format(E'\n  %s: esperaba 100 filas y son %s', r.ruta, r.filas); end if;
      if not r.indices ? (case r.ruta when 'vehiculos' then 'cotizaciones_aprobadas_pkey' else 'cotizaciones_aprobadas_cotizacion_id_key' end) then
        v_fallas := v_fallas || format(E'\n  %s no camina su índice: %s', r.ruta, r.indices);
      end if;
    end if;
  end loop;
  for r in select * from _rep order by n loop
    raise notice 'medicion|Aprobada, reponer con % cotizaciones (bloques de cotizaciones)|%', r.n, r.bloques;
  end loop;
  if (select bloques from _rep where n = 1000) > (select bloques from _rep where n = 100) * 1.2 + 10 then
    v_fallas := v_fallas || format(E'\n  reponer crece con las cotizaciones del vehículo: %s bloques con 100 y %s con 1.000',
                                   (select bloques from _rep where n = 100), (select bloques from _rep where n = 1000));
  end if;
  if v_fallas <> '' then raise exception 'La cotización aprobada rompe su presupuesto:%', v_fallas; end if;
end $$;
rollback;
