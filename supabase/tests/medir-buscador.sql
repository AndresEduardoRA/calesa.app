-- Medición de `buscador_cotizaciones()` con 50.000 y con 250.000 cotizaciones (paso 7.12-2): `pnpm db:medir:volumen` (sola: `MEDIR_SOLO=medir-buscador`), contra el
-- Supabase LOCAL con la siembra de volumen (la dueña y Ana de `sembrar.sql`). Todo en una transacción que se revierte: vacía la siembra de cotizaciones en ella
-- (`truncate … cascade`) y mide sólo las suyas. Es la única función del buscador que corre como su dueña (definer) con `ilike` sobre una tabla que crece (D9, D18).
--
-- Qué se mide: la llamada entera, como `authenticated` y con el plan genérico (`plan_cache_mode = force_generic_plan`: las consultas de la plpgsql con `v_patron`
-- quedan preparadas y, tras 5 llamadas, Postgres puede pasarlas a genérico), ×7 y la mediana de las 5 últimas. Lo que mide el EXPLAIN de una función es sólo su
-- Function Scan: lo leído sale por relación (`pg_stat_get_xact_blocks_fetched` del heap y cada índice de `cotizaciones`), los recorridos enteros del heap
-- (`pg_stat_get_xact_numscans`) y las llamadas (`pg_stat_xact_user_functions`). Casos: `#<número>` (sólo número, `cotizaciones_numero_key`), «Toyota Hilux» (común:
-- el 10 % de las de la dueña y las 100 de Ana) y «Zafiro único» (raro: 10 de la dueña, entre las más viejas) × la dueña («todos») y Ana («propios», 100 propias fijas).
--
-- Asserta (abajo, con su motivo): ningún recorrido entero; el número por su índice, ≤ 20 bloques y sin crecer con N; lo raro por el GIN y sin crecer con N; lo común
-- sin que crezca el heap (el tope de 1.000 candidatas); Ana a lo sumo 1.000 + n + 1 llamadas a `en_cartera`; un presupuesto de tiempo por caso. La guarda: sin
-- `cotizaciones_titulo_trgm`, «Zafiro único» de la dueña recorre la tabla o lee un heap que crece; si no, «la guarda no muerde».
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.cotizaciones;
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null
select set_config('medir.n', :'por_seccion', true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') or not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000a1') then
    raise exception 'faltan la dueña y Ana de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  if transaction_timestamp() = statement_timestamp() then
    raise exception 'la medición tiene que correr dentro de su begin: vaciar las cotizaciones fuera de una transacción borraría la siembra';
  end if;
  raise notice 'nota|La medición vacía las % cotizaciones de la base en su transacción (se revierte)|', (select count(*) from public.cotizaciones);
  truncate public.cotizaciones cascade;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir el buscador: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres: el origen sembrado `subasta_usa` con su fórmula publicada; las filas sin triggers
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('ana', '00000000-0000-0000-0000-0000000000a1');
create temp table _o as select o.id as origen, f.id as formula from public.origenes o join public.formulas f on f.origen_id = o.id and f.estado = 'publicada' where o.clave = 'subasta_usa';
do $$ begin
  if (select count(*) from _o) <> 1 then raise exception 'esperaba el origen sembrado subasta_usa con su fórmula publicada'; end if;
end $$;
create temp table _rel as
select c.oid, case when c.oid = 'public.cotizaciones'::regclass then 'heap' else c.relname::text end as nombre from pg_class c
 where c.oid = 'public.cotizaciones'::regclass or c.oid in (select indexrelid from pg_index where indrelid = 'public.cotizaciones'::regclass);
create temp table _casos (caso text, quien text, texto text, primary key (caso, quien));
create temp table _med (fase text, caso text, quien text, ms numeric, bloques jsonb, total numeric, seq bigint, llamadas jsonb);
grant select on _p, _o, _rel, _casos to authenticated;
grant insert, select on _med to authenticated;

-- Una fila por (g, quién, título, cuándo): sin triggers, con valores y totales mínimos (el buscador no los lee).
create function pg_temp.insertar(p_desde int, p_hasta int, p_quien text, p_titulo text, p_base timestamptz, p_paso interval) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, creado_en, actualizado_en)
  select o.origen, (select id from _p where clave = p_quien), o.formula, '{}', '{}', '{"oficial": 6.96}', '{"usd": 1}', 1,
         replace(p_titulo, '{g}', g::text), p_base + g * p_paso, p_base + g * p_paso
    from generate_series(p_desde, p_hasta) g cross join _o o;
  set local session_replication_role = origin;
end $$;

-- Las de la dueña g ∈ [desde, hasta], más nuevas cuanto mayor es g: «Toyota Hilux» una de cada diez, el resto «Medir buscador».
create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, creado_en, actualizado_en)
  select o.origen, (select id from _p where clave = 'duena'), o.formula, '{}', '{}', '{"oficial": 6.96}', '{"usd": 1}', 1,
         case when g % 10 = 0 then 'Toyota Hilux ' else 'Medir buscador ' end || g,
         timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds', timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds'
    from generate_series(p_desde, p_hasta) g cross join _o o;
  set local session_replication_role = origin;
end $$;

create function pg_temp.como(p_quien text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', (select id from _p where clave = p_quien)::text, true),
         set_config('request.jwt.claims', json_build_object('sub', (select id from _p where clave = p_quien), 'role', 'authenticated')::text, true);
$$;

-- Una llamada, `p_corridas` veces (las 2 primeras calientan): mediana de ms; promedio de lo leído por relación de `cotizaciones`; recorridos enteros del heap
-- (de todas las corridas) y llamadas a funciones de la última.
create function pg_temp.medir(p_sql text, p_corridas int default 7) returns jsonb language plpgsql as $$
declare
  v_plan jsonb; v_ms numeric[] := '{}'; i int; b0 jsonb; b1 jsonb; l0 jsonb; l1 jsonb; s0 bigint; v_seq bigint := 0; v_suma jsonb := '{}'; v_llam jsonb; k text;
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
    for k in select jsonb_object_keys(b1) loop
      v_suma := v_suma || jsonb_build_object(k, coalesce((v_suma ->> k)::numeric, 0) + (b1 ->> k)::numeric - (b0 ->> k)::numeric);
    end loop;
    select coalesce(jsonb_object_agg(x, coalesce((l1 ->> x)::bigint, 0) - coalesce((l0 ->> x)::bigint, 0)), '{}') into v_llam
      from jsonb_object_keys(l1) x where coalesce((l1 ->> x)::bigint, 0) - coalesce((l0 ->> x)::bigint, 0) > 0;
  end loop;
  return jsonb_build_object('ms', (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m),
                            'bloques', (select jsonb_object_agg(key, round(value::numeric / v_calientes, 1)) from jsonb_each_text(v_suma) where value::numeric > 0),
                            'seq', v_seq, 'llamadas', v_llam);
end $$;

create function pg_temp.fase(p_fase text, p_solo text default null, p_corridas int default 7) returns void language plpgsql as $$
declare c record; m jsonb;
begin
  for c in select * from _casos where p_solo is null or caso || ' · ' || quien = p_solo order by caso, quien loop
    perform pg_temp.como(c.quien);
    m := pg_temp.medir(format('select * from public.buscador_cotizaciones(%L, %s)', c.texto, current_setting('medir.n')), p_corridas);
    insert into _med select p_fase, c.caso, c.quien, (m ->> 'ms')::numeric, coalesce(m -> 'bloques', '{}'),
                            coalesce((select sum(value::numeric) from jsonb_each_text(m -> 'bloques')), 0), (m ->> 'seq')::bigint, m -> 'llamadas';
  end loop;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 1: 50.000 de la dueña, sus 10 «Zafiro único» (las más viejas) y las 100 propias de Ana (fijas: no crecen con N)
-- ---------------------------------------------------------------------------------------------------------------------------------
select pg_temp.rellenar(1, 50000);
select pg_temp.insertar(1, 10, 'duena', 'Zafiro único {g}', timestamptz '2025-01-01 00:00:00+00', interval '1 hour');
select pg_temp.insertar(1, 100, 'ana', 'Toyota Hilux de Ana {g}', timestamptz '2026-01-01 00:00:00+00', interval '5000 seconds');
-- La lista pendiente del GIN (fastupdate) se recorre entera en cada búsqueda y crece con lo insertado desde el último vacuum, que en la nube pasa solo: aquí,
-- donde no hay vacuum dentro de la transacción, se vacía a mano para medir el índice y no el relleno.
select gin_clean_pending_list('public.cotizaciones_titulo_trgm') \g /dev/null
analyze public.cotizaciones;
insert into _casos
select x.caso, q.quien, x.texto from (values
  ('número', '#' || (select numero from public.cotizaciones where titulo = 'Medir buscador 777')),
  ('común', 'Toyota Hilux'),
  ('raro', 'Zafiro único')) x (caso, texto) cross join (values ('duena'), ('ana')) q (quien);
do $$ begin
  if (select count(*) from public.cotizaciones) <> 50110 then raise exception 'esperaba 50.110 cotizaciones'; end if;
  if (select count(*) from _casos where texto is null) > 0 then raise exception 'falta el número de «Medir buscador 777»'; end if;
end $$;
set local track_functions = 'all';
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.fase('50.000');
reset role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 2: 250.000 (200.000 más nuevas de la dueña); Ana sigue con sus 100
-- ---------------------------------------------------------------------------------------------------------------------------------
select pg_temp.rellenar(50001, 250000);
select gin_clean_pending_list('public.cotizaciones_titulo_trgm') \g /dev/null
analyze public.cotizaciones;
set local role authenticated;
select pg_temp.fase('250.000');
reset role;

-- La guarda: sin el GIN del título, «Zafiro único» de la dueña (3 corridas: puede tardar). Se revierte con la transacción.
drop index public.cotizaciones_titulo_trgm;
set local role authenticated;
select pg_temp.fase('guarda', 'raro · duena', 3);
reset role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Lo que se asserta
-- ---------------------------------------------------------------------------------------------------------------------------------
do $$
declare
  r record; v_g record; v_fallas text := ''; v_n constant int := current_setting('medir.n')::int;
  -- Presupuestos (D18): el número son 1 a 3 lecturas por PK; lo raro, el GIN y 10 filas; lo común lee hasta 1.000 candidatas por PK (y Ana, una en_cartera() por cada ajena).
  v_tope_ms constant jsonb := '{"número · duena": 10, "número · ana": 10, "raro · duena": 20, "raro · ana": 20, "común · duena": 150, "común · ana": 300}';
begin
  for r in select * from _med where fase <> 'guarda' order by fase, caso, quien loop
    raise notice 'medicion|Buscador, % · % · % (ms)|%', r.fase, r.caso, r.quien, round(r.ms, 2);
    raise notice 'medicion|Buscador, % · % · % (bloques de cotizaciones)|%', r.fase, r.caso, r.quien, round(r.total, 1);
    raise notice 'nota|% · % · %: bloques por relación % · llamadas %|', r.fase, r.caso, r.quien, r.bloques, r.llamadas;
    if r.seq > 0 then v_fallas := v_fallas || format(E'\n  %s · %s · %s recorre cotizaciones entera (%s veces)', r.fase, r.caso, r.quien, r.seq); end if;
    if r.ms > (v_tope_ms ->> (r.caso || ' · ' || r.quien))::numeric then
      v_fallas := v_fallas || format(E'\n  %s · %s · %s: %s ms, el presupuesto es %s', r.fase, r.caso, r.quien, round(r.ms, 1), v_tope_ms ->> (r.caso || ' · ' || r.quien));
    end if;
    if r.caso = 'número' and (coalesce((r.bloques ->> 'cotizaciones_numero_key')::numeric, 0) = 0 or r.total > 20) then
      v_fallas := v_fallas || format(E'\n  %s · número · %s: debía ir por cotizaciones_numero_key y leer ≤ 20 bloques: %s', r.fase, r.quien, r.bloques);
    end if;
    if r.caso = 'raro' and coalesce((r.bloques ->> 'cotizaciones_titulo_trgm')::numeric, 0) = 0 then
      v_fallas := v_fallas || format(E'\n  %s · raro · %s no leyó cotizaciones_titulo_trgm: %s', r.fase, r.quien, r.bloques);
    end if;
    if r.caso = 'común' and r.quien = 'ana' then
      if coalesce((r.llamadas ->> 'en_cartera')::int, 0) > 1000 + v_n + 1 then
        v_fallas := v_fallas || format(E'\n  %s · común · ana llama a en_cartera %s veces (a lo sumo %s)', r.fase, r.llamadas ->> 'en_cartera', 1000 + v_n + 1);
      end if;
      -- Sus propias, por uno de los dos índices de `creado_por` (el parcial ordenado o el simple, según el plan): sin ellos no las buscó.
      if coalesce((r.bloques ->> 'cotizaciones_creador_idx')::numeric, 0) + coalesce((r.bloques ->> 'cotizaciones_creado_por_idx')::numeric, 0) = 0 then
        v_fallas := v_fallas || format(E'\n  %s · común · ana no buscó sus propias por cotizaciones_creador_idx ni cotizaciones_creado_por_idx: %s', r.fase, r.bloques);
      end if;
    end if;
  end loop;
  -- No crece con N: el número y lo raro, en total y en tiempo; lo común, el heap (el GIN crece con las coincidencias: va como nota, límite declarado).
  for v_g in select a.caso, a.quien, a.ms as ms_chico, b.ms as ms_grande, a.total as bl_chico, b.total as bl_grande,
                    coalesce((a.bloques ->> 'heap')::numeric, 0) as heap_chico, coalesce((b.bloques ->> 'heap')::numeric, 0) as heap_grande,
                    coalesce((a.bloques ->> 'cotizaciones_titulo_trgm')::numeric, 0) as gin_chico, coalesce((b.bloques ->> 'cotizaciones_titulo_trgm')::numeric, 0) as gin_grande
               from _med a join _med b on b.caso = a.caso and b.quien = a.quien and a.fase = '50.000' and b.fase = '250.000' loop
    if v_g.caso in ('número', 'raro') then
      if v_g.bl_grande > 1.2 * v_g.bl_chico + 20 then
        v_fallas := v_fallas || format(E'\n  %s · %s crece con N: %s bloques con 50.000 y %s con 250.000', v_g.caso, v_g.quien, v_g.bl_chico, v_g.bl_grande);
      end if;
      if v_g.ms_grande > greatest(1.5 * v_g.ms_chico, v_g.ms_chico + 3) then
        v_fallas := v_fallas || format(E'\n  %s · %s crece con N: %s ms con 50.000 y %s con 250.000', v_g.caso, v_g.quien, round(v_g.ms_chico, 1), round(v_g.ms_grande, 1));
      end if;
    else
      raise notice 'nota|común · %: el GIN lee % bloques con 50.000 y % con 250.000 (crece con las coincidencias; límite declarado)|', v_g.quien, v_g.gin_chico, v_g.gin_grande;
      if v_g.heap_grande > 1.2 * v_g.heap_chico + 20 then
        v_fallas := v_fallas || format(E'\n  común · %s: el heap crece con N: %s bloques con 50.000 y %s con 250.000', v_g.quien, v_g.heap_chico, v_g.heap_grande);
      end if;
    end if;
  end loop;
  if v_fallas <> '' then raise exception 'buscador_cotizaciones rompe su presupuesto:%', v_fallas; end if;
end $$;

-- La guarda tiene que morder: sin el GIN, lo raro recorre la tabla o lee un heap que crece (contra lo raro con 50.000 y el índice).
do $$
declare g record; v_chico numeric := (select coalesce((bloques ->> 'heap')::numeric, 0) from _med where fase = '50.000' and caso = 'raro' and quien = 'duena');
begin
  select * into g from _med where fase = 'guarda';
  raise notice 'medicion|Buscador, guarda sin cotizaciones_titulo_trgm · raro · duena, 250.000 (ms)|%', round(g.ms, 2);
  raise notice 'medicion|Buscador, guarda sin cotizaciones_titulo_trgm · raro · duena, 250.000 (bloques de cotizaciones)|%', round(g.total, 1);
  raise notice 'nota|guarda: recorridos enteros %, heap % bloques (con el índice y 50.000: %)|', g.seq, coalesce(g.bloques ->> 'heap', '0'), v_chico;
  if g.seq = 0 and coalesce((g.bloques ->> 'heap')::numeric, 0) <= 1.2 * v_chico + 20 then
    raise exception 'la guarda no muerde: sin cotizaciones_titulo_trgm, «Zafiro único» de la dueña no recorre cotizaciones ni lee un heap que crece (%)', g.bloques;
  end if;
end $$;
rollback;
vacuum public.cotizaciones;
