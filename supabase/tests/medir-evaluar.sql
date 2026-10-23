-- Medición de cotizacion_evaluar() con 50.000 y con 250.000 cotizaciones (paso 4.06, prompt 2): `pnpm db:medir:volumen`, contra el
-- Supabase LOCAL con la siembra de volumen (la dueña de `sembrar.sql`). Todo en una transacción que se revierte.
--
-- Qué se mide: 200 llamadas seguidas (tras 10 de calentamiento), cada una cronometrada, como `authenticated` (con el permiso que sólo
-- esta transacción le da: hasta el 4.10 nadie más lo tiene) y con el plan genérico (`plan_cache_mode = force_generic_plan`: lo que usa
-- plpgsql tras unas llamadas), en cuatro casos:
--   1. la fórmula del seed (`subasta_usa`), por origen;
--   2. la misma, por una cotización (su fórmula, sus tipos de cambio congelados y su vehículo);
--   3. una sintética de 200 nodos con 4 tablas vivas de 1.000 filas (`corpus-del-motor.json` › `sinteticas`), por origen;
--   4. la misma, por una cotización.
-- Por separado y en cada caso: la llamada entera, ARMAR (`_cotizacion_armar`: leer la fórmula, las tablas, los tipos de cambio y el
-- vehículo) y EVALUAR (`evaluar_formula()` sobre lo armado), en ms (mediana y p95) y en buffers de UNA llamada (EXPLAIN, ya caliente).
--
-- El terreno: el seed no trae filas de `transporte_por_ruta` (lo arregla el 4.08): esta prueba siembra las suyas. Además, lo que una
-- mala lectura pagaría: 20 tablas que ningún nodo nombra en el origen de la sintética (20.000 filas) y 50 orígenes con tablas de las
-- mismas claves (200.000 filas). Y las cotizaciones: 50.000 y, después, 250.000.
--
-- Asserta:
--   - la fórmula del seed: mediana ≤ 10 ms y p95 ≤ 20 ms; la sintética: p95 ≤ 50 ms (los topes del plan, 4.06; ninguno se sube);
--   - que no crece con las cotizaciones: con 250.000 el p95 es a lo sumo 1,5 veces el de 50.000 (con un piso de 3 ms de ruido) y los
--     bloques que la llamada toca de `cotizaciones` (su heap, sus índices y su TOAST: `pg_stat_get_xact_blocks_fetched`) son CERO por
--     origen, y por cotización a lo sumo dos veces lo que cuesta buscar una cotización por su clave (la función la busca dos veces: el
--     permiso y la lectura), con el índice que haya. Los buffers totales de la llamada van como dato, no como assert: incluyen las
--     tablas de permisos, que el autovacuum encoge o no a mitad de una corrida (138 y 178 buffers en dos fases de la misma corrida);
--   - las guardas de escala: ARMAR lee a lo sumo las páginas que ocupan las filas de las tablas nombradas más una constante, y dos
--     versiones malas (una que lee todas las tablas del origen y otra que lee las filas de todos los orígenes) tienen que caer.
-- Cada línea `medicion|…|número` sale por el runner (`scripts/medir-listado.mjs`); las `nota|…`, también.
\set ON_ERROR_STOP 1
begin;

-- El terreno: la dueña de la siembra de volumen.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true) \g /dev/null
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}', true) \g /dev/null
do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') then
    raise exception 'falta la dueña de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  if (select count(*) from public.cotizaciones) > 0 then
    raise exception 'la base ya trae cotizaciones: la medición cuenta con 50.000 y 250.000 propias (pnpm db:reset)';
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las funciones de medición. Corren como quien las llama (authenticated).
-- ---------------------------------------------------------------------------------------------------------------------------------
create function pg_temp.estadistica(p_ms numeric[]) returns table (mediana numeric, p95 numeric, maximo numeric) language sql as $$
  select (percentile_cont(0.5) within group (order by x))::numeric, (percentile_disc(0.95) within group (order by x))::numeric, max(x)
    from unnest(p_ms) x
$$;

-- Las 200 llamadas (más 10 de calentamiento): 'total' es cotizacion_evaluar(), 'armar' es _cotizacion_armar() y 'evaluar' es
-- evaluar_formula() sobre lo que armó.
create function pg_temp.corrida(p_que text, p_entradas jsonb, p_cot uuid, p_origen uuid, p_veh uuid, p_n int default 200)
returns numeric[] language plpgsql as $$
declare
  v_ms numeric[] := '{}';
  v_def jsonb; v_par jsonb; v_ent jsonb;
  t0 timestamptz;
  i int;
begin
  if p_que = 'evaluar' then
    select a.definicion, a.params, a.entrada into v_def, v_par, v_ent from public._cotizacion_armar(p_entradas, p_cot, p_origen, p_veh) a;
  end if;
  for i in 1 .. p_n + 10 loop
    t0 := clock_timestamp();
    if p_que = 'total' then perform public.cotizacion_evaluar(p_entradas, p_cot, p_origen, p_veh);
    elsif p_que = 'armar' then perform a.definicion from public._cotizacion_armar(p_entradas, p_cot, p_origen, p_veh) a;
    else perform public.evaluar_formula(v_def, v_par, v_ent);
    end if;
    if i > 10 then v_ms := v_ms || (extract(epoch from clock_timestamp() - t0) * 1000)::numeric; end if;
  end loop;
  return v_ms;
end $$;

-- Los buffers de UNA llamada (ya caliente): lo que el EXPLAIN cuenta en el nodo de arriba, aciertos y lecturas.
create function pg_temp.buffers(p_sql text) returns bigint language plpgsql as $$
declare v_plan jsonb;
begin
  execute 'explain (analyze, buffers, format json) ' || p_sql into v_plan;
  return coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Hit Blocks')::bigint, 0) + coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Read Blocks')::bigint, 0);
end $$;

create temp table _med (caso text, cotizaciones int, total_mediana numeric, total_p95 numeric, armar_mediana numeric, armar_p95 numeric,
                        evaluar_mediana numeric, evaluar_p95 numeric, buf_total bigint, buf_armar bigint, bloques_cot bigint, bloques_clave bigint);
grant all on _med to authenticated;

-- Los bloques que esta transacción ha pedido de `cotizaciones`: su heap, sus índices y su TOAST. Un delta alrededor de una llamada dice
-- cuánto lee de lo único que crece con las cotizaciones, sin las tablas de permisos ni de fórmulas.
create function pg_temp.bloques_cotizaciones() returns bigint language sql as $$
  select coalesce(sum(pg_stat_get_xact_blocks_fetched(r.oid)), 0)::bigint
    from (select 'public.cotizaciones'::regclass::oid as oid
          union all select indexrelid from pg_index where indrelid = 'public.cotizaciones'::regclass
          union all select reltoastrelid from pg_class where oid = 'public.cotizaciones'::regclass and reltoastrelid <> 0) r
$$;

-- Un caso: mide, anota y asserta los topes de tiempo. `p_mediana` y `p_p95` en ms (null = sin tope).
create function pg_temp.caso(p_caso text, p_n int, p_entradas jsonb, p_cot uuid, p_origen uuid, p_veh uuid, p_mediana numeric, p_p95 numeric)
returns void language plpgsql as $$
declare
  v_t record; v_a record; v_e record; v_btotal bigint; v_barmar bigint; v_bcot bigint; v_bclave bigint; v_antes bigint; v_id uuid; v_pref text;
begin
  v_pref := format('cotizacion_evaluar, %s, con %s cotizaciones', p_caso, replace(to_char(p_n, 'FM999G999'), ',', '.'));
  select * into v_t from pg_temp.estadistica(pg_temp.corrida('total', p_entradas, p_cot, p_origen, p_veh));
  select * into v_a from pg_temp.estadistica(pg_temp.corrida('armar', p_entradas, p_cot, p_origen, p_veh));
  select * into v_e from pg_temp.estadistica(pg_temp.corrida('evaluar', p_entradas, p_cot, p_origen, p_veh));
  v_btotal := pg_temp.buffers(format('select public.cotizacion_evaluar(%L::jsonb, %L::uuid, %L::uuid, %L::uuid)', p_entradas, p_cot, p_origen, p_veh));
  v_barmar := pg_temp.buffers(format('select a.definicion from public._cotizacion_armar(%L::jsonb, %L::uuid, %L::uuid, %L::uuid) a', p_entradas, p_cot, p_origen, p_veh));
  -- Lo que la llamada pide de `cotizaciones` (ya caliente), y lo que cuesta buscar una cotización por su clave en el índice que hoy tiene.
  v_antes := pg_temp.bloques_cotizaciones();
  perform public.cotizacion_evaluar(p_entradas, p_cot, p_origen, p_veh);
  v_bcot := pg_temp.bloques_cotizaciones() - v_antes;
  v_id := coalesce(p_cot, (select id from public.cotizaciones limit 1));
  v_antes := pg_temp.bloques_cotizaciones();
  perform c.id from public.cotizaciones c where c.id = v_id;
  v_bclave := pg_temp.bloques_cotizaciones() - v_antes;
  raise notice 'medicion|% ›  la llamada entera, mediana (ms)|%', v_pref, round(v_t.mediana, 2);
  raise notice 'medicion|% ›  la llamada entera, p95 (ms)|%', v_pref, round(v_t.p95, 2);
  raise notice 'medicion|% ›  ARMAR, mediana (ms)|%', v_pref, round(v_a.mediana, 2);
  raise notice 'medicion|% ›  ARMAR, p95 (ms)|%', v_pref, round(v_a.p95, 2);
  raise notice 'medicion|% ›  EVALUAR, mediana (ms)|%', v_pref, round(v_e.mediana, 2);
  raise notice 'medicion|% ›  EVALUAR, p95 (ms)|%', v_pref, round(v_e.p95, 2);
  raise notice 'medicion|% ›  la llamada entera (buffers de una llamada)|%', v_pref, v_btotal;
  raise notice 'medicion|% ›  ARMAR (buffers de una llamada)|%', v_pref, v_barmar;
  raise notice 'medicion|% ›  bloques de cotizaciones que toca la llamada|%', v_pref, v_bcot;
  raise notice 'medicion|% ›  bloques de cotizaciones al buscar una por su clave|%', v_pref, v_bclave;
  insert into _med values (p_caso, p_n, v_t.mediana, v_t.p95, v_a.mediana, v_a.p95, v_e.mediana, v_e.p95, v_btotal, v_barmar, v_bcot, v_bclave);
  if p_mediana is not null and v_t.mediana > p_mediana then
    raise exception '% tiene una mediana de % ms y el tope es % ms', v_pref, round(v_t.mediana, 2), p_mediana;
  end if;
  if p_p95 is not null and v_t.p95 > p_p95 then
    raise exception '% tiene un p95 de % ms y el tope es % ms', v_pref, round(v_t.p95, 2), p_p95;
  end if;
end $$;
grant execute on function pg_temp.estadistica(numeric[]), pg_temp.corrida(text, jsonb, uuid, uuid, uuid, int), pg_temp.buffers(text),
  pg_temp.caso(text, int, jsonb, uuid, uuid, uuid, numeric, numeric) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno (como la base: sin los triggers, que no son lo que se mide).
-- ---------------------------------------------------------------------------------------------------------------------------------
set local session_replication_role = replica;

-- 1) La fórmula del seed: sus filas de transporte (el seed no las trae) y un vehículo con lo que sus tablas leen.
do $$
declare v_origen uuid := (select id from public.origenes where clave = 'subasta_usa'); v_tabla uuid;
begin
  select id into v_tabla from public.tablas_referencia where origen_id = v_origen and clave = 'transporte_por_ruta';
  if v_tabla is null then raise exception 'falta la tabla transporte_por_ruta del seed'; end if;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden)
    select v_tabla, jsonb_build_object('ruta', 'Ruta ' || g, 'precio', 100 + g), g from generate_series(0, 38) g;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden)
    values (v_tabla, '{"ruta": "Miami (FL)", "precio": 1100}', 39);
  insert into public.vehiculos (origen_id, titulo, anio, atributos, creado_por)
    values (v_origen, 'Medir evaluar, seed', 2023, '{"tipo_vehiculo": "automovil", "ubicacion": "Miami (FL)"}', '00000000-0000-0000-0000-0000000000d1');
end $$;

-- 2) La sintética: su origen, su fórmula, sus 4 tablas de 1.000 filas, 20 tablas que nadie nombra y su vehículo.
create temp table _sint as
  select doc -> 'con_tablas_en_la_base' as s from _sinteticas_del_motor;
do $$
declare v_origen uuid; v_s jsonb := (select s from _sint);
begin
  if jsonb_array_length(v_s -> 'definicion' -> 'nodos') <> 200 or (select count(*) from jsonb_object_keys(v_s -> 'entrada' -> 'tablas')) <> 4 then
    raise exception 'la sintética no tiene 200 nodos y 4 tablas';
  end if;
  insert into public.origenes (clave, nombre, tipo) values ('medir_evaluar_sint', 'Medir evaluar, sintética', 'manual') returning id into v_origen;
  insert into public.origenes_campos (origen_id, clave, etiqueta, tipo) values (v_origen, 'clase', 'Clase', 'texto');
  insert into public.formulas (origen_id, version, estado, definicion, params)
    values (v_origen, 1, 'publicada', v_s -> 'definicion', v_s -> 'params');
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) select v_origen, k, k, '[]' from jsonb_object_keys(v_s -> 'entrada' -> 'tablas') k;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden)
    select t.id, f.value, (f.ordinality - 1)::smallint
      from jsonb_each(v_s -> 'entrada' -> 'tablas') e
      join public.tablas_referencia t on t.origen_id = v_origen and t.clave = e.key
      cross join lateral jsonb_array_elements(e.value) with ordinality f (value, ordinality);
  -- Las que ningún nodo nombra.
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) select v_origen, 'ruido_' || g, 'Ruido ' || g, '[]' from generate_series(1, 20) g;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden)
    select t.id, jsonb_build_object('clase', 'c' || i, 'v', i), i from public.tablas_referencia t cross join generate_series(0, 999) i
     where t.origen_id = v_origen and t.clave like 'ruido\_%';
  -- Los tipos de cambio de la sintética: oficial 6,96 (el del seed) y paralelo 10.
  update public.tipos_cambio set valor = (v_s -> 'entrada' -> 'tipos_cambio' ->> 'paralelo')::numeric where clave = 'paralelo';
  insert into public.vehiculos (origen_id, titulo, anio, atributos, creado_por)
    values (v_origen, 'Medir evaluar, sintética', (v_s -> 'entrada' -> 'vehiculo' ->> 'anio')::int,
            jsonb_build_object('clase', v_s -> 'entrada' -> 'vehiculo' -> 'clase'), '00000000-0000-0000-0000-0000000000d1');
end $$;

-- 3) Lo ajeno: 50 orígenes con tablas de las mismas claves (t1 a t4) y 1.000 filas cada una.
insert into public.origenes (clave, nombre, tipo) select 'medir_evaluar_ajeno_' || g, 'Medir evaluar, ajeno ' || g, 'manual' from generate_series(1, 50) g;
insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
  select o.id, 't' || k, 'T' || k, '[]' from public.origenes o cross join generate_series(1, 4) k where o.clave like 'medir\_evaluar\_ajeno\_%';
insert into public.tablas_referencia_filas (tabla_id, valores, orden)
  select t.id, jsonb_build_object('clase', 'c' || i, 'v', i + 1000000), i
    from public.tablas_referencia t cross join generate_series(0, 999) i
   where t.origen_id in (select id from public.origenes where clave like 'medir\_evaluar\_ajeno\_%');

-- Dos cotizaciones para medir por cotización (cada una con su fórmula, su vehículo y sus tipos de cambio congelados).
create temp table _ids (clave text primary key, id uuid);
insert into _ids
  select 'origen_seed', id from public.origenes where clave = 'subasta_usa'
  union all select 'origen_sint', id from public.origenes where clave = 'medir_evaluar_sint'
  union all select 'formula_seed', f.id from public.formulas f join public.origenes o on o.id = f.origen_id where o.clave = 'subasta_usa' and f.estado = 'publicada'
  union all select 'formula_sint', f.id from public.formulas f join public.origenes o on o.id = f.origen_id where o.clave = 'medir_evaluar_sint'
  union all select 'veh_seed', id from public.vehiculos where titulo = 'Medir evaluar, seed'
  union all select 'veh_sint', id from public.vehiculos where titulo = 'Medir evaluar, sintética';
insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, valores, tipos_cambio, totales, total_base, titulo)
  values ((select id from _ids where clave = 'origen_seed'), '00000000-0000-0000-0000-0000000000d1', (select id from _ids where clave = 'formula_seed'),
          (select id from _ids where clave = 'veh_seed'), '{}', '{"oficial": 6.96, "paralelo": 12.4}', '{}', 0, 'Medir evaluar, seed');
insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, valores, tipos_cambio, totales, total_base, titulo)
  values ((select id from _ids where clave = 'origen_sint'), '00000000-0000-0000-0000-0000000000d1', (select id from _ids where clave = 'formula_sint'),
          (select id from _ids where clave = 'veh_sint'), '{}', '{"oficial": 6.96, "paralelo": 10}', '{}', 0, 'Medir evaluar, sintética');
insert into _ids select 'cot_seed', id from public.cotizaciones where titulo = 'Medir evaluar, seed';
insert into _ids select 'cot_sint', id from public.cotizaciones where titulo = 'Medir evaluar, sintética';

-- Cotizaciones de relleno: mitad de cada fórmula, de la dueña.
create function pg_temp.rellenar(p_n int) returns void language sql as $$
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo)
    select case when g % 2 = 0 then (select id from _ids where clave = 'origen_seed') else (select id from _ids where clave = 'origen_sint') end,
           '00000000-0000-0000-0000-0000000000d1',
           case when g % 2 = 0 then (select id from _ids where clave = 'formula_seed') else (select id from _ids where clave = 'formula_sint') end,
           '{"total": 1234.5}', '{}', '{"oficial": 6.96, "paralelo": 12.4}', '{"total_base": 1234.5}', 1234.5, 'Relleno ' || g
      from generate_series(1, p_n) g
$$;

-- Los argumentos de la persona: lo que tipea.
create temp table _entradas as select
  '{"inputs": {"remate": 10000, "grua": 300}, "banderas": {"es_hibrido": true}}'::jsonb as seed,
  (select jsonb_build_object('inputs', s -> 'entrada' -> 'inputs', 'banderas', s -> 'entrada' -> 'banderas', 'overrides', s -> 'entrada' -> 'overrides') from _sint) as sint;
grant select on _entradas, _ids, _sint to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las mediciones, con 50.000 y con 250.000 cotizaciones.
-- ---------------------------------------------------------------------------------------------------------------------------------
-- Hasta el 4.10 nadie ejecuta estas funciones: el permiso vale sólo dentro de esta transacción.
grant execute on function public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb), public._cotizacion_armar(jsonb, uuid, uuid, uuid) to authenticated;

-- 50.000 cotizaciones (las dos de arriba y 49.998 de relleno).
select pg_temp.rellenar(49998) \g /dev/null
analyze public.cotizaciones;
analyze public.tablas_referencia;
analyze public.tablas_referencia_filas;
\set carga `cat /proc/loadavg`
select set_config('medir.carga', :'carga', true) \g /dev/null
do $$ begin
  if (select count(*) from public.cotizaciones) <> 50000 then raise exception 'no hay 50.000 cotizaciones'; end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir con 50.000 cotizaciones: %|', current_setting('medir.carga');
end $$;
set local session_replication_role = origin;
set local role authenticated;
set local plan_cache_mode = force_generic_plan;
do $$
declare
  v_res jsonb;
  o_seed uuid := (select id from _ids where clave = 'origen_seed'); o_sint uuid := (select id from _ids where clave = 'origen_sint');
  v_seed uuid := (select id from _ids where clave = 'veh_seed'); v_sint uuid := (select id from _ids where clave = 'veh_sint');
begin
  if current_user <> 'authenticated' then raise exception 'la medición corre como %, no como authenticated', current_user; end if;
  -- Una medición de algo que falla no mide nada: las dos fórmulas evalúan sin faltantes y la sintética da lo de evaluar_formula().
  v_res := public.cotizacion_evaluar((select seed from _entradas), null, o_seed, v_seed);
  if jsonb_array_length(v_res -> 'faltantes') <> 0 then raise exception 'la fórmula del seed da faltantes: %', v_res -> 'faltantes'; end if;
  if v_res -> 'valores' -> 'total' = 'null'::jsonb then raise exception 'la fórmula del seed no tiene total: %', v_res -> 'valores'; end if;
  v_res := public.cotizacion_evaluar((select sint from _entradas), null, o_sint, v_sint);
  if jsonb_array_length(v_res -> 'faltantes') <> 0 then raise exception 'la sintética da faltantes: %', v_res -> 'faltantes'; end if;
  if v_res <> public.evaluar_formula((select s -> 'definicion' from _sint), (select s -> 'params' from _sint), (select s -> 'entrada' from _sint)) then
    raise exception 'la sintética por la base da otra cosa que evaluar_formula() con su entrada';
  end if;
  -- Los tres topes de tiempo del plan: la fórmula del seed (mediana ≤ 10 ms, p95 ≤ 20 ms) y la sintética (p95 ≤ 50 ms).
  perform pg_temp.caso('fórmula del seed por origen', 50000, (select seed from _entradas), null, o_seed, v_seed, 10, 20);
  perform pg_temp.caso('fórmula del seed por cotización', 50000, (select seed from _entradas), (select id from _ids where clave = 'cot_seed'), null, null, 10, 20);
  perform pg_temp.caso('sintética de 200 nodos y 4 tablas de 1.000 filas por origen', 50000, (select sint from _entradas), null, o_sint, v_sint, null, 50);
  perform pg_temp.caso('sintética de 200 nodos y 4 tablas de 1.000 filas por cotización', 50000, (select sint from _entradas), (select id from _ids where clave = 'cot_sint'), null, null, null, 50);
end $$;
reset role;

-- 250.000 cotizaciones (200.000 más).
set local session_replication_role = replica;
select pg_temp.rellenar(200000) \g /dev/null
analyze public.cotizaciones;
\set carga `cat /proc/loadavg`
select set_config('medir.carga', :'carga', true) \g /dev/null
do $$ begin
  if (select count(*) from public.cotizaciones) <> 250000 then raise exception 'no hay 250.000 cotizaciones'; end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir con 250.000 cotizaciones: %|', current_setting('medir.carga');
end $$;
set local session_replication_role = origin;
set local role authenticated;
set local plan_cache_mode = force_generic_plan;
do $$
declare
  o_seed uuid := (select id from _ids where clave = 'origen_seed'); o_sint uuid := (select id from _ids where clave = 'origen_sint');
  v_seed uuid := (select id from _ids where clave = 'veh_seed'); v_sint uuid := (select id from _ids where clave = 'veh_sint');
begin
  perform pg_temp.caso('fórmula del seed por origen', 250000, (select seed from _entradas), null, o_seed, v_seed, 10, 20);
  perform pg_temp.caso('fórmula del seed por cotización', 250000, (select seed from _entradas), (select id from _ids where clave = 'cot_seed'), null, null, 10, 20);
  perform pg_temp.caso('sintética de 200 nodos y 4 tablas de 1.000 filas por origen', 250000, (select sint from _entradas), null, o_sint, v_sint, null, 50);
  perform pg_temp.caso('sintética de 200 nodos y 4 tablas de 1.000 filas por cotización', 250000, (select sint from _entradas), (select id from _ids where clave = 'cot_sint'), null, null, null, 50);
end $$;
reset role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- No crece con las cotizaciones: en razón y en bloques de `cotizaciones`.
-- ---------------------------------------------------------------------------------------------------------------------------------
do $$
declare
  c record; v_tope bigint;
begin
  for c in
    select a.caso, a.total_p95 as p95_chico, b.total_p95 as p95_grande, a.total_mediana as med_chica, b.total_mediana as med_grande,
           a.buf_total as buf_chico, b.buf_total as buf_grande, a.bloques_cot as cot_chico, b.bloques_cot as cot_grande,
           a.bloques_clave as clave_chica, b.bloques_clave as clave_grande
      from _med a join _med b on b.caso = a.caso and b.cotizaciones = 250000 where a.cotizaciones = 50000
  loop
    raise notice 'medicion|cotizacion_evaluar, % ›  p95 con 250.000 sobre p95 con 50.000 (veces)|%', c.caso, round(c.p95_grande / nullif(c.p95_chico, 0), 2);
    raise notice 'medicion|cotizacion_evaluar, % ›  mediana con 250.000 sobre mediana con 50.000 (veces)|%', c.caso, round(c.med_grande / nullif(c.med_chica, 0), 2);
    raise notice 'medicion|cotizacion_evaluar, % ›  buffers totales con 250.000 menos con 50.000 (con el ruido de las tablas de permisos)|%', c.caso, c.buf_grande - c.buf_chico;
    -- En razón: a lo sumo 1,5 veces, con un piso de 3 ms (el p95 de 200 llamadas de un caso de 1 ms es ruido).
    if c.p95_grande > greatest(1.5 * c.p95_chico, c.p95_chico + 3) then
      raise exception '% con 250.000 cotizaciones tiene un p95 de % ms contra % ms con 50.000: crece con las cotizaciones', c.caso, c.p95_grande, c.p95_chico;
    end if;
    -- En bloques de `cotizaciones`: por origen, ninguno; por cotización, las dos búsquedas por clave (el permiso y la lectura) con el
    -- índice que haya, y nada más: ni una cotización de más.
    v_tope := case when c.caso like '%por origen' then 0 else 2 * c.clave_grande end;
    if c.cot_grande > v_tope then
      raise exception '% toca % bloques de cotizaciones con 250.000 y el tope es % (con 50.000 tocaba %)', c.caso, c.cot_grande, v_tope, c.cot_chico;
    end if;
    v_tope := case when c.caso like '%por origen' then 0 else 2 * c.clave_chica end;
    if c.cot_chico > v_tope then
      raise exception '% toca % bloques de cotizaciones con 50.000 y el tope es %', c.caso, c.cot_chico, v_tope;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las guardas de escala: ARMAR lee a lo sumo las páginas de las filas de las tablas que la fórmula nombra, y dos versiones malas caen.
-- ---------------------------------------------------------------------------------------------------------------------------------
-- El tope sale de lo que las tablas nombradas ocupan: las páginas del heap de sus filas (contadas por `ctid`), la bajada y las hojas del
-- índice de cada tabla (3 niveles y una hoja por cada 150 filas) y el costo fijo de armar (la fórmula, los permisos, los tipos de cambio y el
-- vehículo: lo que ARMAR de la fórmula del seed lee con 4 tablas casi vacías, medido en este momento), todo con un 20 % de margen.
-- La función de verdad queda a un 85 % del tope; leer una tabla más del origen, o las filas de otros orígenes, lo pasa por mucho.
do $$
declare
  v_sint uuid := (select id from _ids where clave = 'origen_sint');
  v_veh uuid := (select id from _ids where clave = 'veh_sint');
  v_sql text; v_sql_seed text; v_filas bigint; v_paginas bigint; v_fijo bigint; v_tope bigint; v_real bigint; v_def text; v_malo text; v_b bigint; v_nombre text;
  v_malas text[][] := array[
    ['a', 'lee todas las tablas del origen y no las que la fórmula nombra', 'from unnest(v_vivas) c (clave)',
     'from (select r.clave from public.tablas_referencia r where r.origen_id = v_origen) c (clave)'],
    ['b', 'lee las filas de todos los orígenes con esa clave', 'from public.tablas_referencia_filas f where f.tabla_id = t.id and f.activa',
     'from public.tablas_referencia_filas f where f.tabla_id in (select r.id from public.tablas_referencia r where r.clave = c.clave) and f.activa']];
  i int;
begin
  v_sql := format('select a.definicion from public._cotizacion_armar(%L::jsonb, null, %L::uuid, %L::uuid) a', (select sint from _entradas), v_sint, v_veh);
  v_sql_seed := format('select a.definicion from public._cotizacion_armar(%L::jsonb, null, %L::uuid, %L::uuid) a', (select seed from _entradas),
                       (select id from _ids where clave = 'origen_seed'), (select id from _ids where clave = 'veh_seed'));
  select count(*), count(distinct (f.ctid::text::point)[0]::bigint) into v_filas, v_paginas
    from public.tablas_referencia_filas f join public.tablas_referencia t on t.id = f.tabla_id
   where t.origen_id = v_sint and t.clave = any (array['t1', 't2', 't3', 't4']);
  -- El costo fijo, medido ahora (los permisos pesan distinto según cuán encogidas estén sus tablas): ARMAR de la fórmula del seed.
  perform pg_temp.buffers(v_sql_seed);
  v_fijo := pg_temp.buffers(v_sql_seed);
  v_tope := ceil(1.2 * (v_paginas + 4 * (ceil(v_filas / 4 / 150.0) + 3) + v_fijo))::bigint;
  perform pg_temp.buffers(v_sql);
  v_real := pg_temp.buffers(v_sql);
  raise notice 'medicion|cotizacion_evaluar, guarda: ARMAR de la sintética lee (buffers; tope %, con % filas en % páginas y un costo fijo de %)|%', v_tope, v_filas, v_paginas, v_fijo, v_real;
  if v_real > v_tope then raise exception 'ARMAR lee % buffers y el tope de las tablas que nombra la fórmula es %', v_real, v_tope; end if;
  -- Las dos versiones malas: la función de verdad con un cambio, creada en pg_temp, que tiene que pasarse del tope.
  v_def := pg_get_functiondef('public._cotizacion_armar(jsonb, uuid, uuid, uuid)'::regprocedure);
  for i in 1 .. 2 loop
    v_nombre := '_cotizacion_armar_mala_' || v_malas[i][1];
    v_malo := replace(v_def, 'public._cotizacion_armar(', 'pg_temp.' || v_nombre || '(');
    if v_malo = v_def or position(v_malas[i][3] in v_malo) = 0 then
      raise exception 'la versión mala «%» no aplica: el texto de _cotizacion_armar cambió y la guarda tiene que seguirlo', v_malas[i][2];
    end if;
    execute replace(v_malo, v_malas[i][3], v_malas[i][4]);
    perform pg_temp.buffers(replace(v_sql, 'public._cotizacion_armar(', 'pg_temp.' || v_nombre || '('));
    v_b := pg_temp.buffers(replace(v_sql, 'public._cotizacion_armar(', 'pg_temp.' || v_nombre || '('));
    raise notice 'medicion|cotizacion_evaluar, guarda: una versión que % lee (buffers; tiene que pasar de %)|%', v_malas[i][2], v_tope, v_b;
    if v_b <= v_tope then
      raise exception 'la guarda no muerde: una versión que % lee % buffers y el tope es %', v_malas[i][2], v_b, v_tope;
    end if;
  end loop;
end $$;

rollback;
