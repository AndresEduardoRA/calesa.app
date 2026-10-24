-- Medición de `_nodos_visibles()` y de `_nivel_uso()` (paso 4.09, prompt 1): `pnpm db:medir`, contra el Supabase LOCAL. Los diseños son los sintéticos de
-- `disenoSintetico()` (unos 200 y 2.000 ítems; 255 y 2.487 nodos), volcados a `supabase/tests/corpus-de-diseno.json` › `sinteticas`; `scripts/medir-listado.mjs`
-- los pone en `_disenos_sinteticos` antes de este archivo. Todo corre en una transacción que se revierte.
--
--   1. `_nodos_visibles(formula)` con 255 y con 2.487 nodos, como la dueña: ms y buffers (7 corridas de EXPLAIN, la mediana de las 5 últimas). Es lineal en los nodos:
--      la razón 2.487/255 ≤ 12 en ms y en buffers, y los buffers no pasan de lo que cuesta leer la fila de la fórmula (el TOAST de `definicion` y de `visibilidad`)
--      más una constante: una copia que consulta el permiso de nivel por cada nodo (`tiene_permiso()`) los pasa por mucho y tiene que caer.
--   2. `_nivel_uso()` (sólo corre cuando eliminar un nivel se rechaza) con 200 y con 2.000 versiones archivadas que lo nombran: no lee más de un diseño por origen,
--      pero la sonda de uso toca cada versión que lo nombra (el índice entrega las coincidencias): se mide cuánto, y el tiempo de 2.000 versiones tiene tope.
\set ON_ERROR_STOP 1
begin;
\set carga `cat /proc/loadavg`
select set_config('medir.carga', :'carga', true) \g /dev/null

-- Una medición cualquiera: 7 corridas de EXPLAIN de `p_consulta`; devuelve la mediana de las 5 últimas y la suma de sus bloques.
create function pg_temp.medir(p_consulta text) returns jsonb language plpgsql as $$
declare
  v_plan jsonb; v_ms numeric[] := '{}'; v_buffers bigint := 0; v_clave text; i int;
begin
  for i in 1 .. 7 loop
    execute 'explain (analyze, buffers, format json) ' || p_consulta into v_plan;
    continue when i <= 2;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    foreach v_clave in array array['Shared Hit Blocks', 'Shared Read Blocks', 'Shared Dirtied Blocks', 'Shared Written Blocks'] loop
      v_buffers := v_buffers + coalesce((v_plan -> 0 -> 'Plan' ->> v_clave)::bigint, 0);
    end loop;
  end loop;
  return jsonb_build_object('ms', (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m), 'buffers', v_buffers);
end $$;

-- Una copia de una función de la base con otro nombre y un texto cambiado (para la guarda).
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

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres: una dueña, un origen por tamaño y su versión publicada, con la visibilidad compilada del diseño
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _f (tamano text primary key, formula uuid, nodos int);
do $$
declare
  v_persona constant uuid := '00000000-0000-0000-0000-0000000000e2';
  v_t text; v_s jsonb; v_o uuid; v_vis jsonb; v_id uuid;
begin
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir nodos visibles: %|', current_setting('medir.carga');
  insert into auth.users (id, email, raw_app_meta_data) values (v_persona, 'medir-nodos@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Medir nodos', invitacion_aceptada_en = now() where id = v_persona;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select v_persona, id, false from public.roles where clave = 'dueno' on conflict do nothing;
  perform set_config('request.jwt.claim.sub', v_persona::text, true);
  perform set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_persona), true);
  set local session_replication_role = replica;
  foreach v_t in array array['chica', 'grande'] loop
    v_s := (select doc -> v_t from _disenos_sinteticos);
    insert into public.origenes (clave, nombre) values ('medir_nv_' || v_t, 'Medir nodos ' || v_t) returning id into v_o;
    -- La visibilidad del diseño, con sus niveles pasados a «costos» (la dueña lo tiene): la mitad se ve por el nivel y la otra por «todos».
    v_vis := (select jsonb_object_agg(e.key, jsonb_build_object(
                'ver', case when e.value ->> 'ver' = 'todos' then 'todos' else 'costos' end,
                'editar', case when e.value ->> 'editar' is null then null when e.value ->> 'editar' = 'todos' then 'todos' else 'costos' end))
              from jsonb_each(public._compilar_visibilidad(v_s -> 'definicion', v_s -> 'diseno')) e);
    insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
    values (v_o, 1, 'publicada', v_s -> 'definicion', coalesce(v_s -> 'params', '{}'), v_s -> 'diseno', v_vis) returning id into v_id;
    insert into _f values (v_t, v_id, jsonb_array_length(v_s -> 'definicion' -> 'nodos'));
  end loop;
  set local session_replication_role = origin;
  if (select nodos from _f where tamano = 'chica') not between 200 and 300 or (select nodos from _f where tamano = 'grande') not between 2000 and 3000 then
    raise exception 'las sintéticas no son de unos 255 y 2.487 nodos: %', (select jsonb_agg(to_jsonb(f)) from _f f); end if;
  raise notice 'nota|Nodos de las sintéticas: % y %|', (select nodos from _f where tamano = 'chica'), (select nodos from _f where tamano = 'grande');
  -- La guarda: la misma función con el permiso de nivel preguntado por nodo.
  perform pg_temp.copia('public._nodos_visibles(uuid)', 'malo_por_nodo',
    array['(''cotizaciones.nivel.'' || (e.value ->> ''ver'') || ''.ver'') = any (v_claves)',
          'public.tiene_permiso(''cotizaciones.nivel.'' || (e.value ->> ''ver'') || ''.ver'', v_origen)']);
end $$;
analyze public.formulas;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- 1. _nodos_visibles()
-- ---------------------------------------------------------------------------------------------------------------------------------
do $$
declare
  v_c uuid := (select formula from _f where tamano = 'chica'); v_g uuid := (select formula from _f where tamano = 'grande');
  m_c jsonb; m_g jsonb; l_c jsonb; l_g jsonb; x_g jsonb; v_n int;
begin
  -- Una medición de algo que no devuelve nada no mide nada: la dueña ve y edita casi todo.
  select count(*) into v_n from public._nodos_visibles(v_g);
  if v_n < 2000 then raise exception '_nodos_visibles devuelve % nodos de la grande: no mide nada', v_n; end if;
  m_c := pg_temp.medir(format('select count(*) from public._nodos_visibles(%L::uuid)', v_c));
  m_g := pg_temp.medir(format('select count(*) from public._nodos_visibles(%L::uuid)', v_g));
  -- Lo que cuesta sólo leer la fila (el TOAST de la definición y de la visibilidad): lo mínimo que hace falta.
  l_c := pg_temp.medir(format('select jsonb_array_length(f.definicion -> ''nodos''), (select count(*) from jsonb_object_keys(f.visibilidad)) from public.formulas f where f.id = %L', v_c));
  l_g := pg_temp.medir(format('select jsonb_array_length(f.definicion -> ''nodos''), (select count(*) from jsonb_object_keys(f.visibilidad)) from public.formulas f where f.id = %L', v_g));
  x_g := pg_temp.medir(format('select count(*) from pg_temp.malo_por_nodo(%L::uuid)', v_g));
  raise notice 'medicion|_nodos_visibles, 255 nodos (ms, mediana de 5 de 7)|%', round((m_c ->> 'ms')::numeric, 2);
  raise notice 'medicion|_nodos_visibles, 2.487 nodos (ms, mediana de 5 de 7)|%', round((m_g ->> 'ms')::numeric, 2);
  raise notice 'medicion|_nodos_visibles, 2.487 sobre 255 nodos (ms, veces)|%', round((m_g ->> 'ms')::numeric / (m_c ->> 'ms')::numeric, 2);
  raise notice 'medicion|_nodos_visibles, 255 nodos (buffers en las 5 medidas)|%', m_c ->> 'buffers';
  raise notice 'medicion|_nodos_visibles, 2.487 nodos (buffers en las 5 medidas)|%', m_g ->> 'buffers';
  raise notice 'medicion|_nodos_visibles, 2.487 sobre 255 nodos (buffers, veces)|%', round((m_g ->> 'buffers')::numeric / (m_c ->> 'buffers')::numeric, 2);
  raise notice 'medicion|leer sólo la fila de la fórmula de 2.487 nodos (buffers en las 5 medidas)|%', l_g ->> 'buffers';
  raise notice 'medicion|guarda, la copia que pregunta el permiso por nodo, 2.487 nodos (buffers en las 5 medidas; tiene que pasar de lo que cuesta la fila + 600)|%', x_g ->> 'buffers';
  if (m_g ->> 'ms')::numeric / (m_c ->> 'ms')::numeric > 12 then
    raise exception '_nodos_visibles tarda % veces con 10 veces los nodos (tope 12): no es lineal', round((m_g ->> 'ms')::numeric / (m_c ->> 'ms')::numeric, 1); end if;
  if (m_g ->> 'buffers')::numeric / (m_c ->> 'buffers')::numeric > 12 then
    raise exception '_nodos_visibles lee %  veces los buffers con 10 veces los nodos (tope 12)', round((m_g ->> 'buffers')::numeric / (m_c ->> 'buffers')::numeric, 1); end if;
  -- Los buffers: la fila entera más una constante (la sesión y los permisos), nunca algo por nodo.
  if (m_g ->> 'buffers')::bigint > (l_g ->> 'buffers')::bigint + 600 then
    raise exception '_nodos_visibles lee % buffers en 5 medidas y leer la fila cuesta %: algo se lee por nodo', m_g ->> 'buffers', l_g ->> 'buffers'; end if;
  if (x_g ->> 'buffers')::bigint <= (l_g ->> 'buffers')::bigint + 600 then
    raise exception 'la guarda no muerde: preguntar el permiso por nodo lee % buffers y el tope es %', x_g ->> 'buffers', (l_g ->> 'buffers')::bigint + 600; end if;
  if (m_g ->> 'ms')::numeric > 20 then
    raise exception '_nodos_visibles de 2.487 nodos tarda % ms (tope 20)', round((m_g ->> 'ms')::numeric, 1); end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- 2. _nivel_uso() con 200 y 2.000 versiones archivadas que nombran el nivel
-- ---------------------------------------------------------------------------------------------------------------------------------
create function pg_temp.versiones(p_origen uuid, p_desde int, p_n int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  select p_origen, p_desde + g, 'archivada', '{"nodos": []}'::jsonb, '{}',
         '{"secciones": [{"id": "s", "nivel_ver": "medir_uso", "nivel_editar": "medir_uso", "items": [{"tipo": "celda", "nodo": "a"}, {"tipo": "celda", "nodo": "b"}]}]}'::jsonb, '{}'
    from generate_series(1, p_n) g;
  set local session_replication_role = origin;
end $$;

do $$
declare
  o uuid := (select id from public.origenes where clave = 'medir_nv_chica');
  m200 jsonb; m2000 jsonb; v_uso jsonb;
begin
  perform pg_temp.versiones(o, 1000, 200);
  analyze public.formulas;
  m200 := pg_temp.medir($q$select public._nivel_uso('medir_uso')$q$);
  perform pg_temp.versiones(o, 1200, 1800);
  analyze public.formulas;
  m2000 := pg_temp.medir($q$select public._nivel_uso('medir_uso')$q$);
  v_uso := public._nivel_uso('medir_uso');
  -- Cuenta sólo la versión más nueva de cada origen: 2 celdas de 1 sección, no 2.000 veces eso.
  if (v_uso ->> 'celdas')::int > 2 or (v_uso ->> 'origenes')::int <> 1 then raise exception '_nivel_uso suma versiones: %', v_uso; end if;
  raise notice 'medicion|_nivel_uso de un nivel con 200 versiones que lo nombran (ms, mediana de 5 de 7)|%', round((m200 ->> 'ms')::numeric, 2);
  raise notice 'medicion|_nivel_uso de un nivel con 2.000 versiones que lo nombran (ms, mediana de 5 de 7)|%', round((m2000 ->> 'ms')::numeric, 2);
  raise notice 'medicion|_nivel_uso con 200 versiones que lo nombran (buffers en las 5 medidas)|%', m200 ->> 'buffers';
  raise notice 'medicion|_nivel_uso con 2.000 versiones que lo nombran (buffers en las 5 medidas)|%', m2000 ->> 'buffers';
  -- Sólo corre al rechazar eliminar un nivel: crece con las versiones que lo nombran (la sonda las entrega todas), así que tiene un tope en tiempo.
  if (m2000 ->> 'ms')::numeric > 100 then
    raise exception '_nivel_uso con 2.000 versiones tarda % ms (tope 100)', round((m2000 ->> 'ms')::numeric, 1); end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- 3. niveles_con_uso() con los 9 niveles que pueden tener permisos (8 nuevos y «costos»), cada uno nombrado por 2.000 versiones archivadas (paso 4.09, prompt 2)
-- ---------------------------------------------------------------------------------------------------------------------------------
-- La pantalla de Niveles la pide al abrirse, y cada escritura (crear, renombrar, retirar, restaurar, eliminar) devuelve la misma lista: por cada nivel
-- que alguna versión nombra corre `_nivel_uso()` (la cuenta), que crece con las versiones que lo nombran. Es el peor caso: «todos», «costos» (que las hojas de fábrica
-- nombran) y 8 más —el tope de 10 corta la lista ahí—, los nueve en uso, con 2.000 versiones cada uno.
create function pg_temp.versiones_de_todos(p_origen uuid, p_desde int, p_n int) returns void language plpgsql as $$
declare v_diseno jsonb;
begin
  v_diseno := jsonb_build_object('secciones', (select jsonb_agg(jsonb_build_object('id', 's' || n, 'nivel_ver', 'medir_n' || n, 'nivel_editar', 'medir_n' || n,
                'items', jsonb_build_array(jsonb_build_object('tipo', 'celda', 'nodo', 'a'), jsonb_build_object('tipo', 'celda', 'nodo', 'b')))) from generate_series(1, 8) n));
  set local session_replication_role = replica;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  select p_origen, p_desde + g, 'archivada', '{"nodos": []}'::jsonb, '{}', v_diseno, '{}' from generate_series(1, p_n) g;
  set local session_replication_role = origin;
end $$;

do $$
declare
  o uuid := (select id from public.origenes where clave = 'medir_nv_grande');
  m jsonb; m_200 jsonb; m_sin jsonb; m_uso jsonb; r jsonb; n int;
begin
  for n in 1 .. 8 loop
    insert into public.cotizaciones_niveles (clave, nombre) values ('medir_n' || n, 'Medir ' || n);
    perform public._nivel_permisos_crear('medir_n' || n, 'Medir ' || n, false);
  end loop;
  -- Sin uso: lo que cuesta la lista con los ocho niveles nuevos que nadie nombra (la sonda sola, sin la cuenta; «costos» sí está en uso).
  analyze public.formulas;
  m_sin := pg_temp.medir($q$select public.niveles_con_uso()$q$);
  perform pg_temp.versiones_de_todos(o, 5000, 200);
  analyze public.formulas;
  m_200 := pg_temp.medir($q$select public.niveles_con_uso()$q$);
  perform pg_temp.versiones_de_todos(o, 5200, 1800);
  analyze public.formulas;
  m := pg_temp.medir($q$select public.niveles_con_uso()$q$);
  m_uso := pg_temp.medir($q$select public._nivel_uso('medir_n1')$q$);
  raise notice 'medicion|_nivel_uso de un nivel nombrado por 2.000 versiones de 8 secciones (ms, mediana de 5 de 7)|%', round((m_uso ->> 'ms')::numeric, 2);
  r := public.niveles_con_uso();
  -- Una medición de algo que no devuelve nada no mide nada: los ocho vienen con su motivo, y «costos» también.
  if (select count(*) from jsonb_array_elements(r -> 'niveles') e where e ->> 'clave' like 'medir_n%' and e ->> 'motivo_de_uso' like 'Está en 2 celdas de 1 origen%') <> 8
     or (select count(*) from jsonb_array_elements(r -> 'niveles') e where e ->> 'motivo_de_uso' is not null) <> 9 then
    raise exception 'niveles_con_uso no trae el motivo de los nueve niveles en uso: %', r; end if;
  raise notice 'medicion|niveles_con_uso con 8 niveles sin uso y «costos» en uso (ms, mediana de 5 de 7)|%', round((m_sin ->> 'ms')::numeric, 2);
  raise notice 'medicion|niveles_con_uso con 9 niveles en uso, cada uno en 200 versiones (ms, mediana de 5 de 7)|%', round((m_200 ->> 'ms')::numeric, 2);
  raise notice 'medicion|niveles_con_uso con 9 niveles en uso, cada uno en 200 versiones (buffers en las 5 medidas)|%', m_200 ->> 'buffers';
  raise notice 'medicion|niveles_con_uso con 9 niveles en uso, cada uno en 2.000 versiones (ms, mediana de 5 de 7)|%', round((m ->> 'ms')::numeric, 2);
  raise notice 'medicion|niveles_con_uso con 9 niveles en uso, cada uno en 2.000 versiones (buffers en las 5 medidas)|%', m ->> 'buffers';
  -- Lo realista (200 versiones por nivel) tiene un tope corto; lo extremo (2.000 por nivel, 18.000 diseños de 8 secciones), uno amplio: crece con las versiones que
  -- nombran cada nivel y es lo que paga cada apertura de la pantalla y cada escritura.
  if (m_200 ->> 'ms')::numeric > 60 then
    raise exception 'niveles_con_uso con 9 niveles en uso y 200 versiones cada uno tarda % ms (tope 60)', round((m_200 ->> 'ms')::numeric, 1); end if;
  if (m ->> 'ms')::numeric > 400 then
    raise exception 'niveles_con_uso con 9 niveles en uso y 2.000 versiones cada uno tarda % ms (tope 400)', round((m ->> 'ms')::numeric, 1); end if;
end $$;
rollback;
