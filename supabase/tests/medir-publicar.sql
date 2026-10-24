-- Medición de guardar y publicar una fórmula con su diseño, con un diseño sintético de unos 200 y de unos 2.000 ítems (paso 4.08, prompt 2):
-- `pnpm db:medir`, contra el Supabase LOCAL. Los diseños son los de `disenoSintetico()` (src/modules/cotizaciones/entities/diseno-sintetico.ts), volcados a
-- `supabase/tests/corpus-de-diseno.json` › `sinteticas`; `scripts/medir-listado.mjs` los pone en `_disenos_sinteticos` antes de este archivo.
-- Todo corre en una transacción que se revierte: el origen, la persona, los tonos y los niveles de la medición no quedan.
--
-- Lo que mide, como `authenticated` (la dueña), con 7 corridas de EXPLAIN (ANALYZE, BUFFERS) y la mediana de las 5 últimas:
--   1. Las sondas `_tono_en_uso()` y `_nivel_en_uso()` con 200 y con 2.000 versiones archivadas: usan su GIN (plan genérico) y los bloques de
--      `formulas` (heap, índices y TOAST, por pg_stat_get_xact_blocks_fetched) no crecen con las versiones; una copia que recorre la tabla sí. Va primero:
--      con las versiones grandes de abajo, el TOAST de `formulas` taparía lo que se mide.
--   2. `formula_guardar_borrador()` y `formula_publicar()` con 206 y 2.018 ítems: ms y buffers. Publicar es lineal (valida la fórmula y el diseño y
--      compila la visibilidad): la razón 2.018/206 ≤ 12 en ms y en buffers, y un tope absoluto en ms.
--   3. `_compilar_visibilidad()` aislada (la pieza nueva), con los argumentos como literales (0 buffers) y de una columna fuera de línea: la razón ≤ 12.
--      Las guardas muerden: una copia con una búsqueda lineal por ítem pasa la razón de ms, y otra que relee el diseño por sección, la de buffers.
-- Los tonos de la medición pasan del tope de 24 (se insertan como `postgres`): el sintético trae 100.
\set ON_ERROR_STOP 1
begin;
\set carga `cat /proc/loadavg`
select set_config('medir.carga', :'carga', true) \g /dev/null

create function pg_temp.lista(p_x jsonb) returns text[] language sql as $$
  select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(p_x) x
$$;

-- Una medición cualquiera: 7 corridas de EXPLAIN de `p_consulta`; devuelve la mediana de las 5 últimas y la suma de sus bloques.
create function pg_temp.medir(p_consulta text) returns jsonb language plpgsql as $$
declare
  v_plan jsonb; v_ms numeric[] := '{}'; v_buffers bigint := 0; v_clave text; i int;
begin
  for i in 1 .. 7 loop
    execute 'explain (analyze, buffers, format json) ' || p_consulta into v_plan;
    continue when i <= 2;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    foreach v_clave in array array['Shared Hit Blocks', 'Shared Read Blocks', 'Shared Dirtied Blocks', 'Shared Written Blocks',
                                   'Local Hit Blocks', 'Local Read Blocks', 'Local Dirtied Blocks', 'Local Written Blocks',
                                   'Temp Read Blocks', 'Temp Written Blocks'] loop
      v_buffers := v_buffers + coalesce((v_plan -> 0 -> 'Plan' ->> v_clave)::bigint, 0);
    end loop;
  end loop;
  return jsonb_build_object('ms', (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m), 'buffers', v_buffers);
end $$;

-- Guardar y publicar `p_s` en `p_origen`, 7 veces: la mediana de 5 de cada uno. Cada ronda guarda un borrador nuevo y lo publica.
create function pg_temp.rondas(p_origen uuid, p_s jsonb) returns jsonb language plpgsql as $$
declare
  v_plan jsonb; v_g numeric[] := '{}'; v_p numeric[] := '{}'; v_gb bigint := 0; v_pb bigint := 0; v_clave text; i int;
begin
  for i in 1 .. 7 loop
    execute format('explain (analyze, buffers, format json) select public.formula_guardar_borrador(%L::uuid, %L::jsonb, %L::jsonb, %L::jsonb)',
                   p_origen, p_s -> 'definicion', p_s -> 'params', p_s -> 'diseno') into v_plan;
    if i > 2 then
      v_g := v_g || (v_plan -> 0 ->> 'Execution Time')::numeric;
      foreach v_clave in array array['Shared Hit Blocks', 'Shared Read Blocks', 'Shared Dirtied Blocks', 'Shared Written Blocks'] loop
        v_gb := v_gb + coalesce((v_plan -> 0 -> 'Plan' ->> v_clave)::bigint, 0);
      end loop;
    end if;
    execute format('explain (analyze, buffers, format json) select public.formula_publicar(%L::uuid, %L)', p_origen, 'medición ' || i) into v_plan;
    if i > 2 then
      v_p := v_p || (v_plan -> 0 ->> 'Execution Time')::numeric;
      foreach v_clave in array array['Shared Hit Blocks', 'Shared Read Blocks', 'Shared Dirtied Blocks', 'Shared Written Blocks'] loop
        v_pb := v_pb + coalesce((v_plan -> 0 -> 'Plan' ->> v_clave)::bigint, 0);
      end loop;
    end if;
  end loop;
  return jsonb_build_object(
    'guardar_ms', (select percentile_cont(0.5) within group (order by m) from unnest(v_g) m), 'guardar_buffers', v_gb,
    'publicar_ms', (select percentile_cont(0.5) within group (order by m) from unnest(v_p) m), 'publicar_buffers', v_pb);
end $$;

-- Una copia de una función de la base con otro nombre y un texto cambiado (para las guardas).
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

-- Los argumentos de un sintético en una tabla con el almacenamiento que se pide.
create function pg_temp.tabla(p_nombre text, p_s jsonb, p_almacenamiento text) returns void language plpgsql as $$
begin
  execute format('create temp table %I (d jsonb, s jsonb)', p_nombre);
  execute format('alter table %I alter column d set storage %s, alter column s set storage %s', p_nombre, p_almacenamiento, p_almacenamiento);
  execute format('insert into %I values (%L::jsonb, %L::jsonb)', p_nombre, p_s -> 'definicion', p_s -> 'diseno');
  execute format('grant select on %I to authenticated', p_nombre);
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres: una dueña, un origen por tamaño, los tonos y los niveles del sintético
-- ---------------------------------------------------------------------------------------------------------------------------------
do $$
declare
  v_chica jsonb := (select doc -> 'chica' from _disenos_sinteticos);
  v_grande jsonb := (select doc -> 'grande' from _disenos_sinteticos);
  v_persona constant uuid := '00000000-0000-0000-0000-0000000000e1';
  v_cuerpo text;
  v_n_chica int := (select sum(jsonb_array_length(s -> 'items')) from jsonb_array_elements(v_chica -> 'diseno' -> 'secciones') s);
  v_n_grande int := (select sum(jsonb_array_length(s -> 'items')) from jsonb_array_elements(v_grande -> 'diseno' -> 'secciones') s);
begin
  if v_n_chica < 150 or v_n_chica > 300 or v_n_grande < 1500 or v_n_grande > 3000 then
    raise exception 'las sintéticas no son de unos 200 y 2.000 ítems: % y %', v_n_chica, v_n_grande; end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir publicar: %|', current_setting('medir.carga');
  raise notice 'nota|Ítems de las sintéticas: % y %. Tonos y niveles: % y %|', v_n_chica, v_n_grande,
    jsonb_array_length(v_grande -> 'contexto' -> 'tonos'), jsonb_array_length(v_grande -> 'contexto' -> 'niveles');

  -- La dueña (la primera cuenta de una base vacía nace dueña; si ya hay equipo se le da el rol a mano).
  insert into auth.users (id, email, raw_app_meta_data) values (v_persona, 'medir-publicar@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Medir publicar', invitacion_aceptada_en = now() where id = v_persona;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select v_persona, id, false from public.roles where clave = 'dueno' on conflict do nothing;
  perform set_config('request.jwt.claim.sub', v_persona::text, true);
  perform set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_persona), true);

  insert into public.origenes (clave, nombre) values ('medir_pub_chica', 'Medir publicar chica'), ('medir_pub_grande', 'Medir publicar grande');
  insert into public.tonos (clave, nombre, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta)
  select t, 'Medir ' || t, '#fff7d6', '#e9d27a', '#1b2130', '#3e3f3c', '#797251', '#f2f4f8' from jsonb_array_elements_text(v_grande -> 'contexto' -> 'tonos') t;
  -- Los niveles del sintético: el último está retirado y nadie lo usa (_niveles_de_cotizacion() es el único punto que el 4.09 reemplaza).
  v_cuerpo := format('select %L::text[], %L::text[]', pg_temp.lista(v_grande -> 'contexto' -> 'niveles'), pg_temp.lista(v_grande -> 'contexto' -> 'retirados'));
  execute format('create or replace function public._niveles_de_cotizacion(out niveles text[], out retirados text[]) language sql stable set search_path = '''' as %L', v_cuerpo);
  perform pg_temp.tabla('_ext_chica', v_chica, 'external');
  perform pg_temp.tabla('_ext_grande', v_grande, 'external');
  if exists (select 1 from _ext_grande where pg_column_toast_chunk_id(s) is null or pg_column_compression(s) is not null) then
    raise exception 'los argumentos de _ext_grande no quedaron fuera de línea y sin comprimir: no mide nada'; end if;
  -- Las copias malas de las guardas (de la compilación aislada).
  perform pg_temp.copia('public._compilar_visibilidad(jsonb,jsonb)', 'malo_busqueda',
    array['join nodos n on n.id = i.nodo where i.con_pct', 'join nodos n on n.id = (select x.id from nodos x where x.id = i.nodo limit 1) where i.con_pct']);
  -- La sonda de tonos sin su índice: el mismo resultado con una condición que el GIN no atiende (recorre la tabla).
  perform pg_temp.copia('public._tono_en_uso(text)', 'malo_tono',
    array['public._tonos_de_grupos(f.definicion) @> jsonb_build_array(p_clave)',
          'jsonb_path_exists(f.definicion, ''$.grupos[*].tono ? (@ == $t)'', jsonb_build_object(''t'', p_clave))']);
  perform pg_temp.copia('public._compilar_visibilidad(jsonb,jsonb)', 'malo_releer',
    array['from jsonb_array_elements(p_diseno -> ''secciones'') s(value)', 'from jsonb_array_elements(p_diseno -> ''secciones'') with ordinality s(value, o)',
          'jsonb_array_elements(s.value -> ''items'') it(value)', 'jsonb_array_elements(p_diseno -> ''secciones'' -> (s.o - 1)::int -> ''items'') it(value)']);
end $$;
analyze public.formulas;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- 1. Las sondas de uso con 200 y 2.000 versiones archivadas (primero: con `formulas` casi vacía, para que mida las sondas y no el TOAST de las demás)
-- ---------------------------------------------------------------------------------------------------------------------------------
-- Los bloques que leyó `formulas` (heap, índices y TOAST) en esta transacción.
create function pg_temp.bloques_de_formulas() returns bigint language sql as $$
  select coalesce(sum(pg_stat_get_xact_blocks_fetched(i.oid)), 0) from (
    select c.oid from pg_class c where c.oid = 'public.formulas'::regclass
    union all select indexrelid from pg_index where indrelid = 'public.formulas'::regclass
    union all select reltoastrelid from pg_class where oid = 'public.formulas'::regclass and reltoastrelid <> 0) i
$$;

create function pg_temp.versiones(p_origen uuid, p_desde int, p_n int) returns void language plpgsql as $$
begin
  -- Sin la auditoría (cada fila costaría un registro): sólo se mide la sonda.
  set local session_replication_role = replica;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  select p_origen, p_desde + g, 'archivada',
         '{"nodos": [], "grupos": [{"id": "g", "etiqueta": "G", "tono": "t1", "bucket": "b"}, {"id": "h", "etiqueta": "H", "tono": "t2", "bucket": "b"}]}'::jsonb, '{}',
         '{"secciones": [{"id": "s", "nivel_ver": "n1", "items": [{"tipo": "celda", "nodo": "a", "nivel_editar": "n2"}]}]}'::jsonb, '{}'
    from generate_series(1, p_n) g;
  set local session_replication_role = origin;
end $$;

do $$
declare
  o uuid := (select id from public.origenes where clave = 'medir_pub_chica');
  v_antes bigint; v_200 bigint; v_2000 bigint; v_m200 bigint; v_m2000 bigint; v_plan text; v_linea text; v_q text; v_idx text; i int;
begin
  perform pg_temp.versiones(o, 1000, 200);
  analyze public.formulas;
  -- Calientes, y los bloques de una llamada con una clave libre.
  for i in 1 .. 3 loop perform public._tono_en_uso('libre_xx'); perform public._nivel_en_uso('libre_xx'); end loop;
  v_antes := pg_temp.bloques_de_formulas();
  perform public._tono_en_uso('libre_xx'); perform public._nivel_en_uso('libre_xx');
  v_200 := pg_temp.bloques_de_formulas() - v_antes;
  for i in 1 .. 3 loop perform pg_temp.malo_tono('libre_xx'); end loop;
  v_antes := pg_temp.bloques_de_formulas();
  perform pg_temp.malo_tono('libre_xx');
  v_m200 := pg_temp.bloques_de_formulas() - v_antes;
  perform pg_temp.versiones(o, 1200, 1800);
  analyze public.formulas;
  for i in 1 .. 3 loop perform public._tono_en_uso('libre_xx'); perform public._nivel_en_uso('libre_xx'); end loop;
  v_antes := pg_temp.bloques_de_formulas();
  perform public._tono_en_uso('libre_xx'); perform public._nivel_en_uso('libre_xx');
  v_2000 := pg_temp.bloques_de_formulas() - v_antes;
  for i in 1 .. 3 loop perform pg_temp.malo_tono('libre_xx'); end loop;
  v_antes := pg_temp.bloques_de_formulas();
  perform pg_temp.malo_tono('libre_xx');
  v_m2000 := pg_temp.bloques_de_formulas() - v_antes;
  raise notice 'medicion|_tono_en_uso y _nivel_en_uso de una clave libre, bloques de formulas con 200 versiones archivadas|%', v_200;
  raise notice 'medicion|_tono_en_uso y _nivel_en_uso de una clave libre, bloques de formulas con 2.000 versiones archivadas|%', v_2000;
  if v_200 = 0 then raise exception 'las sondas no leyeron nada de formulas: no mide nada'; end if;
  -- Lo que se compara es cuánto SUMAN 1.800 versiones más, no el total: el total lleva la basura que dejaron en el heap las corridas anteriores
  -- (cada una se revierte y el vacuum tarda) y sube de corrida en corrida (94, 113, 132…). El crecimiento es limpio.
  raise notice 'medicion|guarda, la sonda de tonos sin su índice, bloques de más con 1.800 versiones más (tiene que pasar de 50)|%', v_m2000 - v_m200;
  raise notice 'medicion|_tono_en_uso y _nivel_en_uso, bloques de más con 1.800 versiones más (menos de un tercio de lo que suma la que recorre la tabla)|%', v_2000 - v_200;
  if v_m2000 - v_m200 < 50 then
    raise exception 'la guarda no muerde: una sonda que recorre la tabla suma sólo % bloques con 1.800 versiones más (tiene que sumar 50 o más)', v_m2000 - v_m200; end if;
  if (v_2000 - v_200) * 3 > v_m2000 - v_m200 then
    raise exception 'las sondas suman % bloques de formulas con 1.800 versiones más, y una que recorre la tabla suma %: crecen con las versiones', v_2000 - v_200, v_m2000 - v_m200; end if;
  -- Cada una usa su GIN, con el plan genérico (el que usa la función tras unas llamadas), sin recorrer la tabla.
  set local plan_cache_mode = force_generic_plan;
  prepare sonda_tono(text) as with u as materialized (select distinct f.origen_id from public.formulas f
    where public._tonos_de_grupos(f.definicion) @> jsonb_build_array($1))
    select o.nombre from u join public.origenes o on o.id = u.origen_id order by o.nombre limit 1;
  prepare sonda_nivel(text) as with u as materialized (select distinct f.origen_id from public.formulas f
    where public._niveles_del_diseno(f.diseno) @> jsonb_build_array($1))
    select o.nombre from u join public.origenes o on o.id = u.origen_id order by o.nombre limit 1;
  foreach v_q in array array['sonda_tono', 'sonda_nivel'] loop
    v_plan := '';
    for v_linea in execute 'explain execute ' || v_q || '(''libre_xx'')' loop v_plan := v_plan || v_linea || E'\n'; end loop;
    v_idx := case v_q when 'sonda_tono' then 'formulas_tonos_idx' else 'formulas_niveles_idx' end;
    if position(v_idx in v_plan) = 0 or v_plan like '%Seq Scan on formulas%' then
      raise exception 'la sonda % no usa % o recorre la tabla: %', v_q, v_idx, v_plan; end if;
  end loop;
  raise notice 'nota|Las dos sondas usan su GIN (formulas_tonos_idx y formulas_niveles_idx) con el plan genérico y 2.000 versiones archivadas|';
end $$;
-- ---------------------------------------------------------------------------------------------------------------------------------
-- 2. Guardar y publicar, como authenticated
-- ---------------------------------------------------------------------------------------------------------------------------------
set local role authenticated;
do $$
declare
  v_chica jsonb := (select doc -> 'chica' from _disenos_sinteticos);
  v_grande jsonb := (select doc -> 'grande' from _disenos_sinteticos);
  o_chica uuid := (select id from public.origenes where clave = 'medir_pub_chica');
  o_grande uuid := (select id from public.origenes where clave = 'medir_pub_grande');
  a jsonb; b jsonb;
begin
  if current_user <> 'authenticated' then raise exception 'la medición corre como %, no como authenticated', current_user; end if;
  -- Una medición de algo que falla no mide nada: las dos publican y la visibilidad trae una entrada por nodo dibujado.
  perform public.formula_guardar_borrador(o_chica, v_chica -> 'definicion', v_chica -> 'params', v_chica -> 'diseno');
  perform public.formula_publicar(o_chica, 'comprobación');
  perform public.formula_guardar_borrador(o_grande, v_grande -> 'definicion', v_grande -> 'params', v_grande -> 'diseno');
  perform public.formula_publicar(o_grande, 'comprobación');
  if (select count(*) from public.formulas f, jsonb_object_keys(f.visibilidad) k where f.origen_id = o_grande and f.estado = 'publicada') < 1000 then
    raise exception 'la visibilidad del sintético grande no trae las entradas de sus ítems'; end if;

  a := pg_temp.rondas(o_chica, v_chica);
  b := pg_temp.rondas(o_grande, v_grande);
  raise notice 'medicion|formula_guardar_borrador, unos 200 ítems (ms, mediana de 5 de 7)|%', round((a ->> 'guardar_ms')::numeric, 2);
  raise notice 'medicion|formula_guardar_borrador, unos 2.000 ítems (ms, mediana de 5 de 7)|%', round((b ->> 'guardar_ms')::numeric, 2);
  raise notice 'medicion|formula_guardar_borrador, unos 200 ítems (buffers en las 5 medidas)|%', a ->> 'guardar_buffers';
  raise notice 'medicion|formula_guardar_borrador, unos 2.000 ítems (buffers en las 5 medidas)|%', b ->> 'guardar_buffers';
  raise notice 'medicion|formula_publicar, unos 200 ítems (ms, mediana de 5 de 7)|%', round((a ->> 'publicar_ms')::numeric, 2);
  raise notice 'medicion|formula_publicar, unos 2.000 ítems (ms, mediana de 5 de 7)|%', round((b ->> 'publicar_ms')::numeric, 2);
  raise notice 'medicion|formula_publicar, 2.000 sobre 200 ítems (veces)|%', round((b ->> 'publicar_ms')::numeric / (a ->> 'publicar_ms')::numeric, 2);
  raise notice 'medicion|formula_publicar, unos 200 ítems (buffers en las 5 medidas)|%', a ->> 'publicar_buffers';
  raise notice 'medicion|formula_publicar, unos 2.000 ítems (buffers en las 5 medidas)|%', b ->> 'publicar_buffers';
  raise notice 'medicion|formula_publicar, 2.000 sobre 200 ítems (buffers, veces)|%', round((b ->> 'publicar_buffers')::numeric / (a ->> 'publicar_buffers')::numeric, 2);
  -- Los topes: la mayor mediana de 3 corridas × 3 (18,01 y 181,51 ms de publicar, 11,3 y 106,4 de guardar; carga de 0,9 a 1,0 de 8 núcleos, el
  -- 2026-10-24; docs/RENDIMIENTO.md). Los bloques no dependen de la máquina: lo medido (1.943 y 17.165 de publicar) más un 20 %.
  if (a ->> 'publicar_ms')::numeric > 55 or (b ->> 'publicar_ms')::numeric > 550 then
    raise exception 'formula_publicar tarda % y % ms con unos 200 y unos 2.000 ítems (los topes son 55 y 550)', round((a ->> 'publicar_ms')::numeric, 2), round((b ->> 'publicar_ms')::numeric, 2);
  end if;
  if (a ->> 'guardar_ms')::numeric > 36 or (b ->> 'guardar_ms')::numeric > 320 then
    raise exception 'formula_guardar_borrador tarda % y % ms con unos 200 y unos 2.000 ítems (los topes son 36 y 320)', round((a ->> 'guardar_ms')::numeric, 2), round((b ->> 'guardar_ms')::numeric, 2);
  end if;
  if (a ->> 'publicar_buffers')::bigint > 2350 or (b ->> 'publicar_buffers')::bigint > 20600 then
    raise exception 'formula_publicar lee % y % buffers con unos 200 y unos 2.000 ítems (los topes son 2.350 y 20.600)', a ->> 'publicar_buffers', b ->> 'publicar_buffers';
  end if;
  if (b ->> 'publicar_ms')::numeric > 12 * (a ->> 'publicar_ms')::numeric then
    raise exception 'formula_publicar con 2.000 ítems tarda % veces lo de 200 (el tope es 12)', round((b ->> 'publicar_ms')::numeric / (a ->> 'publicar_ms')::numeric, 2);
  end if;
  if (b ->> 'publicar_buffers')::numeric > 12 * (a ->> 'publicar_buffers')::numeric then
    raise exception 'formula_publicar con 2.000 ítems lee % veces los buffers de 200 (el tope es 12)', round((b ->> 'publicar_buffers')::numeric / (a ->> 'publicar_buffers')::numeric, 2);
  end if;
  if (b ->> 'guardar_ms')::numeric > 12 * (a ->> 'guardar_ms')::numeric then
    raise exception 'formula_guardar_borrador con 2.000 ítems tarda % veces lo de 200 (el tope es 12)', round((b ->> 'guardar_ms')::numeric / (a ->> 'guardar_ms')::numeric, 2);
  end if;
end $$;
reset role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- 3. La compilación aislada y sus guardas
-- ---------------------------------------------------------------------------------------------------------------------------------
-- Como el dueño: `_compilar_visibilidad()` no es ejecutable por `authenticated` (la llama publicar, que es definer) y es pura, así que el rol no
-- cambia lo que cuesta.
do $$
declare
  v_chica jsonb := (select doc -> 'chica' from _disenos_sinteticos);
  v_grande jsonb := (select doc -> 'grande' from _disenos_sinteticos);
  a jsonb; b jsonb; ea jsonb; eb jsonb; ma jsonb; mb jsonb; rl jsonb; rg jsonb;
  c_lit constant text := 'select %s(x.d, x.s) from (select %L::jsonb as d, %L::jsonb as s offset 0) x';
begin
  a := pg_temp.medir(format(c_lit, 'public._compilar_visibilidad', v_chica -> 'definicion', v_chica -> 'diseno'));
  b := pg_temp.medir(format(c_lit, 'public._compilar_visibilidad', v_grande -> 'definicion', v_grande -> 'diseno'));
  raise notice 'medicion|_compilar_visibilidad, unos 200 ítems (ms, mediana de 5 de 7)|%', round((a ->> 'ms')::numeric, 2);
  raise notice 'medicion|_compilar_visibilidad, unos 2.000 ítems (ms, mediana de 5 de 7)|%', round((b ->> 'ms')::numeric, 2);
  raise notice 'medicion|_compilar_visibilidad, 2.000 sobre 200 ítems (veces)|%', round((b ->> 'ms')::numeric / (a ->> 'ms')::numeric, 2);
  if (a ->> 'buffers')::bigint <> 0 or (b ->> 'buffers')::bigint <> 0 then
    raise exception '_compilar_visibilidad con literales leyó % y % buffers y no toca tablas', a ->> 'buffers', b ->> 'buffers'; end if;
  if (a ->> 'ms')::numeric > 4 or (b ->> 'ms')::numeric > 27 then
    raise exception '_compilar_visibilidad tarda % y % ms con unos 200 y unos 2.000 ítems (los topes son 4 y 27)', round((a ->> 'ms')::numeric, 2), round((b ->> 'ms')::numeric, 2);
  end if;
  if (b ->> 'ms')::numeric > 12 * (a ->> 'ms')::numeric then
    raise exception '_compilar_visibilidad con 2.000 ítems tarda % veces lo de 200 (el tope es 12)', round((b ->> 'ms')::numeric / (a ->> 'ms')::numeric, 2); end if;
  ea := pg_temp.medir('select public._compilar_visibilidad(x.d, x.s) from _ext_chica x');
  eb := pg_temp.medir('select public._compilar_visibilidad(x.d, x.s) from _ext_grande x');
  raise notice 'medicion|_compilar_visibilidad, columna externa, unos 200 ítems (buffers en las 5 medidas)|%', ea ->> 'buffers';
  raise notice 'medicion|_compilar_visibilidad, columna externa, unos 2.000 ítems (buffers en las 5 medidas)|%', eb ->> 'buffers';
  raise notice 'medicion|_compilar_visibilidad, columna externa, 2.000 sobre 200 ítems (buffers, veces)|%', round((eb ->> 'buffers')::numeric / (ea ->> 'buffers')::numeric, 2);
  if (ea ->> 'buffers')::bigint = 0 then raise exception 'la columna externa no leyó nada: no mide nada'; end if;
  if (ea ->> 'buffers')::bigint > 60 or (eb ->> 'buffers')::bigint > 375 then
    raise exception '_compilar_visibilidad lee % y % buffers de la columna externa con unos 200 y unos 2.000 ítems (los topes son 60 y 375)', ea ->> 'buffers', eb ->> 'buffers';
  end if;
  if (eb ->> 'buffers')::numeric > 12 * (ea ->> 'buffers')::numeric then
    raise exception '_compilar_visibilidad con 2.000 ítems lee % veces los buffers de 200 (el tope es 12): relee un argumento dentro de un bucle',
      round((eb ->> 'buffers')::numeric / (ea ->> 'buffers')::numeric, 2); end if;
  -- Las guardas muerden.
  ma := pg_temp.medir(format(c_lit, 'pg_temp.malo_busqueda', v_chica -> 'definicion', v_chica -> 'diseno'));
  mb := pg_temp.medir(format(c_lit, 'pg_temp.malo_busqueda', v_grande -> 'definicion', v_grande -> 'diseno'));
  raise notice 'medicion|guarda, una búsqueda lineal por ítem, 2.000 sobre 200 ítems (veces; tiene que pasar de 12)|%', round((mb ->> 'ms')::numeric / (ma ->> 'ms')::numeric, 2);
  if (mb ->> 'ms')::numeric <= 12 * (ma ->> 'ms')::numeric then
    raise exception 'la guarda de tiempos no muerde: una búsqueda lineal por ítem da % veces (tiene que pasar de 12)', round((mb ->> 'ms')::numeric / (ma ->> 'ms')::numeric, 2); end if;
  rl := pg_temp.medir('select pg_temp.malo_releer(x.d, x.s) from _ext_chica x');
  rg := pg_temp.medir('select pg_temp.malo_releer(x.d, x.s) from _ext_grande x');
  raise notice 'medicion|guarda, el diseño releído por sección, columna externa, 2.000 sobre 200 ítems (buffers, veces; tiene que pasar de 12)|%', round((rg ->> 'buffers')::numeric / (rl ->> 'buffers')::numeric, 2);
  if (rg ->> 'buffers')::numeric <= 12 * (rl ->> 'buffers')::numeric then
    raise exception 'la guarda de buffers no muerde: releer el diseño por sección da % veces (tiene que pasar de 12)', round((rg ->> 'buffers')::numeric / (rl ->> 'buffers')::numeric, 2); end if;
end $$;

rollback;
