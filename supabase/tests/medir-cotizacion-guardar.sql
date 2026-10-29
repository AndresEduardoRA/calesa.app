-- Medición de `cotizacion_guardar()` con 50.000 y con 250.000 cotizaciones (paso 4.10, prompt 3): `pnpm db:medir`, contra el Supabase LOCAL. Todo en una transacción que se revierte.
-- Arma su propio terreno (una dueña, una asesora «propios», sus leads y dos vehículos, sobre la fórmula sembrada de `subasta_usa`, y un origen con la fórmula sintética de 200 nodos y 4 tablas
-- de 1.000 filas del corpus del motor) y las filas de relleno con la forma de las de `medir-cotizacion-crear.sql`, cada una con UNA revisión que lleva su intento (para que un intento buscado mal
-- tenga qué recorrer), sin triggers ni auditoría. Las cotizaciones que se guardan las crea `cotizacion_crear()` (esa llamada no se mide).
--
-- Qué se mide: la llamada entera como `authenticated`, con el plan genérico (lo que arma plpgsql tras unas llamadas), `EXPLAIN (ANALYZE, BUFFERS)` ×7 y la mediana de las 5 últimas, con la carga de
-- la máquina (`/proc/loadavg`) anotada. Cada corrida de un caso que escribe escribe de verdad (cambia el título y un input: una versión nueva, una revisión, el diff por nodo y la auditoría). Seis casos:
--   duena        una preventa de la dueña (la fórmula del seed, con su vehículo)        asesora       una de la asesora («propios»: su lead sale de su cartera)
--   vehiculo     cambiando de vehículo en cada corrida (los dos `for key share` y el cambio)   sin_cambios   guardar lo mismo que hay (no escribe)
--   repetido     el mismo intento ya guardado (la vuelta temprana, sin calcular)        sintetica     la fórmula de 200 nodos con 4 tablas de 1.000 filas
--
-- Asserta, con los dos volúmenes:
--   - el presupuesto de una llamada en ms Y en buffers (los topes salen de lo medido, con una vuelta de margen para una máquina ocupada; lo medido va, con su fecha, junto a
--     cada tope en «Lo medido y sus presupuestos», y la tabla entera en `docs/RENDIMIENTO.md`, «Paso 4.10 (3 de 3)»);
--   - que no crece con N: con 250.000 el tiempo es a lo sumo `greatest(1,5 × el de 50.000, el de 50.000 + 3 ms)` y los buffers a lo sumo 1,2 × los de 50.000 + 20;
--   - que la llamada no recorre `cotizaciones` ni `cotizaciones_revisiones`: ningún `Seq Scan` en `pg_stat_xact_user_tables` (se lee por su clave y por el índice único del intento);
--   - la guarda: una copia de la función que busca el intento SIN la cotización (`where intento = …`, sin el primer campo del índice) recorre las revisiones y rompe esos presupuestos.
-- Las corridas anteriores de otras mediciones se revierten pero dejan tuplas muertas: se limpian antes de medir y después (VACUUM no corre dentro de una transacción: va fuera del begin).
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.cotizaciones;
vacuum public.cotizaciones_revisiones;
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null

do $$ begin
  if (select count(*) from public.cotizaciones) > 0 then
    raise exception 'la base ya trae cotizaciones: la medición cuenta con 50.000 y 250.000 propias (pnpm db:reset)';
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir cotizacion_guardar: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000e7'), ('asesora', '00000000-0000-0000-0000-0000000000e8');
insert into auth.users (id, email, raw_app_meta_data) select id, 'medir-guardar-' || clave || '@ejemplo.com', '{"invitado": true}' from _p;
update public.perfiles set nombre = 'Medir guardar', invitacion_aceptada_en = now() where id in (select id from _p);
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select p.id, r.id, true from _p p join public.roles r on r.clave = case p.clave when 'duena' then 'dueno' else 'asesor' end on conflict do nothing;
create temp table _o as select o.id as origen, f.id as formula from public.origenes o join public.formulas f on f.origen_id = o.id and f.estado = 'publicada' where o.clave = 'subasta_usa';
do $$ begin
  if (select count(*) from _o) <> 1 then raise exception 'esperaba el origen sembrado subasta_usa con su fórmula publicada'; end if;
end $$;

-- La sintética del corpus del motor (200 nodos y 4 tablas de 1.000 filas): su origen, su fórmula (todos ven y editan cada nodo), sus tablas vivas y su vehículo.
create temp table _sint as select doc -> 'con_tablas_en_la_base' as s from _sinteticas_del_motor;
do $$
declare v_origen uuid; v_s jsonb := (select s from _sint);
begin
  if jsonb_array_length(v_s -> 'definicion' -> 'nodos') <> 200 or (select count(*) from jsonb_object_keys(v_s -> 'entrada' -> 'tablas')) <> 4 then
    raise exception 'la sintética no tiene 200 nodos y 4 tablas';
  end if;
  insert into public.origenes (clave, nombre, tipo) values ('medir_guardar_sint', 'Medir guardar, sintética', 'manual') returning id into v_origen;
  insert into public.origenes_campos (origen_id, clave, etiqueta, tipo) values (v_origen, 'clase', 'Clase', 'texto');
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
    values (v_origen, 1, 'publicada', v_s -> 'definicion', v_s -> 'params', '{}',
            (select jsonb_object_agg(n ->> 'id', jsonb_build_object('ver', 'todos', 'editar', 'todos')) from jsonb_array_elements(v_s -> 'definicion' -> 'nodos') n));
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) select v_origen, k, k, '[]' from jsonb_object_keys(v_s -> 'entrada' -> 'tablas') k;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden)
    select t.id, f.value, (f.ordinality - 1)::smallint
      from jsonb_each(v_s -> 'entrada' -> 'tablas') e
      join public.tablas_referencia t on t.origen_id = v_origen and t.clave = e.key
      cross join lateral jsonb_array_elements(e.value) with ordinality f (value, ordinality);
  insert into public.vehiculos (origen_id, titulo, anio, atributos)
    values (v_origen, 'Medir guardar, sintética', (v_s -> 'entrada' -> 'vehiculo' ->> 'anio')::int, jsonb_build_object('clase', v_s -> 'entrada' -> 'vehiculo' -> 'clase'));
end $$;
-- Lo que tipea la persona en la sintética: la entrada del benchmark de `cotizacion_evaluar` (medir-evaluar.sql) sin los overrides de nodos que no existen o que no se sobrescriben (crear y guardar los
-- rechazan; el motor los descartaba): así se mide lo mismo que allá (con overrides el motor no calcula el sugerido de esos nodos) y lo que cuesta guardar encima.
create temp table _entrada_sint as
  select jsonb_build_object('inputs', s -> 'entrada' -> 'inputs', 'banderas', s -> 'entrada' -> 'banderas',
           'overrides', coalesce((select jsonb_object_agg(o.key, o.value) from jsonb_each(s -> 'entrada' -> 'overrides') o
                                   where exists (select 1 from jsonb_array_elements(s -> 'definicion' -> 'nodos') n
                                                  where n ->> 'id' = o.key and (n ->> 'tipo' in ('constante', 'tipo_cambio') or (n -> 'sobrescribible') = 'true'::jsonb))), '{}'::jsonb)) as doc
    from _sint;
grant select on _entrada_sint to authenticated;
create temp table _os as select o.id as origen, f.id as formula from public.origenes o join public.formulas f on f.origen_id = o.id and f.estado = 'publicada' where o.clave = 'medir_guardar_sint';

-- Los leads (el de la asesora, en su cartera), los vehículos (de los que casan con la tabla del transporte) y los ids de los intentos.
create temp table _x (clave text primary key, id uuid not null);
with l as (
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  select 'Medir guardar ' || p.clave, case p.clave when 'duena' then '78200001' else '78200002' end, p.id, (select id from public.origenes_lead where clave = 'web'), '{}' from _p p returning id, creado_por)
insert into _x select 'lead_' || p.clave, l.id from l join _p p on p.id = l.creado_por;
with v as (insert into public.vehiculos (origen_id, titulo, anio, atributos) select origen, 'Medir guardar ' || g, 2025, '{"tipo_vehiculo": "autos"}' from _o cross join generate_series(1, 2) g returning id, titulo)
insert into _x select 'vehiculo_' || right(titulo, 1), id from v;
insert into _x select 'vehiculo_sint', id from public.vehiculos where titulo = 'Medir guardar, sintética';
insert into _x values ('intento_repetido', gen_random_uuid());
create temp table _snap as select (select jsonb_object_agg(n ->> 'id', round((n_ord * 13.37)::numeric, 2)) from jsonb_array_elements(f.definicion -> 'nodos') with ordinality x (n, n_ord)) as valores,
                                  (select jsonb_object_agg(n ->> 'id', 'input') from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'tipo' in ('input', 'constante', 'tipo_cambio')) as fuentes
  from public.formulas f join _o on f.id = _o.formula;
grant select on _p, _x, _o, _os to authenticated;

-- Las filas de relleno (la dueña y la asesora, y tres más): g más nuevas cuanto mayor es g, cada una con una revisión (con su intento). Sin triggers (cada fila auditaría y numeraría).
create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  with n as (
    insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, creado_en, actualizado_en)
    select o.origen,
           case when g % 10 = 1 then (select id from _p where clave = 'asesora') else (select id from _p where clave = 'duena') end,
           o.formula, s.valores, s.fuentes, '{"oficial": 6.96, "paralelo": 12.4}', '{"usd": 1234.5}', 1234.5, 'Relleno ' || g,
           timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds', timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds'
      from generate_series(p_desde, p_hasta) g cross join _o o cross join _snap s
    returning id, creado_por, creado_en)
  insert into public.cotizaciones_revisiones (cotizacion_id, usuario_id, diff, intento, huella, creado_en)
  select n.id, n.creado_por, '{"titulo": {"de": null, "a": "x"}}', gen_random_uuid(), 'relleno', n.creado_en from n;
  set local session_replication_role = origin;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las funciones de medición. Corren como authenticated, con el plan genérico.
-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las cotizaciones que se guardan (una por caso y fase): las crea `cotizacion_crear()` como la persona. Se guardan en `_c` (clave = caso).
create temp table _c (fase text, caso text, id uuid not null, primary key (fase, caso));
grant all on _c to authenticated;
create function pg_temp.como(p_clave text) returns void language plpgsql as $$
declare v_id uuid := (select id from _p where clave = p_clave);
begin
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
end $$;

-- La firma de la hoja abierta es de nadie: se llama con los derechos de quien creó esta función (postgres), con los claims de quien está en `como`.
create function pg_temp.firmar(p_origen uuid, p_formula uuid) returns text language sql security definer as $$ select public._cotizacion_abierta_firmar(p_origen, p_formula, now()) $$;
grant execute on function pg_temp.firmar(uuid, uuid) to authenticated;

create function pg_temp.crear(p_fase text, p_caso text, p_quien text, p_origen uuid, p_formula uuid, p_lead text, p_vehiculo text, p_entradas text) returns void language plpgsql as $$
declare v_id uuid := gen_random_uuid(); v_r jsonb;
begin
  perform pg_temp.como(p_quien);
  -- La hoja abierta (4-27) la firma la base para quien llama (los claims de `como` ya dicen quién): sin medirla, esta llamada no es lo que se mide.
  execute format('select public.cotizacion_crear(%L, %L, %L, %L::jsonb, %L, %L)', v_id, p_origen, (select id from _x where clave = p_lead), p_entradas,
                 pg_temp.firmar(p_origen, p_formula), (select id from _x where clave = p_vehiculo)) into v_r;
  insert into _c values (p_fase, p_caso, v_id);
end $$;

-- El SQL de una llamada: la versión esperada es la de ahora (una subconsulta por clave), y lo que cambia en cada corrida es un input y el título (una versión nueva y una revisión).
create function pg_temp.sql_de(p_fase text, p_caso text) returns text language plpgsql as $$
declare
  v_id uuid := (select id from _c where fase = p_fase and caso = p_caso);
  c_overrides constant text := '"overrides": {"transporte_bolivia": 0, "nacionalizacion": 1201}';
  v_v1 uuid := (select id from _x where clave = 'vehiculo_1'); v_v2 uuid := (select id from _x where clave = 'vehiculo_2'); v_vs uuid := (select id from _x where clave = 'vehiculo_sint');
  v_ver text := format('(select c.actualizado_en from public.cotizaciones c where c.id = %L)', v_id);
  v_cambia text := 'jsonb_build_object(''inputs'', jsonb_build_object(''remate'', (random() * 1000)::int), ''overrides'', jsonb_build_object(''transporte_bolivia'', 0, ''nacionalizacion'', 1201))';
begin
  return case p_caso
    when 'duena' then format('select public.cotizacion_guardar(%L, gen_random_uuid(), %s, %s, null, ''T'' || gen_random_uuid()::text, null, %L, false)', v_id, v_ver, v_cambia, v_v1)
    when 'asesora' then format('select public.cotizacion_guardar(%L, gen_random_uuid(), %s, %s, null, ''T'' || gen_random_uuid()::text, null, %L, false)', v_id, v_ver, v_cambia, v_v1)
    -- Cambiar de vehículo: el que no es el de ahora.
    when 'vehiculo' then format('select public.cotizacion_guardar(%L, gen_random_uuid(), %s, %s, null, null, null, (select case when c.vehiculo_id = %L then %L::uuid else %L::uuid end from public.cotizaciones c where c.id = %L), false)',
                                v_id, v_ver, v_cambia, v_v1, v_v2, v_v1, v_id)
    when 'sin_cambios' then format('select public.cotizacion_guardar(%L, gen_random_uuid(), %s, ''{"inputs": {"remate": 5000}, %s}''::jsonb, null, ''fijo'', null, %L, false)', v_id, v_ver, c_overrides, v_v1)
    -- El mismo intento y los mismos datos que la primera vez (con la versión de entonces): la vuelta temprana.
    when 'repetido' then format('select public.cotizacion_guardar(%L, %L, %L, ''{"inputs": {"remate": 7000}, %s}''::jsonb, null, ''repetido'', null, %L, false)', v_id, (select id from _x where clave = 'intento_repetido'),
                                (select valor from _versiones where caso = 'repetido'), c_overrides, v_v1)
    when 'sintetica' then format('select public.cotizacion_guardar(%L, gen_random_uuid(), %s, (select doc from _entrada_sint), null, ''T'' || gen_random_uuid()::text, null, %L, false)', v_id, v_ver, v_vs)
    when 'mala' then format('select pg_temp.cotizacion_guardar_mala(%L, gen_random_uuid(), %s, %s, null, ''T'' || gen_random_uuid()::text, null, %L, false)', v_id, v_ver, v_cambia, v_v1)
  end;
end $$;
create temp table _versiones (caso text primary key, valor timestamptz);
grant all on _versiones to authenticated;

-- 7 corridas de EXPLAIN de la llamada: la mediana de ms y de buffers de las 5 últimas.
create function pg_temp.medir(p_sql text) returns jsonb language plpgsql as $$
declare
  v_plan jsonb; v_ms numeric[] := '{}'; v_buf bigint[] := '{}'; v_clave text; v_b bigint; i int;
begin
  for i in 1 .. 7 loop
    execute 'explain (analyze, buffers, format json) ' || p_sql into v_plan;
    continue when i <= 2;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    v_b := 0;
    foreach v_clave in array array['Shared Hit Blocks', 'Shared Read Blocks'] loop
      v_b := v_b + coalesce((v_plan -> 0 -> 'Plan' ->> v_clave)::bigint, 0);
    end loop;
    v_buf := v_buf || v_b;
  end loop;
  return jsonb_build_object('ms', (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m),
                            'buffers', (select percentile_disc(0.5) within group (order by b) from unnest(v_buf) b));
end $$;

-- Cuántos recorridos enteros de `cotizaciones` y de `cotizaciones_revisiones` hace UNA llamada (el delta de `pg_stat_xact_user_tables`).
create function pg_temp.recorridos(p_sql text) returns bigint language plpgsql as $$
declare v_antes bigint; v_despues bigint; v_x text;
begin
  select coalesce(sum(seq_scan), 0) into v_antes from pg_stat_xact_user_tables where relname in ('cotizaciones', 'cotizaciones_revisiones');
  execute p_sql into v_x;
  select coalesce(sum(seq_scan), 0) into v_despues from pg_stat_xact_user_tables where relname in ('cotizaciones', 'cotizaciones_revisiones');
  return v_despues - v_antes;
end $$;

create temp table _med (fase text, caso text, ms numeric, buffers bigint, recorridos bigint);
grant all on _med to authenticated;

-- Una fase: las cotizaciones se crean primero (por `cotizacion_crear`, sin medir) y después los seis casos (y, si se pide, la guarda).
create function pg_temp.fase(p_fase text, p_con_mala boolean default false) returns void language plpgsql as $$
declare
  v_caso text; v_quien text; v_m jsonb; v_r bigint; v_sql text;
  c_entradas constant text := '{"overrides": {"transporte_bolivia": 0, "nacionalizacion": 1201}}';
begin
  -- Las cotizaciones a guardar (como cada persona).
  foreach v_caso in array array['duena', 'vehiculo', 'sin_cambios', 'repetido', 'mala'] loop
    perform pg_temp.crear(p_fase, v_caso, 'duena', (select origen from _o), (select formula from _o), 'lead_duena', 'vehiculo_1', c_entradas);
  end loop;
  perform pg_temp.crear(p_fase, 'asesora', 'asesora', (select origen from _o), (select formula from _o), 'lead_asesora', 'vehiculo_1', c_entradas);
  perform pg_temp.crear(p_fase, 'sintetica', 'duena', (select origen from _os), (select formula from _os), 'lead_duena', 'vehiculo_sint', (select doc::text from _entrada_sint));
  -- Lo que se prepara una vez: «sin cambios» (guardar lo que se va a repetir) y «repetido» (el primer guardado con su versión).
  perform pg_temp.como('duena');
  execute pg_temp.sql_de(p_fase, 'sin_cambios') into v_sql;
  delete from _versiones where caso = 'repetido';
  insert into _versiones values ('repetido', (select c.actualizado_en from public.cotizaciones c where c.id = (select id from _c where fase = p_fase and caso = 'repetido')));
  execute pg_temp.sql_de(p_fase, 'repetido') into v_sql;
  foreach v_caso in array array['duena', 'asesora', 'vehiculo', 'sin_cambios', 'repetido', 'sintetica'] loop
    v_quien := case v_caso when 'asesora' then 'asesora' else 'duena' end;
    perform pg_temp.como(v_quien);
    v_sql := pg_temp.sql_de(p_fase, v_caso);
    v_m := pg_temp.medir(v_sql);
    v_r := pg_temp.recorridos(v_sql);
    insert into _med values (p_fase, v_caso, (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint, v_r);
  end loop;
  if p_con_mala then
    perform pg_temp.como('duena');
    v_sql := pg_temp.sql_de(p_fase, 'mala');
    v_m := pg_temp.medir(v_sql);
    v_r := pg_temp.recorridos(v_sql);
    insert into _med values (p_fase, 'mala', (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint, v_r);
  end if;
end $$;

-- La copia mala: la función de verdad, pero el intento se busca SIN la cotización (`where intento = …`): el índice único empieza por `cotizacion_id`, así que recorre las revisiones.
do $$
declare v_def text := pg_get_functiondef('public.cotizacion_guardar(uuid, uuid, timestamptz, jsonb, text, text, text, uuid, boolean)'::regprocedure);
begin
  v_def := replace(v_def, 'FUNCTION public.cotizacion_guardar(', 'FUNCTION pg_temp.cotizacion_guardar_mala(');
  if position('x.cotizacion_id = p_id and x.intento = p_intento' in v_def) = 0 then raise exception 'la copia mala: no está la búsqueda del intento'; end if;
  v_def := replace(v_def, 'x.cotizacion_id = p_id and x.intento = p_intento', 'x.intento = p_intento');
  execute v_def;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 1: 50.000 cotizaciones
-- ---------------------------------------------------------------------------------------------------------------------------------
select pg_temp.rellenar(1, 50000);
analyze public.cotizaciones;
analyze public.cotizaciones_revisiones;
do $$ begin
  if (select count(*) from public.cotizaciones) <> 50000 then raise exception 'esperaba 50.000 cotizaciones y hay %', (select count(*) from public.cotizaciones); end if;
end $$;
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.fase('50.000');
reset role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 2: 250.000 cotizaciones
-- ---------------------------------------------------------------------------------------------------------------------------------
select pg_temp.rellenar(50001, 250000);
analyze public.cotizaciones;
analyze public.cotizaciones_revisiones;
do $$ begin
  if (select count(*) from public.cotizaciones) < 250000 then raise exception 'esperaba al menos 250.000 cotizaciones y hay %', (select count(*) from public.cotizaciones); end if;
end $$;
set local role authenticated;
select pg_temp.fase('250.000', true);
reset role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Lo medido y sus presupuestos
-- ---------------------------------------------------------------------------------------------------------------------------------
do $$
declare
  c_ms constant numeric := 20;            -- ms por llamada con la fórmula del seed (medido el 2026-10-26: 2,0 a 7,5): unas 3 veces lo medido y el tope de `cotizacion_crear`
  c_ms_sint constant numeric := 60;       -- ms de la sintética (200 nodos y 4 tablas de 1.000 filas; medido el 2026-10-26: 43,8 a 43,9): el motor pone 27 y ARMAR 8, igual que `cotizacion_evaluar` (p95 41, tope 50); el resto es guardar
  c_buf constant bigint := 1500;          -- buffers por llamada (medido el 2026-10-26: 55 a 307)
  c_buf_sint constant bigint := 1000;     -- buffers de la sintética (medido el 2026-10-26: 434 a 438)
  r record; g record; v_fallas text := ''; v_tope_ms numeric; v_tope_buf bigint;
begin
  for r in select * from _med order by fase, caso loop
    raise notice 'medicion|cotizacion_guardar, %, % (ms)|%', r.fase, r.caso, round(r.ms, 2);
    raise notice 'medicion|cotizacion_guardar, %, % (buffers)|%', r.fase, r.caso, r.buffers;
    raise notice 'medicion|cotizacion_guardar, %, % (recorridos de cotizaciones y revisiones)|%', r.fase, r.caso, r.recorridos;
  end loop;
  for r in select * from _med where caso <> 'mala' loop
    -- (Los topes van aparte: un `if` de plpgsql termina en el primer `then`, también en el de un `case`.)
    v_tope_ms := case when r.caso = 'sintetica' then c_ms_sint else c_ms end;
    v_tope_buf := case when r.caso = 'sintetica' then c_buf_sint else c_buf end;
    if r.ms > v_tope_ms then v_fallas := v_fallas || format(E'\n  %s, %s: %s ms (tope %s)', r.fase, r.caso, round(r.ms, 2), v_tope_ms); end if;
    if r.buffers > v_tope_buf then v_fallas := v_fallas || format(E'\n  %s, %s: %s buffers (tope %s)', r.fase, r.caso, r.buffers, v_tope_buf); end if;
    if r.recorridos <> 0 then v_fallas := v_fallas || format(E'\n  %s, %s: recorre cotizaciones o sus revisiones %s veces', r.fase, r.caso, r.recorridos); end if;
  end loop;
  -- No crece con N.
  for g in select m2.caso, m1.ms as ms_50, m2.ms as ms_250, m1.buffers as b_50, m2.buffers as b_250
             from _med m1 join _med m2 on m2.caso = m1.caso and m2.fase = '250.000' where m1.fase = '50.000' loop
    if g.ms_250 > greatest(1.5 * g.ms_50, g.ms_50 + 3) then v_fallas := v_fallas || format(E'\n  %s: %s ms con 250.000 contra %s con 50.000', g.caso, round(g.ms_250, 2), round(g.ms_50, 2)); end if;
    if g.b_250 > 1.2 * g.b_50 + 20 then v_fallas := v_fallas || format(E'\n  %s: %s buffers con 250.000 contra %s con 50.000', g.caso, g.b_250, g.b_50); end if;
  end loop;
  if v_fallas <> '' then raise exception 'cotizacion_guardar rompe su presupuesto:%', v_fallas; end if;
  -- La guarda: la copia que busca el intento sin la cotización tiene que romper el presupuesto (el tiempo, los buffers o el recorrido de las revisiones).
  select * into r from _med where caso = 'mala';
  raise notice 'medicion|Guarda, la copia que busca el intento sin la cotización, 250.000 (ms)|%', round(r.ms, 2);
  raise notice 'medicion|Guarda, la copia que busca el intento sin la cotización, 250.000 (recorridos de cotizaciones y revisiones)|%', r.recorridos;
  if r.ms <= c_ms and r.buffers <= c_buf and r.recorridos = 0 then raise exception 'la guarda no muerde: la copia que busca el intento sin la cotización cumple el presupuesto (% ms, % buffers, % recorridos)', r.ms, r.buffers, r.recorridos; end if;
end $$;
rollback;
vacuum public.cotizaciones;
vacuum public.cotizaciones_revisiones;
