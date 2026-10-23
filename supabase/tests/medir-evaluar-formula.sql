-- Medición de evaluar_formula() con una evaluación sintética de 200 y de 2.000 nodos (paso 4.06, prompt 1): `pnpm db:medir`, contra el
-- Supabase LOCAL. Las evaluaciones son las de `evaluacionSintetica()` (src/modules/cotizaciones/entities/evaluacion-sintetica.ts),
-- volcadas a `supabase/tests/corpus-del-motor.json` › `sinteticas`; `scripts/medir-listado.mjs` las pone en `_sinteticas_del_motor`
-- antes de este archivo (la base no lee archivos del repo). Cada una trae la fórmula (`definicion`, `params`) y la entrada.
--
-- Cada tamaño: 7 corridas de EXPLAIN (ANALYZE, BUFFERS) como `authenticated`; las 2 primeras calientan (la compilación de plpgsql y
-- el caché del catálogo) y se mide la mediana de las otras 5. La llamada va sobre una subconsulta con `offset 0`.
-- Asserta:
--   - 0 buffers en las 5 medidas (shared, local y temp: hit, read, dirtied y written): la función es pura y no toca tablas;
--   - la mediana de cada tamaño ≤ su tope (la mayor de 3 corridas medidas el 2026-10-23, × 3; docs/RENDIMIENTO.md);
--   - la mediana de 2.000 nodos ≤ 12 veces la de 200 (es lineal: ×10 de tamaño; el tiempo es más ruidoso que las visitas);
--   - los argumentos leídos de una columna COMPRIMIDA (TOAST) cuestan a lo sumo 1,5 veces lo que con literales: un jsonb comprimido se
--     descomprime entero en cada `->`, y la función los desarma una sola vez al entrar (con 1.000 filas congeladas: 86 ms contra
--     0,7). Lo medido va con la columna como la deja la base, que es como los leerá `cotizacion_evaluar()` (prompt 2), y con la
--     sintética de 2.000 nodos y 4 tablas congeladas de 1.000 filas, donde releer `p_def` o `p_params` en la pasada se paga cientos
--     de veces.
-- Sin tope y sólo informativo: 200 nodos con 4 tablas de 1.000 filas, vivas (en la entrada) y congeladas (en `params`), para saber
-- qué cuesta una tabla grande antes de que `cotizacion_evaluar()` las lea de la base.
\set ON_ERROR_STOP 1
begin;

-- Una medición. `p_tope_ms` null = sólo informa. Devuelve la mediana en ms.
create function pg_temp.medir(p_s jsonb, p_nombre text, p_tope_ms numeric) returns numeric language plpgsql as $$
declare
  v_plan jsonb;
  v_nodo jsonb;
  v_ms numeric[] := '{}';
  v_buffers bigint := 0;
  v_mediana numeric;
  v_clave text;
  i int;
begin
  for i in 1 .. 7 loop
    execute format(
      'explain (analyze, buffers, format json) select public.evaluar_formula(x.d, x.p, x.e) from (select %L::jsonb as d, %L::jsonb as p, %L::jsonb as e offset 0) x',
      p_s -> 'definicion', p_s -> 'params', p_s -> 'entrada') into v_plan;
    continue when i <= 2;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    v_nodo := v_plan -> 0 -> 'Plan';
    foreach v_clave in array array['Shared Hit Blocks', 'Shared Read Blocks', 'Shared Dirtied Blocks', 'Shared Written Blocks',
                                   'Local Hit Blocks', 'Local Read Blocks', 'Local Dirtied Blocks', 'Local Written Blocks',
                                   'Temp Read Blocks', 'Temp Written Blocks'] loop
      v_buffers := v_buffers + coalesce((v_nodo ->> v_clave)::bigint, 0);
    end loop;
  end loop;
  v_mediana := (select percentile_cont(0.5) within group (order by x) from unnest(v_ms) x);
  raise notice 'medicion|evaluar_formula, % (ms, mediana de 5 de 7)|%', p_nombre, round(v_mediana, 2);
  raise notice 'medicion|evaluar_formula, % (buffers en las 5 medidas)|%', p_nombre, v_buffers;
  if v_buffers <> 0 then raise exception 'evaluar_formula con % leyó % buffers y no toca tablas: %', p_nombre, v_buffers, v_plan; end if;
  if p_tope_ms is not null and v_mediana > p_tope_ms then
    raise exception 'evaluar_formula con % tarda % ms y el tope es %', p_nombre, round(v_mediana, 2), p_tope_ms;
  end if;
  return v_mediana;
end $$;

-- Lo mismo con los argumentos leídos de una tabla (comprimidos), contra la llamada con literales. Devuelve las veces.
create function pg_temp.medir_de_tabla(p_nombre text, p_literales numeric) returns numeric language plpgsql as $$
declare
  v_plan jsonb;
  v_ms numeric[] := '{}';
  v_mediana numeric;
  i int;
begin
  for i in 1 .. 7 loop
    execute 'explain (analyze, format json) select public.evaluar_formula(t.d, t.p, t.e) from _argumentos t' into v_plan;
    continue when i <= 2;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
  end loop;
  v_mediana := (select percentile_cont(0.5) within group (order by x) from unnest(v_ms) x);
  raise notice 'medicion|evaluar_formula, % con los argumentos de una columna comprimida (ms, mediana de 5 de 7)|%', p_nombre, round(v_mediana, 2);
  raise notice 'medicion|evaluar_formula, % con los argumentos de una columna comprimida (veces los literales)|%', p_nombre, round(v_mediana / p_literales, 2);
  if v_mediana > 1.5 * p_literales then
    raise exception 'evaluar_formula con % y los argumentos de una columna comprimida tarda % ms: % veces los literales (el tope es 1,5): lee un argumento dentro de un bucle',
      p_nombre, round(v_mediana, 2), round(v_mediana / p_literales, 2);
  end if;
  return v_mediana / p_literales;
end $$;

do $$
declare
  v_chica jsonb := (select doc -> 'chica' from _sinteticas_del_motor);
  v_grande jsonb := (select doc -> 'grande' from _sinteticas_del_motor);
  v_vivas jsonb := (select doc -> 'con_tablas_vivas' from _sinteticas_del_motor);
  v_congeladas jsonb := (select doc -> 'con_tablas_congeladas' from _sinteticas_del_motor);
  v_grande_tablas jsonb := (select doc -> 'grande_con_tablas' from _sinteticas_del_motor);
  v_ms_chica numeric;
  v_ms_grande numeric;
  v_ms_literales numeric;
  v_sin_comprimir int;
begin
  if jsonb_array_length(v_chica -> 'definicion' -> 'nodos') <> 200 or jsonb_array_length(v_grande -> 'definicion' -> 'nodos') <> 2000 then
    raise exception 'las sintéticas no tienen 200 y 2.000 nodos';
  end if;
  -- Los argumentos, en una tabla: la columna como la deja la base (comprimida si pasa de ~2 kB).
  create temp table _argumentos (d jsonb, p jsonb, e jsonb);
  insert into _argumentos select v_grande_tablas -> 'definicion', v_grande_tablas -> 'params', v_grande_tablas -> 'entrada';
  grant select on _argumentos to authenticated;
  select count(*) into v_sin_comprimir from _argumentos where pg_column_compression(p) is null or pg_column_compression(d) is null;
  if v_sin_comprimir > 0 then raise exception 'los argumentos de la sintética con tablas no quedaron comprimidos: no mide nada'; end if;
  -- Como quien llama desde la app.
  set local role authenticated;
  if current_user <> 'authenticated' then raise exception 'la medición corre como %, no como authenticated', current_user; end if;
  -- Los topes: la mayor mediana de 3 corridas × 3 (5,34 y 45,29 ms, carga 2,2 a 3,1, el 2026-10-23; docs/RENDIMIENTO.md).
  v_ms_chica := pg_temp.medir(v_chica, '200 nodos', 16);
  v_ms_grande := pg_temp.medir(v_grande, '2.000 nodos', 136);
  raise notice 'medicion|evaluar_formula, 2.000 sobre 200 nodos (veces)|%', round(v_ms_grande / v_ms_chica, 2);
  if v_ms_grande > 12 * v_ms_chica then
    raise exception 'evaluar_formula con 2.000 nodos tarda % veces lo de 200 (el tope es 12)', round(v_ms_grande / v_ms_chica, 2);
  end if;
  -- Sin tope: las tablas grandes.
  perform pg_temp.medir(v_vivas, '200 nodos con 4 tablas vivas de 1.000 filas', null);
  perform pg_temp.medir(v_congeladas, '200 nodos con 4 tablas congeladas de 1.000 filas', null);
  -- Con tope: los argumentos de una columna comprimida, contra los mismos como literales.
  v_ms_literales := pg_temp.medir(v_grande_tablas, '2.000 nodos con 4 tablas congeladas de 1.000 filas', null);
  perform pg_temp.medir_de_tabla('2.000 nodos con 4 tablas congeladas de 1.000 filas', v_ms_literales);
end $$;

rollback;
