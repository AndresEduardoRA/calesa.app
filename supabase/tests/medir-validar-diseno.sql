-- Medición de validar_diseno() con un diseño sintético de unos 200 y de unos 2.000 ítems (paso 4.08, prompt 1): `pnpm db:medir`, contra
-- el Supabase LOCAL. Los diseños son los de `disenoSintetico()` (src/modules/cotizaciones/entities/diseno-sintetico.ts), volcados a
-- `supabase/tests/corpus-de-diseno.json` › `sinteticas`; `scripts/medir-listado.mjs` los pone en `_disenos_sinteticos` antes de este
-- archivo (la base no lee archivos del repo). Cada uno trae la fórmula (`definicion`, `params`), el diseño y el contexto.
--
-- Cada tamaño: 7 corridas de EXPLAIN (ANALYZE, BUFFERS) como `authenticated`; las 2 primeras calientan (la compilación de plpgsql y
-- el caché del catálogo) y se mide la mediana de las otras 5. La llamada va sobre una subconsulta con `offset 0`.
-- Dos formas de llamar:
--   - con los argumentos como literales: la función es pura y no toca tablas, así que asserta 0 buffers (shared, local y temp: hit,
--     read, dirtied y written);
--   - con los argumentos leídos de una columna `storage external` (fuera de línea y sin comprimir): es como los leerá el publicar
--     (`formulas.diseno`). Un jsonb que llega como puntero TOAST se vuelve a leer entero en cada `->`, así que los buffers crecen con
--     lo que la función relee: son la medida de «desarma cada argumento una sola vez». Es un sustituto: la columna real irá
--     comprimida, y ahí lo que se relee se paga en ms (la tercera medición, contra los literales).
-- Asserta:
--   - cada mediana ≤ su tope (la mayor de 3 corridas × 3; docs/RENDIMIENTO.md), y los buffers de la columna ≤ los suyos;
--   - la razón 2.000/200 ≤ 12, en ms y en buffers (es lineal: ×10 de tamaño; el tiempo es más ruidoso que las visitas);
--   - la columna comprimida cuesta a lo sumo 1,5 veces los literales;
--   - las guardas muerden: una copia con una búsqueda lineal por ítem tiene que pasar la razón de ms, y otra que relee `p_def` por
--     cada grupo, la de buffers. Si una guarda cae con la versión buena, se busca la causa: ningún tope se sube.
\set ON_ERROR_STOP 1
begin;
\set carga `cat /proc/loadavg`
select set_config('medir.carga', :'carga', true) \g /dev/null

-- El contexto de un sintético, como arreglos de texto.
create function pg_temp.lista(p_x jsonb) returns text[] language sql as $$
  select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(p_x) x
$$;

-- Una medición. `p_fuente` es la parte `from …` de la consulta: una subconsulta con literales o una tabla. Devuelve
-- {ms, buffers}: la mediana de las 5 corridas medidas y la suma de sus bloques.
create function pg_temp.medir(p_fn text, p_fuente text) returns jsonb language plpgsql as $$
declare
  v_plan jsonb;
  v_nodo jsonb;
  v_ms numeric[] := '{}';
  v_buffers bigint := 0;
  v_clave text;
  i int;
begin
  for i in 1 .. 7 loop
    execute format('explain (analyze, buffers, format json) select %s(x.d, x.s, x.n, x.r, x.t) %s', p_fn, p_fuente) into v_plan;
    continue when i <= 2;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    v_nodo := v_plan -> 0 -> 'Plan';
    foreach v_clave in array array['Shared Hit Blocks', 'Shared Read Blocks', 'Shared Dirtied Blocks', 'Shared Written Blocks',
                                   'Local Hit Blocks', 'Local Read Blocks', 'Local Dirtied Blocks', 'Local Written Blocks',
                                   'Temp Read Blocks', 'Temp Written Blocks'] loop
      v_buffers := v_buffers + coalesce((v_nodo ->> v_clave)::bigint, 0);
    end loop;
  end loop;
  return jsonb_build_object('ms', (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m), 'buffers', v_buffers);
end $$;

-- Con literales: una subconsulta con `offset 0`, para que el planificador no la evalúe al planificar.
create function pg_temp.literales(p_fn text, p_s jsonb) returns jsonb language plpgsql as $$
begin
  return pg_temp.medir(p_fn, format(
    'from (select %L::jsonb as d, %L::jsonb as s, %L::text[] as n, %L::text[] as r, %L::text[] as t offset 0) x',
    p_s -> 'definicion', p_s -> 'diseno', pg_temp.lista(p_s -> 'contexto' -> 'niveles'), pg_temp.lista(p_s -> 'contexto' -> 'retirados'),
    pg_temp.lista(p_s -> 'contexto' -> 'tonos')));
end $$;

-- Los argumentos de una tabla. `x` es el alias de la fila: d, s, n, r y t.
create function pg_temp.de_tabla(p_fn text, p_tabla text) returns jsonb language plpgsql as $$
begin
  return pg_temp.medir(p_fn, format('from %s x', p_tabla));
end $$;

-- Una tabla con los argumentos de un sintético, con el almacenamiento que se pide (`external` o `extended`).
create function pg_temp.tabla(p_nombre text, p_s jsonb, p_almacenamiento text) returns void language plpgsql as $$
begin
  execute format('create temp table %I (d jsonb, s jsonb, n text[], r text[], t text[])', p_nombre);
  execute format('alter table %I alter column d set storage %s, alter column s set storage %s', p_nombre, p_almacenamiento, p_almacenamiento);
  execute format('insert into %I values (%L::jsonb, %L::jsonb, %L::text[], %L::text[], %L::text[])', p_nombre,
    p_s -> 'definicion', p_s -> 'diseno', pg_temp.lista(p_s -> 'contexto' -> 'niveles'), pg_temp.lista(p_s -> 'contexto' -> 'retirados'),
    pg_temp.lista(p_s -> 'contexto' -> 'tonos'));
  execute format('grant select on %I to authenticated', p_nombre);
end $$;

-- Una copia de una función de la base con otro nombre y un texto cambiado (para las guardas). `p_cambios` son pares [de, a] que
-- tienen que estar en el texto: un cambio que no aplica no prueba nada.
create function pg_temp.copia(p_firma regprocedure, p_nombre text, p_cambios text[]) returns void language plpgsql as $$
declare
  v_def text := pg_get_functiondef(p_firma);
  v_nombre text := (select p.proname from pg_proc p where p.oid = p_firma);
  i int;
begin
  v_def := replace(v_def, 'FUNCTION public.' || v_nombre || '(', 'FUNCTION pg_temp.' || p_nombre || '(');
  for i in 1 .. cardinality(p_cambios) / 2 loop
    if position(p_cambios[2 * i - 1] in v_def) = 0 then raise exception 'la copia %: no está «%»', p_nombre, p_cambios[2 * i - 1]; end if;
    v_def := replace(v_def, p_cambios[2 * i - 1], p_cambios[2 * i]);
  end loop;
  execute v_def;
end $$;

do $$
declare
  v_chica jsonb := (select doc -> 'chica' from _disenos_sinteticos);
  v_grande jsonb := (select doc -> 'grande' from _disenos_sinteticos);
  r jsonb;
begin
  if jsonb_array_length(v_chica -> 'diseno' -> 'secciones') < 5 or jsonb_array_length(v_grande -> 'diseno' -> 'secciones') < 50 then
    raise exception 'las sintéticas no son de unos 200 y 2.000 ítems';
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir validar_diseno: %|', current_setting('medir.carga');
  raise notice 'nota|Ítems de las sintéticas: % y %|', (select sum(jsonb_array_length(s -> 'items')) from jsonb_array_elements(v_chica -> 'diseno' -> 'secciones') s),
    (select sum(jsonb_array_length(s -> 'items')) from jsonb_array_elements(v_grande -> 'diseno' -> 'secciones') s);
  -- Las tablas, antes de cambiar de rol: los argumentos fuera de línea y sin comprimir, y los mismos con el almacenamiento por defecto.
  perform pg_temp.tabla('_ext_chica', v_chica, 'external');
  perform pg_temp.tabla('_ext_grande', v_grande, 'external');
  perform pg_temp.tabla('_comp_grande', v_grande, 'extended');
  if exists (select 1 from _ext_chica where pg_column_toast_chunk_id(d) is null or pg_column_toast_chunk_id(s) is null or pg_column_compression(d) is not null)
     or exists (select 1 from _ext_grande where pg_column_toast_chunk_id(d) is null or pg_column_toast_chunk_id(s) is null or pg_column_compression(s) is not null) then
    raise exception 'los argumentos de _ext_* no quedaron fuera de línea y sin comprimir: no mide nada';
  end if;
  if exists (select 1 from _comp_grande where pg_column_compression(s) is null) then
    raise exception 'los argumentos de _comp_grande no quedaron comprimidos: no mide nada';
  end if;
  -- Las copias malas de las guardas.
  perform pg_temp.copia('public._diseno_secciones(jsonb,jsonb,text[],text[],text[],text[],boolean[],text[],jsonb,jsonb,jsonb,jsonb,jsonb)', 'malo_secciones',
    array[E'j := (p_pos ->> v_nodo)::int;\n      if j is null then\n        perform public._formula_rechazar(''nodo_inexistente'', v_nodo,\n          format(''El diseño nombra «%s», que no es un nodo de la fórmula.'', v_nodo));\n      end if;\n      v_ntipo',
          E'j := array_position(p_ids, v_nodo);\n      if j is null then\n        perform public._formula_rechazar(''nodo_inexistente'', v_nodo,\n          format(''El diseño nombra «%s», que no es un nodo de la fórmula.'', v_nodo));\n      end if;\n      v_ntipo']);
  perform pg_temp.copia('public.validar_diseno(jsonb,jsonb,text[],text[],text[])', 'malo_busqueda',
    array['public._diseno_secciones(', 'pg_temp.malo_secciones(']);
  perform pg_temp.copia('public.validar_diseno(jsonb,jsonb,text[],text[],text[])', 'malo_releer',
    array['v_g := v_grupos -> i;', 'v_g := p_def -> ''grupos'' -> i;']);
  -- Como quien llama desde la app.
  set local role authenticated;
  if current_user <> 'authenticated' then raise exception 'la medición corre como %, no como authenticated', current_user; end if;
end $$;

do $$
declare
  c_fn constant text := 'public.validar_diseno';
  v_chica jsonb := (select doc -> 'chica' from _disenos_sinteticos);
  v_grande jsonb := (select doc -> 'grande' from _disenos_sinteticos);
  a jsonb; b jsonb; ea jsonb; eb jsonb; ca jsonb; cb jsonb; ma jsonb; mb jsonb; rl jsonb; rg jsonb;
begin
  -- Literales: 0 buffers, y la razón de tiempos.
  a := pg_temp.literales(c_fn, v_chica);
  b := pg_temp.literales(c_fn, v_grande);
  raise notice 'medicion|validar_diseno, unos 200 ítems (ms, mediana de 5 de 7)|%', round((a ->> 'ms')::numeric, 2);
  raise notice 'medicion|validar_diseno, unos 2.000 ítems (ms, mediana de 5 de 7)|%', round((b ->> 'ms')::numeric, 2);
  raise notice 'medicion|validar_diseno, 2.000 sobre 200 ítems (veces)|%', round((b ->> 'ms')::numeric / (a ->> 'ms')::numeric, 2);
  if (a ->> 'buffers')::bigint <> 0 or (b ->> 'buffers')::bigint <> 0 then
    raise exception 'validar_diseno con literales leyó % y % buffers y no toca tablas', a ->> 'buffers', b ->> 'buffers';
  end if;
  -- Los topes: la mayor mediana de 4 corridas × 3 (4,87 y 44,98 ms, carga de 1,1 a 3,4 de 8 núcleos, el 2026-10-24; docs/RENDIMIENTO.md).
  if (a ->> 'ms')::numeric > 15 or (b ->> 'ms')::numeric > 136 then
    raise exception 'validar_diseno tarda % y % ms con unos 200 y unos 2.000 ítems (los topes son 15 y 136)', round((a ->> 'ms')::numeric, 2), round((b ->> 'ms')::numeric, 2);
  end if;
  if (b ->> 'ms')::numeric > 12 * (a ->> 'ms')::numeric then
    raise exception 'validar_diseno con 2.000 ítems tarda % veces lo de 200 (el tope es 12)', round((b ->> 'ms')::numeric / (a ->> 'ms')::numeric, 2);
  end if;
  -- Columna fuera de línea: los buffers de lo que la función relee, y su razón.
  ea := pg_temp.de_tabla(c_fn, '_ext_chica');
  eb := pg_temp.de_tabla(c_fn, '_ext_grande');
  raise notice 'medicion|validar_diseno, columna externa, unos 200 ítems (buffers en las 5 medidas)|%', ea ->> 'buffers';
  raise notice 'medicion|validar_diseno, columna externa, unos 2.000 ítems (buffers en las 5 medidas)|%', eb ->> 'buffers';
  raise notice 'medicion|validar_diseno, columna externa, 2.000 sobre 200 ítems (buffers, veces)|%', round((eb ->> 'buffers')::numeric / (ea ->> 'buffers')::numeric, 2);
  raise notice 'medicion|validar_diseno, columna externa, unos 2.000 ítems (ms, mediana de 5 de 7)|%', round((eb ->> 'ms')::numeric, 2);
  if (ea ->> 'buffers')::bigint = 0 then raise exception 'la columna externa no leyó nada: no mide nada'; end if;
  -- Los bloques no dependen de la máquina (265 y 1.665 en las cuatro corridas): el tope es lo medido más un 20 %.
  if (ea ->> 'buffers')::bigint > 320 or (eb ->> 'buffers')::bigint > 2000 then
    raise exception 'validar_diseno lee % y % buffers de la columna externa con unos 200 y unos 2.000 ítems (los topes son 320 y 2.000)', ea ->> 'buffers', eb ->> 'buffers';
  end if;
  if (eb ->> 'buffers')::numeric > 12 * (ea ->> 'buffers')::numeric then
    raise exception 'validar_diseno con 2.000 ítems lee % veces los buffers de 200 (el tope es 12): relee un argumento dentro de un bucle',
      round((eb ->> 'buffers')::numeric / (ea ->> 'buffers')::numeric, 2);
  end if;
  -- Columna comprimida: a lo sumo 1,5 veces los literales.
  cb := pg_temp.de_tabla(c_fn, '_comp_grande');
  raise notice 'medicion|validar_diseno, columna comprimida, unos 2.000 ítems (ms, mediana de 5 de 7)|%', round((cb ->> 'ms')::numeric, 2);
  raise notice 'medicion|validar_diseno, columna comprimida, unos 2.000 ítems (veces los literales)|%', round((cb ->> 'ms')::numeric / (b ->> 'ms')::numeric, 2);
  if (cb ->> 'ms')::numeric > 1.5 * (b ->> 'ms')::numeric then
    raise exception 'validar_diseno con los argumentos de una columna comprimida tarda % ms: % veces los literales (el tope es 1,5): lee un argumento dentro de un bucle',
      round((cb ->> 'ms')::numeric, 2), round((cb ->> 'ms')::numeric / (b ->> 'ms')::numeric, 2);
  end if;
  -- Las guardas muerden: la versión con una búsqueda lineal por ítem pasa la razón de tiempos, y la que relee `p_def` por grupo, la de buffers.
  ma := pg_temp.literales('pg_temp.malo_busqueda', v_chica);
  mb := pg_temp.literales('pg_temp.malo_busqueda', v_grande);
  raise notice 'medicion|guarda, una búsqueda lineal por ítem, 2.000 sobre 200 ítems (veces; tiene que pasar de 12)|%', round((mb ->> 'ms')::numeric / (ma ->> 'ms')::numeric, 2);
  if (mb ->> 'ms')::numeric <= 12 * (ma ->> 'ms')::numeric then
    raise exception 'la guarda de tiempos no muerde: una búsqueda lineal por ítem da % veces (tiene que pasar de 12)', round((mb ->> 'ms')::numeric / (ma ->> 'ms')::numeric, 2);
  end if;
  rl := pg_temp.de_tabla('pg_temp.malo_releer', '_ext_chica');
  rg := pg_temp.de_tabla('pg_temp.malo_releer', '_ext_grande');
  raise notice 'medicion|guarda, p_def releído por grupo, columna externa, 2.000 sobre 200 ítems (buffers, veces; tiene que pasar de 12)|%', round((rg ->> 'buffers')::numeric / (rl ->> 'buffers')::numeric, 2);
  if (rg ->> 'buffers')::numeric <= 12 * (rl ->> 'buffers')::numeric then
    raise exception 'la guarda de buffers no muerde: releer p_def por grupo da % veces (tiene que pasar de 12)', round((rg ->> 'buffers')::numeric / (rl ->> 'buffers')::numeric, 2);
  end if;
end $$;

rollback;
