-- Medición de validar_formula() con una fórmula sintética de 200 y de 2.000 nodos (paso 4.05, prompt 4): `pnpm db:medir`, contra el
-- Supabase LOCAL. Las fórmulas son las de `formulaSintetica()` (src/modules/cotizaciones/entities/formula-sintetica.ts), volcadas a
-- `supabase/tests/corpus-de-formula.json` › `sinteticas`; `scripts/medir-listado.mjs` las pone en `_formulas_sinteticas` antes de
-- este archivo (la base no lee archivos del repo).
--
-- Cada tamaño: 7 corridas de EXPLAIN (ANALYZE, BUFFERS) como `authenticated`; las 2 primeras calientan (la compilación de plpgsql y
-- el caché del catálogo) y se mide la mediana de las otras 5. La llamada va sobre una subconsulta con `offset 0`: si la función
-- fuera `immutable` (lo fue hasta …005100), con constantes el planificador la evaluaría al planificar y el tiempo caería en Planning
-- Time.
-- Asserta:
--   - 0 buffers en las 5 medidas (shared, local y temp: hit, read, dirtied y written): no toca tablas;
--   - la mediana de cada tamaño ≤ su tope (la mayor de 3 corridas medidas el 2026-10-23, × 3; docs/RENDIMIENTO.md);
--   - la mediana de 2.000 nodos ≤ 12 veces la de 200 (es lineal: ×10 de tamaño; el tiempo es más ruidoso que las visitas).
\set ON_ERROR_STOP 1
begin;

create function pg_temp.medir(p_formula jsonb, p_tope_ms numeric, p_nombre text) returns numeric language plpgsql as $$
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
      'explain (analyze, buffers, format json) select public.validar_formula(x.d, x.p) from (select %L::jsonb as d, %L::jsonb as p offset 0) x',
      p_formula -> 'definicion', p_formula -> 'params') into v_plan;
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
  raise notice 'medicion|validar_formula, % (ms, mediana de 5 de 7)|%', p_nombre, round(v_mediana, 2);
  raise notice 'medicion|validar_formula, % (buffers en las 5 medidas)|%', p_nombre, v_buffers;
  if v_buffers <> 0 then raise exception 'validar_formula con % leyó % buffers y no toca tablas: %', p_nombre, v_buffers, v_plan; end if;
  if v_mediana > p_tope_ms then raise exception 'validar_formula con % tarda % ms y el tope es %', p_nombre, round(v_mediana, 2), p_tope_ms; end if;
  return v_mediana;
end $$;

do $$
declare
  v_chica jsonb := (select doc -> 'chica' from _formulas_sinteticas);
  v_grande jsonb := (select doc -> 'grande' from _formulas_sinteticas);
  v_ms_chica numeric;
  v_ms_grande numeric;
begin
  if jsonb_array_length(v_chica -> 'definicion' -> 'nodos') <> 200 or jsonb_array_length(v_grande -> 'definicion' -> 'nodos') <> 2000 then
    raise exception 'las sintéticas no tienen 200 y 2.000 nodos';
  end if;
  -- Como quien llama desde la app.
  set local role authenticated;
  if current_user <> 'authenticated' then raise exception 'la medición corre como %, no como authenticated', current_user; end if;
  -- Los topes: la mayor mediana de 3 corridas (8,57 y 81,11 ms, carga 2,18, el 2026-10-23) × 3.
  v_ms_chica := pg_temp.medir(v_chica, 26, '200 nodos');
  v_ms_grande := pg_temp.medir(v_grande, 245, '2.000 nodos');
  raise notice 'medicion|validar_formula, 2.000 sobre 200 nodos (veces)|%', round(v_ms_grande / v_ms_chica, 2);
  if v_ms_grande > 12 * v_ms_chica then
    raise exception 'validar_formula con 2.000 nodos tarda % veces lo de 200 (el tope es 12)', round(v_ms_grande / v_ms_chica, 2);
  end if;
end $$;

rollback;
