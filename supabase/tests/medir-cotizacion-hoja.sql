-- Medición de `cotizacion_hoja()` (paso 4.13, prompt 1): la lectura que abre la hoja de cotizar. `pnpm db:medir`, contra el Supabase LOCAL. Todo en una transacción que se revierte.
-- Arma su propio terreno: una dueña, una asesora (sin el nivel «costos»), la fórmula sembrada de `subasta_usa` (la de las capturas, la más grande del juego), `planilla_usa`, una copia con la tabla del
-- factor DP VIVA de 1.000 filas (la semilla congela todas sus tablas), los diseños sintéticos de unos 200 y 2.000 ítems de `corpus-de-diseno.json › sinteticas` (`scripts/medir-listado.mjs`
-- los pone en `_disenos_sinteticos` antes de este archivo) y 20.000 cotizaciones de relleno, sin triggers: una lectura que las toque lo muestra.
--
-- Qué se mide: la llamada entera como `authenticated`, con el plan genérico, `EXPLAIN (ANALYZE, BUFFERS)` ×7 y la mediana de las 5 últimas, con la carga de la máquina anotada.
-- Asserta:
--   - los bytes de la primera respuesta (`octet_length(r::text)`) de la hoja de las capturas como dueña: el tope de `docs/RENDIMIENTO.md`; la de la asesora es más chica;
--   - el tiempo de cada hoja, y que 9,75 veces los ítems cuesten a lo sumo 15 veces el tiempo (lineal con su constante: una cuadrática daría ≈ 95);
--   - **sin leer cotizaciones**: por relación (`pg_stat_get_xact_blocks_fetched`: los buffers totales los mueve el autovacuum de las tablas de permisos), 0 bloques de `cotizaciones`, de
--     `cotizaciones_revisiones` y de sus índices;
--   - los atajos de una tabla viva leen a lo sumo las filas que piden (`limit`), no las 1.000;
--   - `cotizacion_evaluar()` por origen con y sin la hoja abierta (4-28): la fórmula del seed ≤ 10 ms con las dos, y lo que suma verificar la firma (leer la clave de Vault y un HMAC) ≤ 3 ms;
--   - las guardas: una copia que lee `cotizaciones` por una columna sin índice rompe el 0, y una que lee la tabla viva entera, sin `limit`, rompe el tope de bloques de `tablas_referencia_filas`.
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.cotizaciones;
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null

do $$ begin
  if (select count(*) from public.cotizaciones) > 0 then
    raise exception 'la base ya trae cotizaciones: la medición cuenta con 20.000 propias (pnpm db:reset)';
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir cotizacion_hoja: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000e7'), ('asesora', '00000000-0000-0000-0000-0000000000e8');
insert into auth.users (id, email, raw_app_meta_data) select id, 'medir-hoja-' || clave || '@ejemplo.com', '{"invitado": true}' from _p;
update public.perfiles set nombre = 'Medir hoja', invitacion_aceptada_en = now() where id in (select id from _p);
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select p.id, r.id, true from _p p join public.roles r on r.clave = case p.clave when 'duena' then 'dueno' else 'asesor' end on conflict do nothing;

-- Los orígenes y sus fórmulas publicadas: dos sembradas, la copia con la tabla viva, y las sintéticas.
create temp table _o (clave text primary key, origen uuid not null, formula uuid not null, ids int);
insert into _o select o.clave, o.id, f.id, jsonb_array_length(f.diseno -> 'secciones') from public.origenes o join public.formulas f on f.origen_id = o.id and f.estado = 'publicada' where o.clave in ('subasta_usa', 'planilla_usa');
do $$
declare
  f0 public.formulas; v_o uuid; v_t uuid; v_s jsonb; v_clave text; v_vis jsonb; v_id uuid;
begin
  if (select count(*) from _o) <> 2 then raise exception 'esperaba subasta_usa y planilla_usa con su fórmula publicada'; end if;
  -- La copia con la tabla del factor DP viva: 1.000 filas con un texto de relleno, para que no quepan en un par de páginas.
  select f.* into f0 from public.formulas f join _o on f.id = _o.formula where _o.clave = 'subasta_usa';
  insert into public.origenes (clave, nombre) values ('medir_hoja_viva', 'Medir hoja viva') returning id into v_o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (v_o, 1, 'publicada', f0.definicion, f0.params #- '{tablas,depreciacion}', f0.diseno, f0.visibilidad) returning id into v_id;
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values (v_o, 'depreciacion', 'Depreciación viva', '[{"clave":"anio","etiqueta":"Año","tipo":"anio"},{"clave":"factor","etiqueta":"Factor","tipo":"numero"}]') returning id into v_t;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden)
  select v_t, jsonb_build_object('anio', 1000 + g, 'factor', 0.5 + g / 10000.0, 'nota', repeat('relleno ', 60)), g from generate_series(1, 1000) g;
  insert into _o values ('viva', v_o, v_id, 0);
  -- Las sintéticas: la visibilidad del diseño con sus niveles pasados a «costos» (la dueña lo tiene).
  set local session_replication_role = replica;
  foreach v_clave in array array['chica', 'grande'] loop
    v_s := (select doc -> v_clave from _disenos_sinteticos);
    insert into public.origenes (clave, nombre) values ('medir_hoja_' || v_clave, 'Medir hoja ' || v_clave) returning id into v_o;
    v_vis := (select jsonb_object_agg(e.key, jsonb_build_object(
                'ver', case when e.value ->> 'ver' = 'todos' then 'todos' else 'costos' end,
                'editar', case when e.value ->> 'editar' is null then null when e.value ->> 'editar' = 'todos' then 'todos' else 'costos' end))
              from jsonb_each(public._compilar_visibilidad(v_s -> 'definicion', v_s -> 'diseno')) e);
    insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
    values (v_o, 1, 'publicada', v_s -> 'definicion', coalesce(v_s -> 'params', '{}'), v_s -> 'diseno', v_vis) returning id into v_id;
    insert into _o values (v_clave, v_o, v_id, jsonb_array_length(v_s -> 'definicion' -> 'nodos'));
  end loop;
  set local session_replication_role = origin;
  if (select ids from _o where clave = 'chica') not between 200 and 300 or (select ids from _o where clave = 'grande') not between 2000 and 3000 then
    raise exception 'las sintéticas no son de unos 255 y 2.487 nodos: %', (select jsonb_agg(to_jsonb(x)) from _o x); end if;
  raise notice 'nota|Nodos de las sintéticas: % y %|', (select ids from _o where clave = 'chica'), (select ids from _o where clave = 'grande');
end $$;
analyze public.formulas;
analyze public.tablas_referencia_filas;
grant select on _p, _o to authenticated;

-- 20.000 cotizaciones de relleno con el snapshot de la fórmula de las capturas: si la lectura las tocara, los bloques lo dirían.
create temp table _snap as select (select jsonb_object_agg(n ->> 'id', round((n_ord * 13.37)::numeric, 2)) from jsonb_array_elements(f.definicion -> 'nodos') with ordinality x (n, n_ord)) as valores,
                                  (select jsonb_object_agg(n ->> 'id', 'input') from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'tipo' in ('input', 'constante', 'tipo_cambio')) as fuentes
  from public.formulas f join _o on f.id = _o.formula where _o.clave = 'subasta_usa';
do $$ begin
  set local session_replication_role = replica;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, creado_en, actualizado_en)
  select o.origen, (select id from _p where clave = 'duena'), o.formula, s.valores, s.fuentes, '{"oficial": 6.96, "paralelo": 12.4}', '{"usd": 1234.5}', 1234.5, 'Relleno ' || g,
         timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds', timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds'
    from generate_series(1, 20000) g cross join (select * from _o where clave = 'subasta_usa') o cross join _snap s;
  set local session_replication_role = origin;
end $$;
analyze public.cotizaciones;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las funciones de medición. Corren como authenticated, con el plan genérico.
-- ---------------------------------------------------------------------------------------------------------------------------------
create function pg_temp.como(p_clave text) returns void language plpgsql as $$
declare v_id uuid := (select id from _p where clave = p_clave);
begin
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
end $$;

-- 7 corridas de EXPLAIN: la mediana de ms de las 5 últimas.
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

-- Los bloques que esta transacción ha pedido de una relación y sus índices y su TOAST.
create function pg_temp.bloques(p_tabla regclass) returns bigint language sql as $$
  select coalesce(sum(pg_stat_get_xact_blocks_fetched(r.oid)), 0)::bigint
    from (select p_tabla::oid as oid
          union all select indexrelid from pg_index where indrelid = p_tabla
          union all select reltoastrelid from pg_class where oid = p_tabla and reltoastrelid <> 0) r
$$;

-- Los bloques de `p_tabla` que pide UNA ejecución de la sentencia (ya caliente).
create function pg_temp.bloques_que_lee(p_sql text, p_tabla regclass) returns bigint language plpgsql as $$
declare v_antes bigint;
begin
  execute p_sql;
  v_antes := pg_temp.bloques(p_tabla);
  execute p_sql;
  return pg_temp.bloques(p_tabla) - v_antes;
end $$;

create temp table _med (caso text primary key, ms numeric, buffers bigint, bytes int, cot bigint, rev bigint, filas bigint);
grant all on _med to authenticated;

-- Un caso: la lectura como esa persona sobre ese origen.
create function pg_temp.caso(p_caso text, p_quien text, p_origen text, p_malo text default null) returns void language plpgsql as $$
declare
  v_o uuid := (select origen from _o where clave = p_origen); v_f uuid := (select formula from _o where clave = p_origen);
  v_sql text := case when p_malo is null then format('select public.cotizacion_hoja(%L)', v_o) else format('select pg_temp.%s(%L, %L)', p_malo, v_f, v_o) end;
  v_m jsonb; v_bytes int;
begin
  perform pg_temp.como(p_quien);
  execute replace(v_sql, 'select ', 'select octet_length((') || ')::text)' into v_bytes;
  v_m := pg_temp.medir(v_sql);
  insert into _med values (p_caso, (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint, v_bytes,
                           pg_temp.bloques_que_lee(v_sql, 'public.cotizaciones'::regclass),
                           pg_temp.bloques_que_lee(v_sql, 'public.cotizaciones_revisiones'::regclass),
                           pg_temp.bloques_que_lee(v_sql, 'public.tablas_referencia_filas'::regclass));
end $$;

-- El recálculo de la hoja (`cotizacion_evaluar` por origen) con y sin la hoja abierta que firmó la base: la firma se hace una vez, como cada persona y antes de dejar de ser postgres.
create temp table _t (clave text primary key, abierta text not null);
do $$
begin
  perform pg_temp.como('duena');
  insert into _t select 'subasta_usa', public._cotizacion_abierta_firmar(origen, formula, now()) from _o where clave = 'subasta_usa';
end $$;
grant select on _t to authenticated;
create function pg_temp.caso_evaluar(p_caso text, p_quien text, p_con_abierta boolean) returns void language plpgsql as $$
declare
  v_o uuid := (select origen from _o where clave = 'subasta_usa');
  v_sql text := format('select public.cotizacion_evaluar(%L::jsonb, null, %L, null, null, null, %L)', '{"inputs": {"remate": 14200}}', v_o,
                       case when p_con_abierta then (select abierta from _t where clave = 'subasta_usa') end);
  v_m jsonb; v_bytes int;
begin
  perform pg_temp.como(p_quien);
  execute replace(v_sql, 'select ', 'select octet_length((') || ')::text)' into v_bytes;
  v_m := pg_temp.medir(v_sql);
  insert into _med values (p_caso, (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint, v_bytes,
                           pg_temp.bloques_que_lee(v_sql, 'public.cotizaciones'::regclass),
                           pg_temp.bloques_que_lee(v_sql, 'public.cotizaciones_revisiones'::regclass),
                           pg_temp.bloques_que_lee(v_sql, 'public.tablas_referencia_filas'::regclass));
end $$;

-- Las copias malas. (1) La función de verdad, más una búsqueda por una columna sin índice (`notas`) que recorre `cotizaciones`. (2) La de los atajos sin su `limit`.
do $$
declare
  v_hoja text := pg_get_functiondef('public._cotizacion_hoja(uuid, uuid)'::regprocedure);
  v_chips text := pg_get_functiondef('public._hoja_chips(uuid, jsonb, jsonb, text, integer)'::regprocedure);
  v_cot text; v_sin text;
begin
  if position(E'begin\n  select * into fo from public.formulas x where x.id = p_formula;' in v_hoja) = 0 then raise exception 'la copia mala: no está el comienzo de _cotizacion_hoja'; end if;
  v_cot := replace(replace(v_hoja, 'FUNCTION public._cotizacion_hoja(', 'FUNCTION pg_temp.hoja_mala_cotizaciones('),
                   E'begin\n  select * into fo from public.formulas x where x.id = p_formula;',
                   E'begin\n  perform 1 from public.cotizaciones z where z.notas = ''no existe'' limit 1;\n  select * into fo from public.formulas x where x.id = p_formula;');
  execute v_cot;
  if position('limit p_filas' in v_chips) = 0 or position('where f.ord <= p_filas' in v_chips) = 0 then raise exception 'la copia mala: no están los topes de los atajos'; end if;
  v_sin := replace(replace(v_chips, 'FUNCTION public._hoja_chips(', 'FUNCTION pg_temp.chips_malo('), 'limit p_filas', '');
  execute v_sin;
  v_sin := replace(replace(v_hoja, 'FUNCTION public._cotizacion_hoja(', 'FUNCTION pg_temp.hoja_mala_atajos('), 'public._hoja_chips(', 'pg_temp.chips_malo(');
  execute v_sin;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Lo medido
-- ---------------------------------------------------------------------------------------------------------------------------------
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.caso('duena, capturas', 'duena', 'subasta_usa');
select pg_temp.caso('asesora, capturas', 'asesora', 'subasta_usa');
select pg_temp.caso('duena, planilla', 'duena', 'planilla_usa');
select pg_temp.caso('duena, atajos de la tabla viva', 'duena', 'viva');
select pg_temp.caso('duena, sintetica de 255 nodos', 'duena', 'chica');
select pg_temp.caso('duena, sintetica de 2.487 nodos', 'duena', 'grande');
select pg_temp.caso_evaluar('evaluar sin hoja abierta', 'duena', false);
select pg_temp.caso_evaluar('evaluar con hoja abierta', 'duena', true);
select pg_temp.caso('mala, lee cotizaciones', 'duena', 'subasta_usa', 'hoja_mala_cotizaciones');
select pg_temp.caso('mala, atajos sin limit', 'duena', 'viva', 'hoja_mala_atajos');
reset role;

do $$
declare
  c_bytes constant int := 16384;           -- bytes de la hoja de las capturas como dueña (medido: ver docs/RENDIMIENTO.md, «Paso 4.13 (1 de 4)»)
  c_ms constant numeric := 10;             -- ms por llamada de una hoja de las capturas
  c_ms_chica constant numeric := 25;       -- ms de la sintética de 255 nodos (medido: 11 a 24)
  c_ms_grande constant numeric := 300;     -- ms de la sintética de 2.487 nodos (medido: 156 a 284)
  c_firma constant numeric := 3;           -- ms que suma verificar la hoja abierta en `cotizacion_evaluar` (leer la clave de Vault y un HMAC)
  c_filas constant bigint := 12;           -- bloques de `tablas_referencia_filas` que pueden pedir unos atajos de 8 filas (heap, índice y TOAST)
  r record; v_fallas text := ''; m record; g record;
begin
  for r in select * from _med order by caso loop
    raise notice 'medicion|%, % (ms)|%', case when r.caso like 'evaluar%' then 'cotizacion_evaluar' else 'cotizacion_hoja' end, r.caso, round(r.ms, 2);
    raise notice 'medicion|%, % (bytes de la respuesta)|%', case when r.caso like 'evaluar%' then 'cotizacion_evaluar' else 'cotizacion_hoja' end, r.caso, r.bytes;
    raise notice 'medicion|%, % (bloques de cotizaciones)|%', case when r.caso like 'evaluar%' then 'cotizacion_evaluar' else 'cotizacion_hoja' end, r.caso, r.cot;
    raise notice 'medicion|%, % (bloques de cotizaciones_revisiones)|%', case when r.caso like 'evaluar%' then 'cotizacion_evaluar' else 'cotizacion_hoja' end, r.caso, r.rev;
    raise notice 'medicion|%, % (bloques de tablas_referencia_filas)|%', case when r.caso like 'evaluar%' then 'cotizacion_evaluar' else 'cotizacion_hoja' end, r.caso, r.filas;
  end loop;
  for r in select * from _med where caso not like 'mala,%' loop
    if r.cot <> 0 or r.rev <> 0 then v_fallas := v_fallas || format(E'\n  %s: lee %s bloques de cotizaciones y %s de sus revisiones', r.caso, r.cot, r.rev); end if;
  end loop;
  select * into m from _med where caso = 'duena, capturas';
  if m.bytes > c_bytes then v_fallas := v_fallas || format(E'\n  la hoja de las capturas pesa %s bytes (tope %s)', m.bytes, c_bytes); end if;
  if m.ms > c_ms then v_fallas := v_fallas || format(E'\n  la hoja de las capturas tarda %s ms (tope %s)', round(m.ms, 2), c_ms); end if;
  if (select bytes from _med where caso = 'asesora, capturas') >= m.bytes then v_fallas := v_fallas || E'\n  la hoja de la asesora no es más chica que la de la dueña'; end if;
  if (select ms from _med where caso = 'duena, planilla') > c_ms then v_fallas := v_fallas || E'\n  la hoja de la planilla tarda más que el tope'; end if;
  if (select filas from _med where caso = 'duena, atajos de la tabla viva') > c_filas then
    v_fallas := v_fallas || format(E'\n  los atajos de la tabla viva piden %s bloques de tablas_referencia_filas (tope %s)', (select filas from _med where caso = 'duena, atajos de la tabla viva'), c_filas);
  end if;
  if (select ms from _med where caso = 'duena, sintetica de 255 nodos') > c_ms_chica then v_fallas := v_fallas || format(E'\n  la sintética de 255 nodos tarda %s ms (tope %s)', round((select ms from _med where caso = 'duena, sintetica de 255 nodos'), 2), c_ms_chica); end if;
  if (select ms from _med where caso = 'duena, sintetica de 2.487 nodos') > c_ms_grande then v_fallas := v_fallas || format(E'\n  la sintética de 2.487 nodos tarda %s ms (tope %s)', round((select ms from _med where caso = 'duena, sintetica de 2.487 nodos'), 2), c_ms_grande); end if;
  select (g1.ms / g0.ms) as razon into g from _med g0, _med g1 where g0.caso = 'duena, sintetica de 255 nodos' and g1.caso = 'duena, sintetica de 2.487 nodos';
  raise notice 'medicion|cotizacion_hoja, razón de ms entre 2.487 y 255 nodos|%', round(g.razon, 1);
  if g.razon > 15 then v_fallas := v_fallas || format(E'\n  10 veces los nodos cuestan %s veces el tiempo (tope 15): no es lineal', round(g.razon, 1)); end if;
  -- El recálculo con la hoja abierta (4-28): dentro del presupuesto de evaluar con la fórmula del seed, y lo que suma la firma tiene su propio tope.
  for r in select * from _med where caso like 'evaluar%' loop
    if r.ms > c_ms then v_fallas := v_fallas || format(E'\n  %s tarda %s ms (tope %s)', r.caso, round(r.ms, 2), c_ms); end if;
  end loop;
  if (select ms from _med where caso = 'evaluar con hoja abierta') - (select ms from _med where caso = 'evaluar sin hoja abierta') > c_firma then
    v_fallas := v_fallas || format(E'\n  verificar la hoja abierta suma %s ms (tope %s)', round((select ms from _med where caso = 'evaluar con hoja abierta') - (select ms from _med where caso = 'evaluar sin hoja abierta'), 2), c_firma);
  end if;
  if v_fallas <> '' then raise exception 'cotizacion_hoja rompe su presupuesto:%', v_fallas; end if;
  -- Las guardas.
  select * into r from _med where caso = 'mala, lee cotizaciones';
  if r.cot = 0 then raise exception 'la guarda no muerde: la copia que recorre cotizaciones lee 0 bloques de ellas'; end if;
  select * into r from _med where caso = 'mala, atajos sin limit';
  raise notice 'medicion|Guarda, atajos sin limit (bloques de tablas_referencia_filas)|%', r.filas;
  if r.filas <= c_filas then raise exception 'la guarda no muerde: los atajos sin limit piden % bloques y el tope es %', r.filas, c_filas; end if;
end $$;
rollback;
vacuum public.cotizaciones;
