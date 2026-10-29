-- Lo que no se ve no viaja: la lectura de una cotización (paso 4.10, prompt 1; docs/COTIZADOR.md › «Niveles de acceso», D7). La mitad de lectura de
-- `cotizaciones-visibilidad.sql`; guardar sin mandar la clave de un nodo oculto (que la conserve) lo prueba el prompt 3 (`docs/PLAN.md`, fila 4.10).
-- Corre al final de `db:probar`, después de `niveles-con-uso.sql`: la dueña es `…0001` (la crea `humo.sql`). Cada bloque abre su transacción y la
-- revierte: deja la base como la encontró.
--
-- Qué asegura:
--   1. Privilegios: `authenticated`, `anon` y PUBLIC no leen `valores`, `fuentes`, `totales` ni `tipos_cambio` de una cotización ni el `diff` de sus
--      revisiones (tres capas: has_*_privilege, aclexplode con PUBLIC e information_schema), y las columnas legibles son una lista exacta: una columna
--      nueva nace sin grant y esto obliga a decidir.
--   2. El inventario (el modelo es `numero-global.sql`): toda función que un cliente puede ejecutar y que puede devolver el contenido de esas tablas, de
--      `formulas`, de las tablas de referencia o de `actividad.antes|despues` figura en `pg_temp.cv_registro()` con su clase y su motivo, y una nueva sin
--      registrar rompe la prueba. El detector tiene su autoprueba con funciones de usar y tirar.

-- La sonda de una RPC que edita lleva `{version}`: la versión de ahora de la cotización (cada guardado la mueve).
create or replace function pg_temp.cv_ver_en(p_sql text, p_cot uuid) returns text language sql as $f$
  select replace(p_sql, '{version}', quote_literal((select actualizado_en from public.cotizaciones where id = p_cot)))
$f$;

create or replace function pg_temp.cv_estado(p_sql text) returns text language plpgsql as $f$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate;
end $f$;

-- Da ese estado (un sqlstate, o «ok» si no falla).
create or replace function pg_temp.cv_da(p_sql text, p_estado text) returns void language plpgsql as $f$
declare v text := pg_temp.cv_estado(p_sql);
begin
  if v <> p_estado then
    raise exception '% debía dar % y dio %', p_sql, p_estado, v;
  end if;
end $f$;

create or replace function pg_temp.cv_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Una persona con un rol propio: cada concesión es {clave, origen (nulo = todos), alcance}.
create or replace function pg_temp.cv_persona(p_id uuid, p_concesiones jsonb) returns void language plpgsql as $f$
declare v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('cv_' || substr(p_id::text, 30, 7), 'CV ' || substr(p_id::text, 30, 7)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c ->> 'clave', nullif(c ->> 'origen', '')::uuid, coalesce(c ->> 'alcance', 'todos')::public.alcance_permiso);
  end loop;
end $f$;

-- El recorte con los argumentos de los tests: lo visible, la definición y lo que la visibilidad nombra y quien lee no ve (el contexto lo arma _cotizacion_contexto()).
create or replace function pg_temp.cv_recorte(p_res jsonb, p_visibles text[], p_def jsonb, p_ocultos text[]) returns jsonb language plpgsql as $f$
begin
  return public._cotizacion_recorte(p_res, public._cotizacion_contexto(p_visibles, p_def,
    (select coalesce(jsonb_object_agg(x, '{}'::jsonb), '{}'::jsonb) from unnest(coalesce(p_visibles, '{}'::text[]) || coalesce(p_ocultos, '{}'::text[])) x)));
end $f$;

-- ¿Alguna hoja de p, a cualquier profundidad, es uno de esos números (como número o como el texto del número)? Para no buscar «41111» o «6.96» en el texto de una
-- respuesta que trae uuids y fechas al azar: «6.96» calza con una hora «…:36.961…» y cinco dígitos, con un uuid (4.10-3b).
create or replace function pg_temp.cv_trae(p jsonb, p_valores numeric[]) returns boolean language sql as $f$
  select exists (select 1 from jsonb_path_query(p, 'strict $.**') h
                  where (jsonb_typeof(h) = 'number' and (h #>> '{}')::numeric = any (p_valores))
                     or (jsonb_typeof(h) = 'string' and h #>> '{}' = any (p_valores::text[])))
$f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje} si falla.
create or replace function pg_temp.cv_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_e text; v_m text;
begin
  perform pg_temp.cv_como(p_quien);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'detail', v_d, 'hint', v_h);
  end;
  reset role;
  return v;
end $f$;

-- Las funciones de `public` y `web` que pueden devolver contenido de lo oculto, y si las ejecuta un cliente (`authenticated` o `anon`).
--   - Una función "puede devolver contenido" si su tipo de retorno carga datos (no void, uuid ni trigger: un número, un booleano, un entero o una fecha también pueden decir algo de un nodo oculto, 4-16).
--   - Es fuente si su texto, sin comentarios, nombra una de las tablas con una de sus columnas ocultas, hace `select *` de ellas, o devuelve su fila.
--   - Y también lo es quien la llama (cierre): una función que devuelve lo que otra leyó.
create or replace function pg_temp.cv_inventario()
returns table (id oid, nombre name, argumentos text, retorna text, ejecutable boolean) language plpgsql as $f$
declare
  v_inv oid[]; v_nuevo oid[]; v_re text;
begin
  -- Todas las funciones de `public` y `web`, con su texto sin comentarios (una sola vez).
  drop table if exists pg_temp.cv_todas;
  create temp table cv_todas on commit drop as
    select p.oid as oid_, p.proname as nombre_, pg_get_function_identity_arguments(p.oid) as args_, pg_get_function_result(p.oid) as retorna_,
           regexp_replace(p.prosrc, '--[^\n]*', '', 'g') as src_, p.prorettype as tipo_,
           -- Sólo `void`, `uuid` y `trigger` no cargan contenido: un número, un booleano, un entero o una fecha pueden ser un nodo oculto, su comparación con otro o cuándo se guardó (4-16).
           p.prorettype not in ('void'::regtype, 'uuid'::regtype, 'trigger'::regtype) as carga_,
           has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute') as ejecutable_
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'web') and p.prokind = 'f';
  -- Las fuentes: su texto nombra una de las tablas con una de sus columnas ocultas, hace `select *` de ellas o devuelve su fila.
  select coalesce(array_agg(t.oid_), '{}') into v_inv from cv_todas t where t.carga_ and (
         (t.src_ ~* '\mpublic\.cotizaciones\M' and t.src_ ~* '\m(valores|fuentes|totales|tipos_cambio)\M')
      or (t.src_ ~* '\mpublic\.cotizaciones_revisiones\M' and t.src_ ~* '\m(diff|intento|huella)\M')
      or (t.src_ ~* '\mpublic\.formulas\M' and t.src_ ~* '\m(definicion|params|diseno|visibilidad)\M')
      or (t.src_ ~* '\mpublic\.tablas_referencia(_filas)?\M' and t.src_ ~* '\m(valores|columnas)\M')
      or (t.src_ ~* '\mpublic\.actividad\M' and t.src_ ~* '\m(antes|despues)\M')
      or t.src_ ~* 'select\s+(\w+\.)?\*[^;]{0,60}from\s+public\.(cotizaciones|cotizaciones_revisiones|formulas|tablas_referencia|tablas_referencia_filas)\M'
      or t.src_ ~* '(to_jsonb|row_to_json)\s*\(\s*\w+\s*\)[^;]{0,80}from\s+public\.(cotizaciones|cotizaciones_revisiones|formulas)\M'
      or t.tipo_ in ('public.cotizaciones'::regtype, 'public.cotizaciones_revisiones'::regtype, 'public.formulas'::regtype, 'public.tablas_referencia_filas'::regtype)
      or exists (select 1 from pg_type ty where ty.oid = t.tipo_ and ty.typelem <> 0
                   and ty.typelem in ('public.cotizaciones'::regtype, 'public.cotizaciones_revisiones'::regtype, 'public.formulas'::regtype, 'public.tablas_referencia_filas'::regtype)));
  -- El cierre: quien llama a una del inventario devuelve lo que ella leyó. Una vuelta por nivel de llamadas, con UNA regex de todos los nombres (no una por par de funciones).
  loop
    v_re := '\m(' || (select string_agg(distinct t.nombre_, '|') from cv_todas t where t.oid_ = any (v_inv)) || ')\s*\(';
    v_nuevo := coalesce((select array_agg(t.oid_) from cv_todas t where t.carga_ and not t.oid_ = any (v_inv) and t.src_ ~ v_re), '{}');
    exit when cardinality(v_nuevo) = 0;
    v_inv := v_inv || v_nuevo;
  end loop;
  return query select t.oid_, t.nombre_, t.args_, t.retorna_, t.ejecutable_ from cv_todas t where t.oid_ = any (v_inv);
end $f$;

-- Lo que cada función ejecutable que puede devolver esas tablas es y por qué está bien. Las clases:
--   recorta       devuelve contenido de cotizaciones recortado por `_nodos_visibles()`: tiene una `sonda` (el SQL que la llama, con `{cot}` por la cotización) y el caso genérico la corre
--                 por cada nivel
--   configurar    sólo la ejecuta quien tiene `cotizaciones.configurar` del origen (tiene `sonda` con `{origen}`: sin ese permiso da 42501, aunque se tenga todo lo demás)
--   no_devuelve   lee esas tablas pero lo que devuelve no es contenido: conteos, ids, nombres o textos de motivo
create or replace function pg_temp.cv_registro() returns jsonb language sql as $f$
  select jsonb_build_object(
    'nivel_crear', jsonb_build_object('clase', 'no_devuelve', 'motivo', 'devuelve la lista de niveles con el uso de cada uno: conteos y el texto del motivo; _nivel_uso() lee formulas.diseno y sólo cuenta'),
    'nivel_renombrar', jsonb_build_object('clase', 'no_devuelve', 'motivo', 'devuelve la lista de niveles con el uso de cada uno: conteos y el texto del motivo'),
    'nivel_retirar', jsonb_build_object('clase', 'no_devuelve', 'motivo', 'devuelve la lista de niveles con el uso de cada uno: conteos y el texto del motivo'),
    'nivel_restaurar', jsonb_build_object('clase', 'no_devuelve', 'motivo', 'devuelve la lista de niveles con el uso de cada uno: conteos y el texto del motivo'),
    'nivel_eliminar', jsonb_build_object('clase', 'no_devuelve', 'motivo', 'devuelve la lista de niveles con el uso de cada uno: conteos y el texto del motivo'),
    'niveles_con_uso', jsonb_build_object('clase', 'no_devuelve', 'motivo', 'la lista de niveles con las banderas de lo que admiten y el texto del motivo de uso: conteos de celdas, secciones y orígenes'),
    'tono_eliminar', jsonb_build_object('clase', 'no_devuelve', 'motivo', 'devuelve la lista de tonos; _tono_en_uso() lee formulas.definicion y sólo dice el nombre de un origen'),
    'cotizacion_evaluar', jsonb_build_object('clase', 'recorta',
      'sonda', 'select public.cotizacion_evaluar(jsonb_build_object(''inputs'', jsonb_build_object({oculto}, {centinela}::numeric)), null, {origen})',
      'motivo', 'calcula con _cotizacion_armar() y devuelve _cotizacion_recorte(): lo que se tipea sólo nombra lo que se ve (un nodo oculto da el error de uno inexistente) y los overrides ocultos se descartan como inexistentes'),
    'formula_para_cotizar', jsonb_build_object('clase', 'configurar', 'sonda', 'select public.formula_para_cotizar({origen})',
      'motivo', 'la publicada entera (definicion, params, diseno y visibilidad) sólo con cotizaciones.configurar del origen; el permiso se pide antes de mirar si el origen existe'),
    'cotizacion_tabla', jsonb_build_object('clase', 'recorta', 'cubierta_por', 'el bloque «las tablas de referencia se leen por lo que la hoja ve» (necesita tablas, no nodos)',
      'motivo', 'una tabla de referencia con sólo las columnas que leen los nodos que quien llama ve en SU versión (la de la cotización, la de la hoja abierta por origen o la publicada; la entera, a quien configura); sin acceso, el error de una tabla que no existe'),
    'cotizacion_revisiones', jsonb_build_object('clase', 'recorta', 'sonda', 'select public.cotizacion_revisiones({cot})',
      'motivo', 'cada diff recortado por nodo con _nodos_visibles() de SU versión; una revisión de sólo lo oculto viaja con el diff vacío'),
    'cotizacion_hoja', jsonb_build_object('clase', 'recorta', 'cubierta_por', 'el último bloque de cotizacion-hoja.sql, por cada nivel (necesita fórmulas con lo oculto en toda forma, no un nodo centinela)',
      'motivo', 'el diseño de la hoja publicada recortado con _cotizacion_contexto() y _nodos_visibles(): un ítem viaja si su nodo se ve (más el total y lo aparte); sin etiquetas, ayudas, tonos, secciones ni modos (sólo clave y nombre) de lo oculto; la ayuda de una tabla con la regla de cotizacion_tabla'),
    'cotizacion_leer', jsonb_build_object('clase', 'recorta', 'sonda', 'select public.cotizacion_leer({cot})',
      'motivo', 'el snapshot de una cotización recortado con _nodos_visibles() de SU versión: el total y lo aparte siempre, los subtotales por grupo sólo si se ve el grupo entero'),
    'cotizacion_guardar', jsonb_build_object('clase', 'recorta',
      'sonda', 'select public.cotizacion_guardar({cot}, gen_random_uuid(), {version}, jsonb_build_object(''inputs'', jsonb_build_object(''visible'', 1.5, {oculto}, {centinela}::numeric)), null, null, null, null, false)',
      'motivo', 'calcula con SU versión (_cotizacion_armar de la cotización), completa lo que quien llama no ve ni edita con lo guardado (_cotizacion_conservar) y devuelve _cotizacion_respuesta() (el mismo recorte de cotizacion_leer): lo que se tipea sólo nombra lo que se ve y se edita (un nodo oculto da el error de uno inexistente) y la revisión que deja se recorta al leerla'),
    'cotizacion_crear', jsonb_build_object('clase', 'recorta',
      'sonda', 'select public.cotizacion_crear(gen_random_uuid(), {origen}, {lead}, jsonb_build_object(''inputs'', jsonb_build_object(''visible'', 1.5, {oculto}, {centinela}::numeric)), (public.cotizacion_hoja({origen}) ->> ''abierta''))',
      'motivo', 'calcula con _cotizacion_armar() y devuelve _cotizacion_respuesta() (el mismo recorte de cotizacion_leer): lo que se tipea sólo nombra lo que se ve y se edita (un nodo oculto da el error de uno inexistente, uno que se ve y no se edita da nodo_no_editable) y el snapshot guardado lleva los nodos que quien llama no ve con su valor de la fórmula')
  )
$f$;

-- Lo que está mal en un registro: una función ejecutable sin registrar, una registrada que ya no está (o que ya no se ejecuta), sin clase válida o sin
-- motivo, y una vista que nombra esas tablas (una vista no tiene sonda). Lee el inventario de `pg_temp.cv_inv` (el detector recorre el texto de
-- todas las funciones y en PGlite pesa: cada bloque lo calcula una vez con `create temp table cv_inv on commit drop as select * from pg_temp.cv_inventario()`).
create or replace function pg_temp.cv_problemas(p_registro jsonb) returns text[] language plpgsql as $f$
declare
  v_p text[] := '{}'; r record;
  v_clases constant text[] := array['recorta', 'configurar', 'no_devuelve'];
begin
  for r in select distinct i.nombre from pg_temp.cv_inv i where i.ejecutable loop
    if not p_registro ? r.nombre then
      v_p := v_p || ('sin registrar: ' || r.nombre);
    end if;
  end loop;
  for r in select k as nombre, p_registro -> k as ficha from jsonb_object_keys(p_registro) k loop
    if not exists (select 1 from pg_temp.cv_inv i where i.nombre = r.nombre and i.ejecutable) then
      v_p := v_p || ('figura y ya no es una función ejecutable que devuelva contenido: ' || r.nombre);
    end if;
    if (r.ficha ->> 'clase') is null or (r.ficha ->> 'clase') <> all (v_clases) then
      v_p := v_p || ('sin clase válida: ' || r.nombre);
    end if;
    if coalesce(btrim(r.ficha ->> 'motivo'), '') = '' then
      v_p := v_p || ('sin motivo: ' || r.nombre);
    end if;
    if (r.ficha ->> 'clase') in ('recorta', 'configurar') and coalesce(btrim(r.ficha ->> 'sonda'), '') = '' and coalesce(btrim(r.ficha ->> 'cubierta_por'), '') = '' then
      v_p := v_p || ('sin sonda: ' || r.nombre);
    end if;
  end loop;
  for r in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where c.relkind in ('v', 'm') and n.nspname in ('public', 'web')
              and pg_get_viewdef(c.oid) ~* '\m(cotizaciones|cotizaciones_revisiones|formulas|tablas_referencia|tablas_referencia_filas)\M' loop
    v_p := v_p || ('una vista nombra esas tablas: ' || r.relname);
  end loop;
  return v_p;
end $f$;

-- @test visibilidad: authenticated, anon y PUBLIC no leen valores, fuentes, totales ni tipos_cambio de una cotización ni el diff de sus revisiones; las columnas legibles son una lista exacta
begin;
do $$
declare
  v_ocultas constant jsonb := '{"cotizaciones": ["valores", "fuentes", "totales", "tipos_cambio"], "cotizaciones_revisiones": ["diff", "intento", "huella"]}';
  v_tabla text; v_col text; v_rol text; v_legibles text[]; v_esperadas text[];
begin
  for v_tabla in select jsonb_object_keys(v_ocultas) loop
    foreach v_col in array array(select jsonb_array_elements_text(v_ocultas -> v_tabla)) loop
      -- Capa 1: lo que Postgres dice que cada rol puede.
      foreach v_rol in array array['authenticated', 'anon'] loop
        if has_column_privilege(v_rol, format('public.%I', v_tabla), v_col, 'select') then
          raise exception '% puede leer %.%', v_rol, v_tabla, v_col;
        end if;
      end loop;
      -- Capa 2: la lista de control de acceso en bruto; PUBLIC es el grantee 0, y el de la columna y el de la tabla cuentan.
      if exists (select 1 from pg_attribute a, aclexplode(a.attacl) x
                  where a.attrelid = format('public.%I', v_tabla)::regclass and a.attname = v_col and x.grantee = 0 and x.privilege_type = 'SELECT')
         or exists (select 1 from pg_class c, aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) x
                     where c.oid = format('public.%I', v_tabla)::regclass and x.grantee = 0 and x.privilege_type = 'SELECT') then
        raise exception 'PUBLIC puede leer %.%', v_tabla, v_col;
      end if;
      -- Capa 3: lo que el catálogo estándar dice.
      if exists (select 1 from information_schema.column_privileges cp
                  where cp.table_schema = 'public' and cp.table_name = v_tabla and cp.column_name = v_col and cp.privilege_type = 'SELECT'
                    and cp.grantee in ('authenticated', 'anon', 'PUBLIC')) then
        raise exception 'information_schema dice que se puede leer %.%', v_tabla, v_col;
      end if;
    end loop;
    -- Ni el select de la tabla entera (que cubriría todas las columnas, también las que se agreguen).
    foreach v_rol in array array['authenticated', 'anon'] loop
      if has_table_privilege(v_rol, format('public.%I', v_tabla), 'select') then
        raise exception '% tiene el select de la tabla % entera', v_rol, v_tabla;
      end if;
    end loop;
    -- Las columnas legibles son todas menos las ocultas, ni una más ni una menos.
    select array_agg(a.attname order by a.attname) into v_legibles from pg_attribute a
     where a.attrelid = format('public.%I', v_tabla)::regclass and a.attnum > 0 and not a.attisdropped and has_column_privilege('authenticated', a.attrelid, a.attnum, 'select');
    select array_agg(a.attname order by a.attname) into v_esperadas from pg_attribute a
     where a.attrelid = format('public.%I', v_tabla)::regclass and a.attnum > 0 and not a.attisdropped
       and a.attname <> all (array(select jsonb_array_elements_text(v_ocultas -> v_tabla)));
    if v_legibles is distinct from v_esperadas then
      raise exception 'las columnas legibles de % no son las esperadas: % contra %', v_tabla, v_legibles, v_esperadas;
    end if;
  end loop;
  -- Ninguna de las dos tablas viaja por Realtime (entregaría la fila entera a quien escuche).
  if exists (select 1 from pg_publication_tables pt where pt.schemaname = 'public' and pt.tablename in ('cotizaciones', 'cotizaciones_revisiones')) then
    raise exception 'una publicación de Realtime lleva cotizaciones o sus revisiones';
  end if;
end $$;
rollback;

-- @test visibilidad: leer lo oculto o pedir la fila entera da 42501 como authenticated y como anon; lo legible se lee
begin;
do $$
declare
  v_legible_c constant text := 'id, numero, origen_id, lead_id, vehiculo_id, creado_por, clase, estado, titulo, formula_id, plantilla_id, total_base, moneda_mostrar, modo_tc, ver_total_bs, notas, version, creado_en, actualizado_en';
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  perform pg_temp.cv_da('select valores from public.cotizaciones', '42501');
  perform pg_temp.cv_da('select fuentes from public.cotizaciones', '42501');
  perform pg_temp.cv_da('select totales from public.cotizaciones', '42501');
  perform pg_temp.cv_da('select tipos_cambio from public.cotizaciones', '42501');
  perform pg_temp.cv_da('select * from public.cotizaciones', '42501');
  perform pg_temp.cv_da('select c from public.cotizaciones c', '42501');
  perform pg_temp.cv_da('select count(*) from public.cotizaciones where valores is not null', '42501');
  perform pg_temp.cv_da('select id from public.cotizaciones order by totales', '42501');
  perform pg_temp.cv_da('update public.cotizaciones set notas = valores::text where false', '42501');
  perform pg_temp.cv_da('select diff from public.cotizaciones_revisiones', '42501');
  perform pg_temp.cv_da('select * from public.cotizaciones_revisiones', '42501');
  perform pg_temp.cv_da('select count(*) from public.cotizaciones_revisiones where diff <> ''{}''', '42501');
  -- Lo legible sigue leyéndose (el total, el modo, el título…): sin esto el revoke sería de más.
  perform pg_temp.cv_da('select ' || v_legible_c || ' from public.cotizaciones limit 1', 'ok');
  perform pg_temp.cv_da('select id, cotizacion_id, usuario_id, creado_en from public.cotizaciones_revisiones limit 1', 'ok');
  perform pg_temp.cv_da('select count(*) from public.cotizaciones', 'ok');
  reset role;
  set local role anon;
  perform pg_temp.cv_da('select id from public.cotizaciones', '42501');
  perform pg_temp.cv_da('select valores from public.cotizaciones', '42501');
  perform pg_temp.cv_da('select id from public.cotizaciones_revisiones', '42501');
  perform pg_temp.cv_da('select diff from public.cotizaciones_revisiones', '42501');
  reset role;
end $$;
rollback;

-- @test visibilidad: el inventario de funciones que pueden devolver lo oculto está completo, y su detector encuentra lo que debe y deja pasar lo que no
begin;
-- Funciones de usar y tirar (se revierten): cada una es una forma de devolver lo oculto, o de no hacerlo.
create function public.cv_sonda_directa() returns jsonb language sql as $s$ select to_jsonb(c.valores) from public.cotizaciones c $s$;
create function public.cv_sonda_revisiones() returns jsonb language sql as $s$ select r.diff from public.cotizaciones_revisiones r $s$;
create function public.cv_sonda_formula() returns jsonb language sql as $s$ select f.definicion from public.formulas f $s$;
create function public.cv_sonda_tabla() returns jsonb language sql as $s$ select t.valores from public.tablas_referencia_filas t $s$;
create function public.cv_sonda_actividad() returns jsonb language sql as $s$ select a.antes from public.actividad a $s$;
create function public.cv_sonda_estrella() returns jsonb language plpgsql as $s$
declare f public.formulas;
begin
  select * into f from public.formulas limit 1;
  return to_jsonb(f);
end $s$;
-- Sólo su tipo de retorno la delata: el cuerpo ni nombra una columna oculta ni hace `select *`.
create function public.cv_sonda_fila() returns setof public.cotizaciones language sql as $s$ table public.cotizaciones $s$;
create function public.cv_sonda_arreglo() returns public.formulas[] language sql as $s$ select null::public.formulas[] $s$;
create function public.cv_sonda_llama() returns jsonb language sql as $s$ select public.cv_sonda_directa() $s$;
create function public.cv_sonda_comentario() returns jsonb language sql as $s$ select '{}'::jsonb -- public.cotizaciones valores
$s$;
create function public.cv_sonda_void() returns void language plpgsql as $s$
begin
  perform 1 from public.cotizaciones where valores is not null;
end $s$;
create function public.cv_sonda_inocente() returns jsonb language sql as $s$ select '{}'::jsonb $s$;
-- 4-16: lo que devuelve un número, un booleano, un entero o una fecha también puede decir algo de un nodo oculto (su valor, si vale más que algo, cuántos hay, cuándo).
create function public.cv_sonda_numeric() returns numeric language sql as $s$ select (c.valores ->> 'costo')::numeric from public.cotizaciones c limit 1 $s$;
create function public.cv_sonda_booleano() returns boolean language sql as $s$ select (c.fuentes ->> 'costo') = 'override' from public.cotizaciones c limit 1 $s$;
create function public.cv_sonda_entero() returns integer language sql as $s$ select jsonb_array_length(c.fuentes -> 'lista') from public.cotizaciones c limit 1 $s$;
create function public.cv_sonda_bigint() returns bigint language plpgsql as $s$
declare n bigint;
begin
  select count(*) into n from public.cotizaciones c where (c.totales ->> 'usd')::numeric > 100;
  return n;
end $s$;
create function public.cv_sonda_smallint() returns smallint language sql as $s$ select (c.tipos_cambio ->> 'oficial')::smallint from public.cotizaciones c limit 1 $s$;
create function public.cv_sonda_fecha() returns date language sql as $s$ select (c.valores ->> 'fecha')::date from public.cotizaciones c limit 1 $s$;
create function public.cv_sonda_cuando() returns timestamptz language sql as $s$ select (r.diff ->> 'cuando')::timestamptz from public.cotizaciones_revisiones r limit 1 $s$;
create function public.cv_sonda_intento() returns boolean language sql as $s$ select exists (select 1 from public.cotizaciones_revisiones r where r.huella is not null) $s$;
create function public.cv_sonda_numeric_llama() returns numeric language sql as $s$ select (public.cv_sonda_directa() ->> 'a')::numeric $s$;
create function public.cv_sonda_numeric_llama2() returns boolean language sql as $s$ select public.cv_sonda_numeric_llama() > 0 $s$;
-- Y las que no: un número que sólo es `total_base` (legible), un booleano que nombra las palabras en un comentario, un uuid (sin contenido) y un entero que no toca ninguna tabla.
create function public.cv_sonda_total_base() returns numeric language sql as $s$ select c.total_base from public.cotizaciones c limit 1 $s$;
create function public.cv_sonda_booleano_comentario() returns boolean language sql as $s$ select true -- public.cotizaciones valores
$s$;
create function public.cv_sonda_uuid() returns uuid language sql as $s$ select c.id from public.cotizaciones c where c.valores is not null limit 1 $s$;
create function public.cv_sonda_entero_inocente() returns integer language sql as $s$ select 1 $s$;
create function public.cv_sonda_void_llama() returns void language plpgsql as $s$
begin
  perform public.cv_sonda_directa();
end $s$;
create temp table cv_inv on commit drop as select * from pg_temp.cv_inventario();
do $$
declare
  v_buenas text[] := array['cv_sonda_directa', 'cv_sonda_revisiones', 'cv_sonda_formula', 'cv_sonda_tabla', 'cv_sonda_actividad', 'cv_sonda_estrella', 'cv_sonda_fila', 'cv_sonda_arreglo', 'cv_sonda_llama',
                           'cv_sonda_numeric', 'cv_sonda_booleano', 'cv_sonda_entero', 'cv_sonda_bigint', 'cv_sonda_smallint', 'cv_sonda_fecha', 'cv_sonda_cuando', 'cv_sonda_intento', 'cv_sonda_numeric_llama', 'cv_sonda_numeric_llama2'];
  v_malas text[] := array['cv_sonda_comentario', 'cv_sonda_void', 'cv_sonda_inocente', 'cv_sonda_total_base', 'cv_sonda_booleano_comentario', 'cv_sonda_uuid', 'cv_sonda_entero_inocente', 'cv_sonda_void_llama'];
  v_n text; v_p text[];
begin
  -- 1. El registro de hoy está completo y bien formado.
  v_p := pg_temp.cv_problemas(pg_temp.cv_registro());
  -- Las sondas de usar y tirar sin registrar son justamente el problema que esperamos: se quitan para mirar el registro real.
  v_p := array(select p from unnest(v_p) p where p not like 'sin registrar: cv\_sonda\_%');
  if cardinality(v_p) > 0 then
    raise exception 'el inventario de lo oculto tiene problemas: %', v_p;
  end if;
  -- 2. El detector encuentra cada forma de devolver lo oculto y deja pasar lo demás.
  foreach v_n in array v_buenas loop
    if not exists (select 1 from pg_temp.cv_inv i where i.nombre = v_n) then raise exception 'el detector no encuentra %', v_n; end if;
  end loop;
  foreach v_n in array v_malas loop
    if exists (select 1 from pg_temp.cv_inv i where i.nombre = v_n) then raise exception 'el detector encuentra % y no debía (comentario, void, uuid, sólo total_base o sin tablas)', v_n; end if;
  end loop;
  -- Y las reales: lo que lee el diseño o el snapshot entra; el motor puro y los validadores, que no leen ninguna tabla, no.
  foreach v_n in array array['_cotizacion_armar', '_nodos_visibles', 'cotizacion_evaluar', '_nivel_uso', 'cotizacion_hoja', '_cotizacion_hoja'] loop
    if not exists (select 1 from pg_temp.cv_inv i where i.nombre = v_n) then raise exception 'el detector no encuentra la real %', v_n; end if;
  end loop;
  foreach v_n in array array['evaluar_formula', 'validar_formula', 'validar_diseno', 'registrar_actividad', 'cotizacion_marcar_final'] loop
    if exists (select 1 from pg_temp.cv_inv i where i.nombre = v_n) then raise exception 'el detector encuentra % y no debía', v_n; end if;
  end loop;
  -- 3. Una función nueva sin registrar rompe el inventario (las sondas de arriba son ejecutables: PUBLIC ejecuta por omisión).
  v_p := pg_temp.cv_problemas(pg_temp.cv_registro());
  foreach v_n in array v_buenas loop
    if not ('sin registrar: ' || v_n) = any (v_p) then raise exception 'una función nueva (%) no rompe el inventario: %', v_n, v_p; end if;
  end loop;
  -- 4. Un registro al que le falta una, que nombra una que no existe, con una clase inventada o sin motivo, también rompe.
  v_p := pg_temp.cv_problemas(pg_temp.cv_registro() - 'nivel_crear');
  if not 'sin registrar: nivel_crear' = any (v_p) then raise exception 'quitar una del registro no rompe: %', v_p; end if;
  v_p := pg_temp.cv_problemas(pg_temp.cv_registro() || '{"no_existe": {"clase": "recorta", "motivo": "x"}}');
  if not exists (select 1 from unnest(v_p) p where p like 'figura y ya no es%: no_existe') then raise exception 'una registrada que no existe no rompe: %', v_p; end if;
  v_p := pg_temp.cv_problemas(jsonb_set(pg_temp.cv_registro(), '{nivel_crear,clase}', '"inventada"'));
  if not 'sin clase válida: nivel_crear' = any (v_p) then raise exception 'una clase inventada no rompe: %', v_p; end if;
  v_p := pg_temp.cv_problemas(jsonb_set(pg_temp.cv_registro(), '{nivel_crear,motivo}', '"  "'));
  if not 'sin motivo: nivel_crear' = any (v_p) then raise exception 'un motivo vacío no rompe: %', v_p; end if;
  v_p := pg_temp.cv_problemas(pg_temp.cv_registro() #- '{cotizacion_leer,sonda}');
  if not 'sin sonda: cotizacion_leer' = any (v_p) then raise exception 'una que recorta sin sonda no rompe: %', v_p; end if;
end $$;
rollback;

-- @test visibilidad: ninguna vista nombra cotizaciones, sus revisiones, las fórmulas ni las tablas de referencia
begin;
create temp table cv_inv on commit drop as select * from pg_temp.cv_inventario();
do $$
declare v_p text[];
begin
  v_p := array(select p from unnest(pg_temp.cv_problemas(pg_temp.cv_registro())) p where p like 'una vista%');
  if cardinality(v_p) > 0 then raise exception 'una vista lee lo oculto sin sonda: %', v_p; end if;
  -- El detector de vistas muerde: una vista de usar y tirar que nombra la tabla se encuentra.
  execute 'create view public.cv_vista_sonda as select id from public.cotizaciones';
  v_p := array(select p from unnest(pg_temp.cv_problemas(pg_temp.cv_registro())) p where p like 'una vista%');
  if not 'una vista nombra esas tablas: cv_vista_sonda' = any (v_p) then raise exception 'el detector de vistas no la ve: %', v_p; end if;
end $$;
rollback;

-- @test visibilidad: la auditoría de una cotización guarda la fila sin valores, fuentes, totales ni tipos_cambio, en el alta, la edición y el borrado
begin;
do $$
declare
  v_o uuid := (select id from public.origenes where clave = 'subasta_usa');
  v_f uuid; v_c uuid; v_n int; v_despues jsonb;
  v_ocultas constant text[] := array['valores', 'fuentes', 'totales', 'tipos_cambio'];
begin
  select id into v_f from public.formulas where origen_id = v_o and estado = 'publicada';
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo)
  values (v_o, '00000000-0000-0000-0000-000000000001', v_f, '{"remate": 111.5}', '{"remate": "input"}', '{"oficial": 6.96}', '{"usd": 111.5}', 111.5, 'Auditoría') returning id into v_c;
  update public.cotizaciones set notas = 'cambió', valores = '{"remate": 7777.5}' where id = v_c;
  delete from public.cotizaciones where id = v_c;
  select count(*) into v_n from public.actividad where tabla = 'cotizaciones' and registro_id = v_c::text;
  if v_n <> 3 then raise exception 'esperaba 3 filas de actividad (alta, edición y borrado) y hay %', v_n; end if;
  if exists (select 1 from public.actividad where tabla = 'cotizaciones' and registro_id = v_c::text
              and (coalesce(antes, '{}') ?| v_ocultas or coalesce(despues, '{}') ?| v_ocultas)) then
    raise exception 'actividad guarda el snapshot de la cotización';
  end if;
  -- El valor que se escribió no aparece en ninguna parte de lo que se auditó: ni como hoja (número o texto) ni dentro de un texto. «7777.5» lleva punto con cuatro
  -- dígitos delante, así que no puede estar dentro de un uuid ni de una fecha de la fila (`'%7777%'` sí: un id o los microsegundos lo daban, 4.10-3b).
  if exists (select 1 from public.actividad a where a.tabla = 'cotizaciones' and a.registro_id = v_c::text
                and (pg_temp.cv_trae(a.antes, '{7777.5}') or pg_temp.cv_trae(a.despues, '{7777.5}')
                     or exists (select 1 from (select jsonb_path_query(a.antes, 'strict $.**') union all select jsonb_path_query(a.despues, 'strict $.**')) x(h)
                                 where jsonb_typeof(h) = 'string' and position('7777.5' in h #>> '{}') > 0))) then
    raise exception 'el valor de un nodo quedó en actividad';
  end if;
  -- Y el resto de la fila sí: lo que se pierde es sólo el snapshot.
  select despues into v_despues from public.actividad where tabla = 'cotizaciones' and registro_id = v_c::text and accion = 'cotizaciones.insert';
  if v_despues ->> 'titulo' <> 'Auditoría' or (v_despues ->> 'total_base')::numeric <> 111.5 or v_despues ->> 'origen_id' <> v_o::text then
    raise exception 'el alta no guarda el resto de la fila: %', v_despues;
  end if;
  if not exists (select 1 from public.actividad where tabla = 'cotizaciones' and registro_id = v_c::text and accion = 'cotizaciones.update'
                  and despues ->> 'notas' = 'cambió' and antes ->> 'notas' is null) then
    raise exception 'la edición no guarda las notas de antes y de después';
  end if;
  if not exists (select 1 from public.actividad where tabla = 'cotizaciones' and registro_id = v_c::text and accion = 'cotizaciones.delete' and antes ->> 'titulo' = 'Auditoría' and despues is null) then
    raise exception 'el borrado no guarda la fila de antes';
  end if;
  -- El trigger es el nuevo y nadie lo ejecuta a mano.
  if not exists (select 1 from pg_trigger t join pg_proc p on p.oid = t.tgfoid
                  where t.tgrelid = 'public.cotizaciones'::regclass and t.tgname = 'trg_auditar' and p.proname = 'cotizacion_auditar') then
    raise exception 'cotizaciones no se audita con cotizacion_auditar()';
  end if;
  if has_function_privilege('authenticated', 'public.cotizacion_auditar()', 'execute') or has_function_privilege('anon', 'public.cotizacion_auditar()', 'execute') then
    raise exception 'cotizacion_auditar() se puede ejecutar';
  end if;
end $$;
rollback;

-- @test visibilidad: la policy de lectura y la de edición de cotizaciones, puede_cotizacion() y la regla escrita a mano dan lo mismo por persona, y siguen a un lead transferido
-- La regla (D2/D3 y «Confirmado de lo escrito»): «propios» = las que creé o las de un lead de mi cartera vigente; «todos», todas las del origen; la papelera no se ve; una cuenta
-- bloqueada no ve nada. Editar: una preventa por el alcance de `cotizaciones.editar`, o cualquier clase con `cotizaciones.final.gestionar` del origen. La regla de abajo se
-- escribió aparte, desde `usuarios_roles`, `roles_permisos` y `leads_asesores`, sin mirar la policy, `puede_cotizacion()` ni `mis_permisos()`.
begin;
create temp table cv_c (nombre text primary key, id uuid not null);
grant select on cv_c to authenticated;

-- Lo que la policy de lectura le entrega a esa persona de las cotizaciones de la prueba.
create or replace function pg_temp.cv_lee(p_quien uuid) returns uuid[] language plpgsql as $f$
declare v uuid[];
begin
  perform pg_temp.cv_como(p_quien);
  set local role authenticated;
  select coalesce(array_agg(c.id order by c.id), '{}') into v from public.cotizaciones c where c.id in (select id from cv_c);
  reset role;
  return v;
exception when others then
  reset role;
  raise;
end $f$;

-- Las que puede_cotizacion() le deja ver con esa clave.
create or replace function pg_temp.cv_puede(p_quien uuid, p_clave text) returns uuid[] language plpgsql as $f$
declare v uuid[];
begin
  perform pg_temp.cv_como(p_quien);
  set local role authenticated;
  select coalesce(array_agg(x.id order by x.id), '{}') into v from cv_c x where public.puede_cotizacion(x.id, p_clave);
  reset role;
  return v;
exception when others then
  reset role;
  raise;
end $f$;

-- La regla a mano, como postgres. `p_clave`: cotizaciones.ver o cotizaciones.editar.
create or replace function pg_temp.cv_regla(p_quien uuid, p_clave text) returns uuid[] language sql as $f$
  select coalesce(array_agg(c.id order by c.id), '{}') from public.cotizaciones c
   where c.id in (select id from cv_c) and c.eliminado_en is null
     and exists (select 1 from public.perfiles pf where pf.id = p_quien and pf.activo and not pf.bloqueado)
     and (
       exists (select 1 from public.usuarios_roles ur join public.roles_permisos rp on rp.rol_id = ur.rol_id
                where ur.usuario_id = p_quien and rp.permiso_clave = p_clave and rp.alcance = 'todos' and (rp.origen_id is null or rp.origen_id = c.origen_id))
       or (exists (select 1 from public.usuarios_roles ur join public.roles_permisos rp on rp.rol_id = ur.rol_id
                    where ur.usuario_id = p_quien and rp.permiso_clave = p_clave and (rp.origen_id is null or rp.origen_id = c.origen_id))
           and (c.creado_por = p_quien
                or c.lead_id in (select la.lead_id from public.leads_asesores la where la.usuario_id = p_quien and la.revocado_en is null)))
     )
$f$;

create or replace function pg_temp.cv_nombres(p_ids uuid[]) returns text[] language sql as $f$
  select coalesce(array_agg(x.nombre order by x.nombre), '{}') from cv_c x where x.id = any (p_ids)
$f$;

do $$
declare
  a constant uuid := '00000000-0000-0000-0000-000000000ca1'; b constant uuid := '00000000-0000-0000-0000-000000000cb1'; t constant uuid := '00000000-0000-0000-0000-000000000cc1';
  c constant uuid := '00000000-0000-0000-0000-000000000cd1'; l constant uuid := '00000000-0000-0000-0000-000000000ce1'; x constant uuid := '00000000-0000-0000-0000-000000000cf1';
  f constant uuid := '00000000-0000-0000-0000-000000000c01'; s constant uuid := '00000000-0000-0000-0000-000000000c02'; r constant uuid := '00000000-0000-0000-0000-000000000c03';
  v_web uuid := (select id from public.origenes_lead where clave = 'web');
  o1 uuid; o2 uuid; f1 uuid; f2 uuid; la uuid; lb uuid; l3 uuid; l4 uuid; v uuid; asesor uuid := (select id from public.roles where clave = 'asesor');
begin
  insert into public.origenes (clave, nombre) values ('cv_pol_1', 'CV uno') returning id into o1;
  insert into public.origenes (clave, nombre) values ('cv_pol_2', 'CV dos') returning id into o2;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o1, 1, 'publicada', '{"nodos": []}', '{}', '{}', '{}') returning id into f1;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o2, 1, 'publicada', '{"nodos": []}', '{}', '{}', '{}') returning id into f2;
  -- A y B: asesoras de fábrica («propios»). T: «todos». C: «propios» sólo en el origen 2. L: logística. X: asesora bloqueada. F: ve «todos» y cierra finales sólo en el origen 1. S: asesora sin leads.
  -- R: ve «todos» pero edita sólo «propios» (ver y editar no son lo mismo).
  perform pg_temp.cv_persona(t, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.editar')));
  perform pg_temp.cv_persona(c, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o2, 'alcance', 'propios'), jsonb_build_object('clave', 'cotizaciones.editar', 'origen', o2, 'alcance', 'propios')));
  perform pg_temp.cv_persona(f, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o1), jsonb_build_object('clave', 'cotizaciones.final.gestionar', 'origen', o1)));
  perform pg_temp.cv_persona(r, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.editar', 'alcance', 'propios')));
  insert into auth.users (id, email, raw_app_meta_data) values
    (a, 'cv-a@ejemplo.com', '{"invitado": true}'), (b, 'cv-b@ejemplo.com', '{"invitado": true}'), (l, 'cv-l@ejemplo.com', '{"invitado": true}'),
    (x, 'cv-x@ejemplo.com', '{"invitado": true}'), (s, 'cv-s@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id) values (a, asesor), (b, asesor), (x, asesor), (s, asesor), (l, (select id from public.roles where clave = 'logistica'));
  update public.perfiles set bloqueado = true where id = x;
  -- Los leads: de A, de B, uno en el limbo (sin nadie vigente) y uno en la papelera que sigue en la cartera de A.
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values
    ('CV lead de A', '73900001', a, v_web, '{}'), ('CV lead de B', '73900002', b, v_web, '{}'),
    ('CV lead en el limbo', '73900003', b, v_web, '{}'), ('CV lead en la papelera', '73900004', a, v_web, '{}');
  select id into la from public.leads where nombre = 'CV lead de A';
  select id into lb from public.leads where nombre = 'CV lead de B';
  select id into l3 from public.leads where nombre = 'CV lead en el limbo';
  select id into l4 from public.leads where nombre = 'CV lead en la papelera';
  update public.leads_asesores set revocado_en = now(), revocado_por = b where lead_id = l3;
  update public.leads set eliminado_en = now() where id = l4;
  insert into public.vehiculos (origen_id, titulo, marca) values (o1, 'CV final', 'toyota') returning id into v;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, vehiculo_id, clase, titulo, valores, tipos_cambio, totales, total_base, eliminado_en)
  select z.o, z.quien, case when z.o = o1 then f1 else f2 end, z.lead, z.veh, z.clase::public.clase_cotizacion, z.nombre, '{}', '{}', '{}', 0, z.borrada
    from (values
      ('a_la', o1, a, la, null::uuid, 'preventa', null::timestamptz),
      ('b_la', o1, b, la, null, 'preventa', null),
      ('b_lb', o1, b, lb, null, 'preventa', null),
      ('b_sin_lead', o1, b, null, null, 'preventa', null),
      ('a_o2', o2, a, null, null, 'preventa', null),
      ('b_limbo', o1, b, l3, null, 'preventa', null),
      ('b_lead_borrado', o1, b, l4, null, 'preventa', null),
      ('a_papelera', o1, a, la, null, 'preventa', now()),
      ('x_bloqueada', o1, x, null, null, 'preventa', null),
      ('a_final', o1, a, la, v, 'final', null),
      ('c_o2', o2, c, null, null, 'preventa', null),
      ('c_o1', o1, c, null, null, 'preventa', null),
      ('r_o1', o1, r, null, null, 'preventa', null)) z (nombre, o, quien, lead, veh, clase, borrada);
  insert into cv_c select titulo, id from public.cotizaciones where titulo in ('a_la', 'b_la', 'b_lb', 'b_sin_lead', 'a_o2', 'b_limbo', 'b_lead_borrado', 'a_papelera', 'x_bloqueada', 'a_final', 'c_o2', 'c_o1', 'r_o1');
  if (select count(*) from cv_c) <> 13 then raise exception 'la prueba esperaba 13 cotizaciones y hay %', (select count(*) from cv_c); end if;
end $$;

-- Cada persona, lo que ve: tres caminos (policy, puede_cotizacion, regla a mano) y los nombres concretos. Y lo que alcanza con `cotizaciones.editar` según
-- `puede_cotizacion()` (lo que usará `cotizacion_guardar`, prompt 3) contra la regla a mano: desde el 4.10-2 nadie actualiza `cotizaciones` directo, así que la policy
-- de editar ya no existe y esta función es la única regla de quién edita una (el alcance; que sea una preventa o la final es de cada RPC).
create or replace function pg_temp.cv_verificar(p_quien uuid, p_nombre text, p_ve text[]) returns void language plpgsql as $f$
declare v_regla uuid[] := pg_temp.cv_regla(p_quien, 'cotizaciones.ver'); v_lee uuid[] := pg_temp.cv_lee(p_quien);
        v_puede uuid[] := pg_temp.cv_puede(p_quien, 'cotizaciones.ver'); v_puede_e uuid[] := pg_temp.cv_puede(p_quien, 'cotizaciones.editar'); v_regla_e uuid[] := pg_temp.cv_regla(p_quien, 'cotizaciones.editar');
begin
  if v_lee is distinct from v_regla then
    raise exception 'la policy entrega a % algo distinto de la regla: policy %, regla %', p_nombre, pg_temp.cv_nombres(v_lee), pg_temp.cv_nombres(v_regla);
  end if;
  if v_puede is distinct from v_regla then
    raise exception 'puede_cotizacion() le deja ver a % algo distinto de la regla: función %, regla %', p_nombre, pg_temp.cv_nombres(v_puede), pg_temp.cv_nombres(v_regla);
  end if;
  if pg_temp.cv_nombres(v_lee) is distinct from (select array_agg(n order by n) from unnest(p_ve) n) and not (cardinality(p_ve) = 0 and cardinality(v_lee) = 0) then
    raise exception '% debía ver % y ve %', p_nombre, p_ve, pg_temp.cv_nombres(v_lee);
  end if;
  if v_puede_e is distinct from v_regla_e then
    raise exception 'puede_cotizacion(…, cotizaciones.editar) deja a % editar algo distinto de la regla: función %, regla %', p_nombre, pg_temp.cv_nombres(v_puede_e), pg_temp.cv_nombres(v_regla_e);
  end if;
end $f$;

do $$
declare
  a constant uuid := '00000000-0000-0000-0000-000000000ca1'; b constant uuid := '00000000-0000-0000-0000-000000000cb1'; t constant uuid := '00000000-0000-0000-0000-000000000cc1';
  c constant uuid := '00000000-0000-0000-0000-000000000cd1'; l constant uuid := '00000000-0000-0000-0000-000000000ce1'; x constant uuid := '00000000-0000-0000-0000-000000000cf1';
  f constant uuid := '00000000-0000-0000-0000-000000000c01'; s constant uuid := '00000000-0000-0000-0000-000000000c02'; r constant uuid := '00000000-0000-0000-0000-000000000c03'; d constant uuid := '00000000-0000-0000-0000-000000000001';
  v_todas constant text[] := array['a_la', 'b_la', 'b_lb', 'b_sin_lead', 'a_o2', 'b_limbo', 'b_lead_borrado', 'x_bloqueada', 'a_final', 'c_o2', 'c_o1', 'r_o1'];
  la uuid := (select id from public.leads where nombre = 'CV lead de A'); v_r jsonb;
begin
  -- A: las que creó y las de leads de su cartera (también una cuyo lead está en la papelera, como `mis_leads()`). Lo que edita con `cotizaciones.editar` (propios) es lo mismo, de cualquier clase.
  perform pg_temp.cv_verificar(a, 'A (propios)', array['a_la', 'b_la', 'a_o2', 'b_lead_borrado', 'a_final']);
  perform pg_temp.cv_verificar(b, 'B (propios)', array['b_la', 'b_lb', 'b_sin_lead', 'b_limbo', 'b_lead_borrado']);
  perform pg_temp.cv_verificar(t, 'T (todos)', v_todas);
  -- R ve todo y edita sólo lo suyo: ver «todos» no da editar «todos» (la regla de editar la compara `cv_verificar`).
  perform pg_temp.cv_verificar(r, 'R (ve todos, edita propios)', v_todas);
  -- C: «propios» sólo en el origen 2: lo suyo de ahí, y nada de lo que creó en el 1.
  perform pg_temp.cv_verificar(c, 'C (propios sólo en el origen 2)', array['c_o2']);
  perform pg_temp.cv_verificar(l, 'L (logística, sin cotizaciones.ver)', '{}');
  perform pg_temp.cv_verificar(x, 'X (bloqueada)', '{}');
  perform pg_temp.cv_verificar(s, 'S (sin leads ni cotizaciones propias)', '{}');
  -- F: ve todo el origen 1 y cierra finales ahí (no edita preventas con `cotizaciones.editar`: no la tiene).
  perform pg_temp.cv_verificar(f, 'F (ve todo el origen 1 y gestiona finales ahí)', array['a_la', 'b_la', 'b_lb', 'b_sin_lead', 'b_limbo', 'b_lead_borrado', 'x_bloqueada', 'a_final', 'c_o1', 'r_o1']);
  perform pg_temp.cv_verificar(d, 'la dueña', v_todas);

  -- El lead de A pasa a B: la cartera nueva ve sus cotizaciones en el acto (a_la y la final, que no veía); A, que queda como compartida, sigue viéndolas.
  perform pg_temp.cv_como(a);
  set local role authenticated;
  v_r := public.lead_transferir(la, b, a);
  reset role;
  perform pg_temp.cv_verificar(b, 'B (dueña de lo transferido)', array['a_la', 'a_final', 'b_la', 'b_lb', 'b_sin_lead', 'b_limbo', 'b_lead_borrado']);
  perform pg_temp.cv_verificar(a, 'A (que queda como compartida)', array['a_la', 'b_la', 'a_o2', 'b_lead_borrado', 'a_final']);
  perform pg_temp.cv_verificar(s, 'S (sin relación con el lead)', '{}');
  -- B le quita el acceso a A: A pierde lo que sólo veía por el lead (b_la) y conserva lo que creó (a_la, a_final).
  perform pg_temp.cv_como(b);
  set local role authenticated;
  v_r := public.lead_revocar_acceso(la, a);
  reset role;
  perform pg_temp.cv_verificar(a, 'A (sin acceso al lead)', array['a_la', 'a_o2', 'b_lead_borrado', 'a_final']);
  perform pg_temp.cv_verificar(b, 'B (sigue siendo la dueña)', array['a_la', 'a_final', 'b_la', 'b_lb', 'b_sin_lead', 'b_limbo', 'b_lead_borrado']);
end $$;

-- La policy y la función ya no arman el arreglo de la cartera, y usan la regla por fila. Y no hay policy de escritura: desde el 4.10-2 se escribe por RPC.
do $$
declare v_pol record;
begin
  for v_pol in select policyname, coalesce(qual, '') as qual from pg_policies
                where schemaname = 'public' and tablename = 'cotizaciones' and policyname = 'cotizaciones: leer' loop
    if v_pol.qual ~ 'mis_leads' then raise exception '«%» arma el arreglo de toda la cartera (mis_leads)', v_pol.policyname; end if;
    if v_pol.qual !~ 'en_cartera' or v_pol.qual !~ 'origenes_con_alcance' then raise exception '«%» no pregunta por fila con en_cartera y los orígenes con alcance', v_pol.policyname; end if;
  end loop;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'cotizaciones' and policyname = 'cotizaciones: leer') <> 1 then raise exception 'falta la policy de lectura'; end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename in ('cotizaciones', 'cotizaciones_revisiones') and cmd in ('INSERT', 'UPDATE', 'DELETE')) then
    raise exception 'cotizaciones o sus revisiones todavía tienen una policy de escritura: %', (select string_agg(tablename || ': ' || policyname, ', ') from pg_policies
      where schemaname = 'public' and tablename in ('cotizaciones', 'cotizaciones_revisiones') and cmd in ('INSERT', 'UPDATE', 'DELETE'));
  end if;
  -- Una restrictiva «para todo» (la de la papelera) sí cuenta como `ALL`, no como escritura.
  -- La papelera la esconde la policy restrictiva (para todo comando), y no la de lectura: por eso «cotizaciones: leer» puede no repetir eliminado_en.
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cotizaciones' and policyname = 'cotizaciones: fuera de la papelera'
                  and permissive = 'RESTRICTIVE' and cmd = 'ALL' and qual ~* 'eliminado_en IS NULL') then
    raise exception 'falta la policy restrictiva que esconde la papelera';
  end if;
  if (select prosrc from pg_proc where proname = 'puede_cotizacion' and pronamespace = 'public'::regnamespace) ~ 'mis_leads' then raise exception 'puede_cotizacion() arma el arreglo de toda la cartera'; end if;
  if (select prosrc from pg_proc where proname = 'puede_cotizacion' and pronamespace = 'public'::regnamespace) !~ 'en_cartera' then raise exception 'puede_cotizacion() no usa en_cartera'; end if;
end $$;
-- puede_cotizacion() contesta falso (nunca nulo) a lo que no existe, a lo que está en la papelera, a quien no puede y a una clave que no tiene.
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-000000000ca1'; l constant uuid := '00000000-0000-0000-0000-000000000ce1';
  v_la uuid := (select id from cv_c where nombre = 'a_la'); v_papelera uuid := (select id from cv_c where nombre = 'a_papelera');
begin
  perform pg_temp.cv_como(l);
  set local role authenticated;
  if public.puede_cotizacion(gen_random_uuid(), 'cotizaciones.ver') is distinct from false then raise exception 'una que no existe no da falso'; end if;
  if public.puede_cotizacion(v_la, 'cotizaciones.ver') is distinct from false then raise exception 'quien no tiene cotizaciones.ver no da falso'; end if;
  reset role;
  perform pg_temp.cv_como(a);
  set local role authenticated;
  if public.puede_cotizacion(v_la, 'cotizaciones.ver') is distinct from true then raise exception 'la creadora no puede ver la suya'; end if;
  if public.puede_cotizacion(v_papelera, 'cotizaciones.ver') is distinct from false then raise exception 'una en la papelera no da falso'; end if;
  if public.puede_cotizacion(v_la, 'cotizaciones.final.gestionar') is distinct from false then raise exception 'una clave que no tiene no da falso'; end if;
  reset role;
end $$;
rollback;

-- @test visibilidad: _cotizacion_recorte deja lo visible, el total y lo aparte, los grupos que se ven enteros y las faltas de lo visible; a quien lo ve todo, lo mismo que el motor
begin;
create temp table cv_def as select jsonb_build_object(
  'nodos', jsonb_build_array(
    jsonb_build_object('id', 'tc_o', 'tipo', 'tipo_cambio', 'clave', 'oficial'),
    jsonb_build_object('id', 'tc_p', 'tipo', 'tipo_cambio', 'clave', 'paralelo'),
    jsonb_build_object('id', 'remate', 'tipo', 'input', 'grupo', 'g1'),
    jsonb_build_object('id', 'fees', 'tipo', 'calculo', 'op', 'suma', 'grupo', 'g1'),
    jsonb_build_object('id', 'flete', 'tipo', 'input', 'grupo', 'g2'),
    jsonb_build_object('id', 'margen', 'tipo', 'input'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'salida', 'total'),
    jsonb_build_object('id', 'garantia', 'tipo', 'calculo', 'op', 'suma', 'salida', 'aparte')),
  'grupos', jsonb_build_array(jsonb_build_object('id', 'g1'), jsonb_build_object('id', 'g2'), jsonb_build_object('id', 'g3'))) as def;
create temp table cv_res as select jsonb_build_object(
  'valores', jsonb_build_object('tc_o', 6.96, 'tc_p', 12.4, 'remate', 1000, 'fees', 50, 'flete', 41111.5, 'margen', 42222.5, 'total', 99999.5, 'garantia', 55.5),
  'estados', jsonb_build_object('remate', 'activo', 'flete', 'activo', 'total', 'activo'),
  'fuentes', jsonb_build_object('remate', 'input', 'flete', 'input', 'margen', 'input'),
  'totales', jsonb_build_object(
    'grupos', jsonb_build_object('g1', jsonb_build_object('usd', 1050, 'bs', 7308, 'se_dibuja', true), 'g2', jsonb_build_object('usd', 41111.5, 'bs', 286127, 'se_dibuja', true),
                                 'g3', jsonb_build_object('usd', 0, 'bs', 0, 'se_dibuja', false)),
    'bs', 99999000.5, 'usd', 99999.5, 'suma_usd', 99999.5),
  'faltantes', jsonb_build_array(
    jsonb_build_object('codigo', 'a', 'donde', 'flete'), jsonb_build_object('codigo', 'b', 'donde', 'remate'), jsonb_build_object('codigo', 'c', 'donde', 'total'),
    jsonb_build_object('codigo', 'd', 'donde', 'g2'), jsonb_build_object('codigo', 'e', 'donde', 'g1'),
    jsonb_build_object('codigo', 'f', 'donde', 'remate', 'ref', 'margen'), jsonb_build_object('codigo', 'g', 'donde', 'remate', 'ref', 'tabla_x')),
  'overrides_descartados', jsonb_build_array(jsonb_build_object('id', 'flete', 'motivo', 'condicion_apagada'), jsonb_build_object('id', 'remate', 'motivo', 'fuera_de_variante'),
                                             jsonb_build_object('id', 'zzz', 'motivo', 'nodo_inexistente'))) as res;
do $$
declare
  v_def jsonb := (select def from cv_def); v_res jsonb := (select res from cv_res); r jsonb; v_todos text[] := array['tc_o', 'tc_p', 'remate', 'fees', 'flete', 'margen', 'total', 'garantia'];
begin
  -- 1. Quien ve remate, fees y la tarifa paralela; no ve flete, margen ni la tarifa oficial (restringidos por un nivel).
  r := pg_temp.cv_recorte(v_res, array['remate', 'fees', 'tc_p'], v_def, array['flete', 'margen', 'tc_o']);
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'valores') k) is distinct from array['fees', 'garantia', 'remate', 'tc_p', 'total'] then
    raise exception 'valores: % (el total y lo aparte viajan; flete, margen y la tarifa oficial no)', r -> 'valores';
  end if;
  if r -> 'valores' ->> 'total' <> '99999.5' or r -> 'valores' ->> 'garantia' <> '55.5' then raise exception 'el total y lo aparte viajan con su valor: %', r -> 'valores'; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'estados') k) is distinct from array['remate', 'total'] then raise exception 'estados: %', r -> 'estados'; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'fuentes') k) is distinct from array['remate'] then raise exception 'fuentes: %', r -> 'fuentes'; end if;
  -- Los subtotales: g1 se ve entero y viaja SIN Bs (la tarifa oficial está oculta), g2 no (flete), g3 no tiene nodos y viaja; el total y sus Bs, siempre; lo demás no.
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'totales' -> 'grupos') k) is distinct from array['g1', 'g3'] then raise exception 'grupos: %', r -> 'totales' -> 'grupos'; end if;
  if r -> 'totales' -> 'grupos' -> 'g1' <> '{"usd": 1050, "se_dibuja": true}'::jsonb then raise exception 'g1 sin Bs: %', r -> 'totales' -> 'grupos' -> 'g1'; end if;
  if r -> 'totales' ->> 'bs' <> '99999000.5' or r -> 'totales' ->> 'usd' <> '99999.5' or r -> 'totales' ->> 'suma_usd' <> '99999.5' then raise exception 'el total viaja: %', r -> 'totales'; end if;
  if r -> 'tipos_cambio' is not null then raise exception 'sin tipos_cambio en la entrada, no hay tipos_cambio en la salida'; end if;
  -- Las faltas de lo visible (remate, el total, g1, y una cuyo ref no es un nodo) y la marca de que hubo otras.
  if (select array_agg(f ->> 'codigo' order by f ->> 'codigo') from jsonb_array_elements(r -> 'faltantes') f) is distinct from array['b', 'c', 'e', 'g'] then raise exception 'faltantes: %', r -> 'faltantes'; end if;
  if r -> 'hay_faltantes_ocultos' is distinct from 'true'::jsonb then raise exception 'sin la marca de faltas ocultas'; end if;
  -- Los descartados: el de un nodo visible y el de un id que la fórmula no tiene (no se distingue de uno oculto que se hubiera quitado).
  if (select array_agg(f ->> 'id' order by f ->> 'id') from jsonb_array_elements(r -> 'overrides_descartados') f) is distinct from array['remate', 'zzz'] then raise exception 'descartados: %', r -> 'overrides_descartados'; end if;
  -- Nada de lo oculto aparece en ninguna parte.
  if position('41111' in r::text) > 0 or position('42222' in r::text) > 0 or position('286127' in r::text) > 0 or position('6.96' in r::text) > 0 or position('flete' in r::text) > 0 or position('margen' in r::text) > 0 then
    raise exception 'algo oculto viaja: %', r;
  end if;
  -- 2. La tarifa oficial visible: g1 viaja con su Bs, y la clave oficial en tipos_cambio.
  r := pg_temp.cv_recorte(v_res || '{"tipos_cambio": {"oficial": 6.96, "paralelo": 12.4}}', array['remate', 'fees', 'tc_p', 'tc_o'], v_def, array['flete', 'margen']);
  if r -> 'totales' -> 'grupos' -> 'g1' ->> 'bs' <> '7308' then raise exception 'g1 con su Bs: %', r -> 'totales' -> 'grupos' -> 'g1'; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'tipos_cambio') k) is distinct from array['oficial', 'paralelo'] then raise exception 'tipos_cambio: %', r -> 'tipos_cambio'; end if;
  -- 3. Con la tarifa oficial oculta, su clave no viaja en tipos_cambio.
  r := pg_temp.cv_recorte(v_res || '{"tipos_cambio": {"oficial": 6.96, "paralelo": 12.4}}', array['remate', 'fees', 'tc_p'], v_def, array['flete', 'margen', 'tc_o']);
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'tipos_cambio') k) is distinct from array['paralelo'] then raise exception 'tipos_cambio con la oficial oculta: %', r -> 'tipos_cambio'; end if;
  -- 4. Sin ningún visible, el total y lo aparte viajan igual (aunque la visibilidad los restringiera): son lo que la base manda siempre.
  r := pg_temp.cv_recorte(v_res, '{}', v_def, v_todos);
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'valores') k) is distinct from array['garantia', 'total'] then raise exception 'sólo total y aparte: %', r -> 'valores'; end if;
  r := pg_temp.cv_recorte(v_res, null, v_def, null);
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'valores') k) is distinct from array['garantia', 'total'] then raise exception 'visibles nulos: %', r -> 'valores'; end if;
  -- 5. A quien lo ve todo, lo mismo que dio el motor (sin la marca): la salida del motor no cambia.
  r := pg_temp.cv_recorte(v_res, v_todos, v_def, '{}');
  if r is distinct from v_res then raise exception 'ver todo no devuelve lo mismo: % contra %', r, v_res; end if;
  -- 6. Lo que no está en la entrada no aparece, y una forma que no es la del motor no viaja (la de la Fase 0 en totales).
  if pg_temp.cv_recorte('{}', v_todos, v_def, '{}') <> '{}'::jsonb then raise exception 'una entrada vacía da algo'; end if;
  r := pg_temp.cv_recorte('{"totales": {"total_base": 5, "por_moneda": {"USD": 5}, "por_bucket": {}}}', v_todos, v_def, '{}');
  if r <> '{"totales": {}}'::jsonb then raise exception 'la forma de la Fase 0 viaja: %', r; end if;
  -- 6b. El motor anota `donde = 'total'` (la letra) cuando el total desborda, aunque el nodo total se llame de otra manera: esa falta viaja, y la de un nodo oculto no.
  r := pg_temp.cv_recorte('{"faltantes": [{"codigo": "fuera_de_rango", "donde": "total"}, {"codigo": "x", "donde": "flete"}]}',
    array['remate'], jsonb_set(v_def, '{nodos,6,id}', '"gran_total"'), array['flete']);
  if (select array_agg(f ->> 'codigo') from jsonb_array_elements(r -> 'faltantes') f) is distinct from array['fuera_de_rango'] or r -> 'hay_faltantes_ocultos' is distinct from 'true'::jsonb then
    raise exception 'la falta del total (la letra) viaja y la de un nodo oculto no: %', r;
  end if;
  -- 7. Lo que no es un objeto o un arreglo no rompe el recorte.
  r := pg_temp.cv_recorte('{"valores": null, "totales": 5, "faltantes": {}, "overrides_descartados": "x"}', v_todos, v_def, '{}');
  if r <> '{}'::jsonb then raise exception 'una forma rara da algo: %', r; end if;
end $$;
rollback;

-- @test visibilidad: cotizacion_leer recorta por nivel con la visibilidad de SU versión, trae el total y lo aparte siempre, y niega lo que no se ve igual que lo que no existe
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  sin constant uuid := '00000000-0000-0000-0000-000000000d01'; con constant uuid := '00000000-0000-0000-0000-000000000d02'; cfg constant uuid := '00000000-0000-0000-0000-000000000d03';
  solo_editar constant uuid := '00000000-0000-0000-0000-000000000d04'; otro_origen constant uuid := '00000000-0000-0000-0000-000000000d05';
  bloqueada constant uuid := '00000000-0000-0000-0000-000000000d06'; todo constant uuid := '00000000-0000-0000-0000-000000000d07';
  o uuid; o2 uuid; f1 uuid; f2 uuid; c1 uuid; c2 uuid; c_papelera uuid; c_ajena uuid; r jsonb; v_msg text; v_cols text[]; v_def jsonb; v_res jsonb;
  v_vis1 constant jsonb := '{"remate": {"ver": "todos", "editar": "todos"}, "fees": {"ver": "todos", "editar": null}, "flete": {"ver": "costos", "editar": "costos"},
    "margen": {"ver": "costos", "editar": "costos"}, "total": {"ver": "todos", "editar": null}, "garantia": {"ver": "costos", "editar": null},
    "tc_o": {"ver": "costos", "editar": "costos"}, "tc_p": {"ver": "todos", "editar": "todos"}}';
  v_vis2 constant jsonb := '{"remate": {"ver": "todos", "editar": "todos"}, "fees": {"ver": "todos", "editar": null}, "flete": {"ver": "todos", "editar": "todos"},
    "margen": {"ver": "costos", "editar": "costos"}, "total": {"ver": "todos", "editar": null}, "garantia": {"ver": "costos", "editar": null},
    "tc_o": {"ver": "costos", "editar": "costos"}, "tc_p": {"ver": "todos", "editar": "todos"}}';
begin
  v_def := jsonb_build_object(
    'nodos', jsonb_build_array(
      jsonb_build_object('id', 'tc_o', 'tipo', 'tipo_cambio', 'clave', 'oficial'), jsonb_build_object('id', 'tc_p', 'tipo', 'tipo_cambio', 'clave', 'paralelo'),
      jsonb_build_object('id', 'remate', 'tipo', 'input', 'grupo', 'g1'), jsonb_build_object('id', 'fees', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('remate'), 'grupo', 'g1'),
      jsonb_build_object('id', 'flete', 'tipo', 'input', 'grupo', 'g2'), jsonb_build_object('id', 'margen', 'tipo', 'input'), jsonb_build_object('id', 'interno', 'tipo', 'input'),
      jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('remate'), 'salida', 'total'),
      jsonb_build_object('id', 'garantia', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('remate'), 'salida', 'aparte')),
    'grupos', jsonb_build_array(jsonb_build_object('id', 'g1'), jsonb_build_object('id', 'g2')));
  -- «interno» no figura en la visibilidad (el diseño no lo dibuja): sólo lo ve quien configura.
  v_res := jsonb_build_object(
    'valores', jsonb_build_object('tc_o', 6.96, 'tc_p', 12.4, 'remate', 1000.5, 'fees', 50.25, 'flete', 41111.5, 'margen', 42222.5, 'interno', 31313.5, 'total', 99999.5, 'garantia', 55.5),
    'fuentes', jsonb_build_object('remate', 'input', 'flete', 'input', 'margen', 'input'),
    'totales', jsonb_build_object('grupos', jsonb_build_object('g1', jsonb_build_object('usd', 1050, 'bs', 7308, 'se_dibuja', true), 'g2', jsonb_build_object('usd', 41111.5, 'bs', 286127, 'se_dibuja', true)),
                                  'bs', 99999000.5, 'usd', 99999.5, 'suma_usd', 99999.5));
  perform pg_temp.cv_persona(sin, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver')));
  perform pg_temp.cv_persona(con, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.nivel.costos.ver')));
  perform pg_temp.cv_persona(cfg, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.configurar')));
  perform pg_temp.cv_persona(todo, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.configurar'), jsonb_build_object('clave', 'cotizaciones.nivel.costos.ver')));
  perform pg_temp.cv_persona(solo_editar, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.nivel.costos.editar')));
  perform pg_temp.cv_persona(bloqueada, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.nivel.costos.ver')));
  update public.perfiles set bloqueado = true where id = bloqueada;
  insert into public.origenes (clave, nombre) values ('cv_leer', 'CV leer') returning id into o;
  insert into public.origenes (clave, nombre) values ('cv_leer_otro', 'CV leer otro') returning id into o2;
  perform pg_temp.cv_persona(otro_origen, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o2), jsonb_build_object('clave', 'cotizaciones.nivel.costos.ver', 'origen', o2)));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o, 1, 'publicada', v_def, '{}', '{}', v_vis1) returning id into f1;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o2, 1, 'publicada', v_def, '{}', '{}', v_vis1);
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo)
  values (o, duena, f1, v_res -> 'valores', v_res -> 'fuentes', '{"oficial": 6.96, "paralelo": 12.4}', v_res -> 'totales', 99999.5, 'CV leer v1') returning id into c1;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, eliminado_en)
  values (o, duena, f1, v_res -> 'valores', v_res -> 'fuentes', '{}', v_res -> 'totales', 99999.5, 'CV en la papelera', now()) returning id into c_papelera;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo)
  values (o2, duena, (select id from public.formulas where origen_id = o2), v_res -> 'valores', v_res -> 'fuentes', '{}', v_res -> 'totales', 99999.5, 'CV de otro origen') returning id into c_ajena;

  -- 1. Sin el nivel «costos»: lo que no se ve no viaja ni en las claves ni en los valores; el total y lo aparte, sí (aunque la visibilidad restringiera lo aparte a «costos»).
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_leer(%L)', c1));
  if r ? 'error' then raise exception 'quien ve la cotización no la lee: %', r; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'valores') k) is distinct from array['fees', 'garantia', 'remate', 'tc_p', 'total'] then raise exception 'valores sin el nivel: %', r -> 'valores'; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'fuentes') k) is distinct from array['remate'] then raise exception 'fuentes sin el nivel: %', r -> 'fuentes'; end if;
  if r -> 'valores' ->> 'total' <> '99999.5' or r -> 'valores' ->> 'garantia' <> '55.5' then raise exception 'sin el total o lo aparte: %', r -> 'valores'; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'totales' -> 'grupos') k) is distinct from array['g1'] then raise exception 'grupos sin el nivel: %', r -> 'totales'; end if;
  if r -> 'totales' -> 'grupos' -> 'g1' ? 'bs' then raise exception 'el Bs del grupo viaja con una tarifa oculta: %', r -> 'totales'; end if;
  if r -> 'totales' ->> 'bs' <> '99999000.5' or r -> 'totales' ->> 'usd' <> '99999.5' then raise exception 'el total en Bs y en USD viaja siempre: %', r -> 'totales'; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'tipos_cambio') k) is distinct from array['paralelo'] then raise exception 'tipos_cambio sin el nivel: %', r -> 'tipos_cambio'; end if;
  -- Los valores ocultos se buscan como hojas, no en el texto (la respuesta trae el id y las fechas de la cotización); los nombres de nodo sí como texto: no son hexadecimales.
  if pg_temp.cv_trae(r, '{41111.5, 42222.5, 286127, 6.96}') or position('flete' in r::text) > 0 or position('margen' in r::text) > 0 or position('tc_o' in r::text) > 0 then
    raise exception 'algo del nivel oculto viaja: %', r;
  end if;
  -- 2. Con el nivel: todo, los dos grupos con su Bs y las dos tarifas.
  r := pg_temp.cv_corre(con, format('select public.cotizacion_leer(%L)', c1));
  if r -> 'valores' is distinct from (v_res -> 'valores') - 'interno' or r -> 'fuentes' is distinct from v_res -> 'fuentes' or r -> 'totales' is distinct from v_res -> 'totales' then raise exception 'con el nivel debía ver todo lo que la visibilidad nombra: %', r; end if;
  if r -> 'tipos_cambio' is distinct from '{"oficial": 6.96, "paralelo": 12.4}'::jsonb then raise exception 'con el nivel, las dos tarifas: %', r -> 'tipos_cambio'; end if;
  if pg_temp.cv_trae(r, '{31313.5}') then raise exception 'un nodo que la visibilidad no nombra le llega a quien no configura: %', r; end if;
  -- 3. Quien configura el origen suma lo que la visibilidad no nombra (sin saltarse los niveles); el permiso de EDITAR el nivel, solo, no da a ver.
  r := pg_temp.cv_corre(cfg, format('select public.cotizacion_leer(%L)', c1));
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'valores') k) is distinct from array['fees', 'garantia', 'interno', 'remate', 'tc_p', 'total'] then raise exception 'quien configura, sin el nivel: %', r -> 'valores'; end if;
  if pg_temp.cv_trae(r, '{41111.5}') then raise exception 'configurar se salta el nivel: %', r; end if;
  r := pg_temp.cv_corre(todo, format('select public.cotizacion_leer(%L)', c1));
  if r -> 'valores' is distinct from v_res -> 'valores' then raise exception 'quien configura y tiene el nivel lo ve todo: %', r -> 'valores'; end if;
  r := pg_temp.cv_corre(solo_editar, format('select public.cotizacion_leer(%L)', c1));
  if pg_temp.cv_trae(r, '{41111.5}') or position('flete' in r::text) > 0 then raise exception 'editar el nivel sin verlo deja ver: %', r; end if;
  -- 4. Una versión vieja se lee con SU visibilidad: se publica la v2 (que muestra el flete a todos) y la cotización de la v1 sigue sin mostrárselo a «sin».
  update public.formulas set estado = 'archivada' where id = f1;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o, 2, 'publicada', v_def, '{}', '{}', v_vis2) returning id into f2;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo)
  values (o, duena, f2, v_res -> 'valores', v_res -> 'fuentes', '{"oficial": 6.96, "paralelo": 12.4}', v_res -> 'totales', 99999.5, 'CV leer v2') returning id into c2;
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_leer(%L)', c1));
  if r -> 'valores' ? 'flete' then raise exception 'una cotización de la v1 muestra el flete que sólo muestra la v2: %', r -> 'valores'; end if;
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_leer(%L)', c2));
  if r -> 'valores' ->> 'flete' <> '41111.5' or not (r -> 'totales' -> 'grupos' ? 'g2') then raise exception 'la de la v2 sí muestra el flete y su grupo: %', r; end if;
  if r -> 'valores' ? 'margen' then raise exception 'la v2 sigue sin mostrar el margen: %', r -> 'valores'; end if;
  -- 5. Las columnas legibles de la fila (las que dice el grant) y ninguna del snapshot.
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_leer(%L)', c2));
  select array_agg(a.attname::text order by a.attname) into v_cols from pg_attribute a
   where a.attrelid = 'public.cotizaciones'::regclass and a.attnum > 0 and not a.attisdropped and has_column_privilege('authenticated', a.attrelid, a.attnum, 'select');
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'cotizacion') k) is distinct from v_cols then raise exception 'las columnas de la fila no son las legibles: % contra %', r -> 'cotizacion', v_cols; end if;
  if r -> 'cotizacion' ?| array['valores', 'fuentes', 'totales', 'tipos_cambio'] then raise exception 'el snapshot viaja en la fila: %', r -> 'cotizacion'; end if;
  if r -> 'cotizacion' ->> 'titulo' <> 'CV leer v2' or (r -> 'cotizacion' ->> 'total_base')::numeric <> 99999.5 or r -> 'cotizacion' ->> 'formula_id' <> f2::text then raise exception 'la fila: %', r -> 'cotizacion'; end if;
  -- 6. Lo que no se ve responde como lo que no existe: el mismo error y el mismo texto (una inexistente, una en la papelera, la de un origen sin permiso y una bloqueada).
  v_msg := (pg_temp.cv_corre(sin, format('select public.cotizacion_leer(%L)', gen_random_uuid()))) ->> 'mensaje';
  if v_msg is distinct from 'No tienes acceso a esta cotización.' then raise exception 'el texto del error: %', v_msg; end if;
  if (pg_temp.cv_corre(sin, format('select public.cotizacion_leer(%L)', gen_random_uuid()))) ->> 'error' <> '42501' then raise exception 'una inexistente no da 42501'; end if;
  if pg_temp.cv_corre(sin, format('select public.cotizacion_leer(%L)', c_papelera)) is distinct from pg_temp.cv_corre(sin, format('select public.cotizacion_leer(%L)', gen_random_uuid())) then raise exception 'la papelera responde distinto de lo inexistente'; end if;
  r := pg_temp.cv_corre(otro_origen, format('select public.cotizacion_leer(%L)', c1));
  if r is distinct from pg_temp.cv_corre(otro_origen, format('select public.cotizacion_leer(%L)', gen_random_uuid())) or r ->> 'error' is distinct from '42501' then
    raise exception 'quien sólo ve otro origen: la de este origen responde distinto de lo inexistente: %', r;
  end if;
  r := pg_temp.cv_corre(otro_origen, format('select public.cotizacion_leer(%L)', c_ajena));
  if r ? 'error' or r -> 'valores' is distinct from (v_res -> 'valores') - 'interno' then raise exception 'con ver y el nivel en SU origen, ve todo lo que la visibilidad nombra: %', r; end if;
  r := pg_temp.cv_corre(bloqueada, format('select public.cotizacion_leer(%L)', c1));
  if r ->> 'error' <> '42501' or position('bloqueada' in r ->> 'mensaje') = 0 then raise exception 'una cuenta bloqueada lee, o no dice que lo está: %', r; end if;
  if (pg_temp.cv_corre(duena, 'select public.cotizacion_leer(null)')) ->> 'error' <> '42501' then raise exception 'null no da 42501'; end if;
  -- 7. Los grants: la RPC es de authenticated y de nadie más; el recorte, de nadie.
  if has_function_privilege('anon', 'public.cotizacion_leer(uuid)', 'execute') or not has_function_privilege('authenticated', 'public.cotizacion_leer(uuid)', 'execute') then raise exception 'los grants de cotizacion_leer'; end if;
  if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x where p.oid = 'public.cotizacion_leer(uuid)'::regprocedure and x.grantee = 0) then raise exception 'PUBLIC ejecuta cotizacion_leer'; end if;
  -- El recorte y su contexto son de nadie (ni authenticated, ni anon, ni PUBLIC).
  if exists (select 1 from unnest(array['public._cotizacion_recorte(jsonb,jsonb)', 'public._cotizacion_contexto(text[],jsonb,jsonb)']) f
              where has_function_privilege('anon', f, 'execute') or has_function_privilege('authenticated', f, 'execute')
                 or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x where p.oid = f::regprocedure and x.grantee = 0)) then
    raise exception 'el recorte o su contexto se pueden ejecutar';
  end if;
end $$;
rollback;

-- @test visibilidad: por cada nivel (los de fábrica y uno creado con nivel_crear), sin su permiso el id y el valor de un nodo no salen por ninguna función que recorta; con él, sí; «ver como» no cambia lo que decide la base
-- Cada función del inventario con clase «recorta» se llama con su sonda (`{cot}` y `{origen}` son los de la prueba). El permiso del nivel en otro origen, el de editar sin ver y las claves de otro nivel no dan el nodo.
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  v_reg jsonb := pg_temp.cv_registro(); v_nuevo uuid := gen_random_uuid(); v_niveles text[]; v_nivel text; v_otro_nivel text; v_i int := 0;
  o uuid; o2 uuid; v_c uuid; sin uuid; con uuid; ed uuid; ajeno uuid; otro_nivel uuid; ver_como uuid; cfg uuid; cfg_ajeno uuid; v_rol_sin uuid; v_oculto text; v_centinela text; k text; v_sql text; v_txt text;
  v_vis jsonb; v_def jsonb; v_con_como jsonb; r jsonb; v_quien uuid; v_tipea boolean; v_lead uuid; solo_ver uuid;
  ed_o2 uuid; v_int uuid; v_ver timestamptz; v_antes jsonb; v_despues jsonb; v_e jsonb; v_g jsonb; r0 jsonb; v_gsql text;
begin
  perform pg_temp.cv_como(duena);
  set local role authenticated;
  perform public.nivel_crear(v_nuevo, 'Gerencia CV');
  reset role;
  -- Las sondas que crean (`cotizacion_crear`) no piden vehículo: el ajuste de la empresa lo dice (se revierte con el bloque).
  update public.ajustes_empresa set vehiculo_obligatorio_al_cotizar = false where id = 1;
  v_niveles := array(select clave from public.cotizaciones_niveles where clave <> 'todos' order by clave);
  if cardinality(v_niveles) < 2 or not 'costos' = any (v_niveles) or not 'gerencia_cv' = any (v_niveles) then raise exception 'esperaba al menos costos y el creado: %', v_niveles; end if;
  foreach v_nivel in array v_niveles loop
    v_i := v_i + 1;
    v_oculto := 'oculto_' || v_nivel;
    v_centinela := (90000 + v_i * 111)::text || '.43';
    v_otro_nivel := (array(select clave from public.cotizaciones_niveles where clave <> 'todos' and clave <> v_nivel order by clave))[1];
    insert into public.origenes (clave, nombre) values ('cv_gen_' || v_i, 'CV generico ' || v_i) returning id into o;
    insert into public.origenes (clave, nombre) values ('cv_gen_otro_' || v_i, 'CV generico otro ' || v_i) returning id into o2;
    -- Una fórmula que el motor evalúa (la forma de la Fase 0: un tipo de cambio y un bucket): dos inputs, uno visible y otro de ese nivel, que suman al total.
    v_def := jsonb_build_object('nodos', jsonb_build_array(
      jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
      jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
      jsonb_build_object('id', v_oculto, 'tipo', 'input', 'etiqueta', 'Oculto', 'bucket', 'origen'),
      jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible', v_oculto), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
      'buckets', jsonb_build_object('origen', 'tc'));
    v_vis := jsonb_build_object('tc', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'),
                                v_oculto, jsonb_build_object('ver', v_nivel, 'editar', v_nivel), 'total', jsonb_build_object('ver', 'todos', 'editar', null));
    insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o, 1, 'publicada', v_def, '{}', '{}', v_vis);
    -- Un lead que ven todas las personas con `leads.ver` (para lo que crea: el lead es obligatorio).
    insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
    values ('CV lead generico ' || v_i, '7214' || lpad(v_i::text, 4, '0'), duena, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into v_lead;
    insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo)
    values (o, duena, (select id from public.formulas where origen_id = o), jsonb_build_object('visible', 111.25, v_oculto, v_centinela::numeric, 'total', 123456.78),
            jsonb_build_object('visible', 'input', v_oculto, 'input'), '{}', '{"bs": 123456.78, "usd": 123456.78, "suma_usd": 123456.78}', 123456.78, 'CV generico ' || v_i) returning id into v_c;
    -- Un cambio del nodo oculto y su vuelta dejan dos revisiones cuyo diff lleva el valor (lo lee cotizacion_revisiones()); la cotización queda como estaba.
    update public.cotizaciones set valores = jsonb_set(valores, array[v_oculto], to_jsonb(v_centinela::numeric + 1)) where id = v_c;
    update public.cotizaciones set valores = jsonb_set(valores, array[v_oculto], to_jsonb(v_centinela::numeric)) where id = v_c;
    -- sin: ve cotizaciones; con: además el nivel; ed: sólo editar el nivel; ajeno: el nivel, pero en otro origen; otro_nivel: el ver de otro nivel; ver_como: el nivel y gestionar roles.
    sin := gen_random_uuid(); con := gen_random_uuid(); ed := gen_random_uuid(); ajeno := gen_random_uuid(); otro_nivel := gen_random_uuid(); ver_como := gen_random_uuid();
    cfg := gen_random_uuid(); cfg_ajeno := gen_random_uuid();
    solo_ver := gen_random_uuid();
    perform pg_temp.cv_persona(solo_ver, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'leads.ver'),
                                                           jsonb_build_object('clave', 'cotizaciones.nivel.' || v_nivel || '.ver')));
    perform pg_temp.cv_persona(cfg, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o)));
    perform pg_temp.cv_persona(cfg_ajeno, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o2)));
    perform pg_temp.cv_persona(sin, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.editar'), jsonb_build_object('clave', 'leads.ver')));
    perform pg_temp.cv_persona(con, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.editar'), jsonb_build_object('clave', 'leads.ver'),
                                                      jsonb_build_object('clave', 'cotizaciones.nivel.' || v_nivel || '.ver'), jsonb_build_object('clave', 'cotizaciones.nivel.' || v_nivel || '.editar')));
    perform pg_temp.cv_persona(ed, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.editar'), jsonb_build_object('clave', 'leads.ver'),
                                                     jsonb_build_object('clave', 'cotizaciones.nivel.' || v_nivel || '.editar')));
    perform pg_temp.cv_persona(ajeno, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.editar'), jsonb_build_object('clave', 'leads.ver'),
                                                        jsonb_build_object('clave', 'cotizaciones.nivel.' || v_nivel || '.ver', 'origen', o2)));
    perform pg_temp.cv_persona(otro_nivel, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.editar'), jsonb_build_object('clave', 'leads.ver'),
                                                             jsonb_build_object('clave', 'cotizaciones.nivel.' || v_otro_nivel || '.ver')));
    perform pg_temp.cv_persona(ver_como, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.editar'), jsonb_build_object('clave', 'leads.ver'),
                                                           jsonb_build_object('clave', 'cotizaciones.nivel.' || v_nivel || '.ver'), jsonb_build_object('clave', 'cotizaciones.nivel.' || v_nivel || '.editar'),
                                                           jsonb_build_object('clave', 'equipo.roles.gestionar')));
    for k in select jsonb_object_keys(v_reg) loop
      continue when v_reg -> k ? 'cubierta_por';
      v_sql := replace(replace(replace(replace(replace(v_reg -> k ->> 'sonda', '{cot}', quote_literal(v_c)), '{origen}', quote_literal(o)), '{lead}', quote_literal(v_lead)), '{oculto}', quote_literal(v_oculto)), '{centinela}', v_centinela);
      if v_reg -> k ->> 'clase' = 'configurar' then
        -- Sólo con cotizaciones.configurar DE ESE ORIGEN: ni ver, crear, el nivel (con o sin «ver como»), ni configurar otro origen; quien configura sí, y la fórmula lleva el nodo.
        foreach v_txt in array array['sin', 'con', 'ed', 'ajeno', 'otro_nivel', 'ver_como', 'cfg_ajeno'] loop
          v_quien := case v_txt when 'sin' then sin when 'con' then con when 'ed' then ed when 'ajeno' then ajeno when 'otro_nivel' then otro_nivel when 'ver_como' then ver_como else cfg_ajeno end;
          r := pg_temp.cv_corre(v_quien, v_sql);
          if r ->> 'error' is distinct from '42501' then raise exception 'nivel %: % da algo a «%», que no configura el origen: %', v_nivel, k, v_txt, r; end if;
        end loop;
        r := pg_temp.cv_corre(cfg, v_sql);
        if r ? 'error' or position(v_oculto in r::text) = 0 then raise exception 'nivel %: % no da la fórmula a quien configura el origen: %', v_nivel, k, r; end if;
        continue;
      elsif v_reg -> k ->> 'clase' <> 'recorta' then
        continue;
      end if;
      v_tipea := position('{oculto}' in v_reg -> k ->> 'sonda') > 0;      -- la sonda tipea el nodo (un input): sin el permiso, el error tiene que ser el de un nodo que no existe
      -- Sin el permiso del nivel (ninguno, sólo editar, el de otro origen y el de otro nivel): ni el nodo ni su valor.
      foreach v_txt in array array['sin', 'ed', 'ajeno', 'otro_nivel'] loop
        v_quien := case v_txt when 'sin' then sin when 'ed' then ed when 'ajeno' then ajeno else otro_nivel end;
        r := pg_temp.cv_corre(v_quien, pg_temp.cv_ver_en(v_sql, v_c));
        if r ? 'error' then
          if not v_tipea then raise exception 'nivel %: % falla a «%» sin tipear nada oculto: %', v_nivel, k, v_txt, r; end if;
          if replace(r::text, v_oculto, 'zz_inexistente') is distinct from (pg_temp.cv_corre(v_quien, pg_temp.cv_ver_en(replace(v_sql, quote_literal(v_oculto), quote_literal('zz_inexistente')), v_c)))::text then
            raise exception 'nivel %: % distingue el nodo oculto % de uno que no existe, para «%»: %', v_nivel, k, v_oculto, v_txt, r;
          end if;
        elsif position(v_centinela in r::text) > 0 or (not v_tipea and position(v_oculto in r::text) > 0) or (v_tipea and (r -> 'valores') ? v_oculto) then
          raise exception 'nivel %: % deja ver el nodo %/valor % a «%»: %', v_nivel, k, v_oculto, v_centinela, v_txt, r;
        end if;
      end loop;
      -- Con el permiso, llegan los dos.
      v_txt := (pg_temp.cv_corre(con, pg_temp.cv_ver_en(v_sql, v_c)))::text;
      if position(v_oculto in v_txt) = 0 or position(v_centinela in v_txt) = 0 then raise exception 'nivel %: % no le da a quien tiene el permiso el nodo %/valor %: %', v_nivel, k, v_oculto, v_centinela, v_txt; end if;
      -- «Ver como» un rol sin el nivel no cambia lo que decide la base: la interfaz lo estrecha (permisos_efectivos), la base sigue con los permisos reales.
      v_rol_sin := (select ur.rol_id from public.usuarios_roles ur where ur.usuario_id = sin);
      v_con_como := pg_temp.cv_corre(ver_como, format('select jsonb_build_object(''real'', exists (select 1 from public.mis_permisos() m where m.clave = %L), ''como'', exists (select 1 from public.permisos_efectivos(%L) m where m.clave = %L))',
                                                      'cotizaciones.nivel.' || v_nivel || '.ver', v_rol_sin, 'cotizaciones.nivel.' || v_nivel || '.ver'));
      if v_con_como is distinct from '{"real": true, "como": false}'::jsonb then raise exception 'nivel %: «ver como» no estrecha lo que la interfaz ve (o la prueba no lo ve): %', v_nivel, v_con_como; end if;
      v_txt := (pg_temp.cv_corre(ver_como, pg_temp.cv_ver_en(v_sql, v_c)))::text;
      if position(v_oculto in v_txt) = 0 or position(v_centinela in v_txt) = 0 then raise exception 'nivel %: con «ver como» % cambia lo que decide la base: %', v_nivel, k, v_txt; end if;
    end loop;
    -- Crear sin tipear el nodo del nivel (4.10-2): quien no lo ve no lo recibe, y lo guardado (leído como postgres) lo trae con su valor por defecto, que es el de la fórmula; quien lo ve y lo edita
    -- lo tipea y queda guardado con lo que tipeó.
    r := pg_temp.cv_corre(sin, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{"inputs": {"visible": 2}}'', (public.cotizacion_hoja(%L) ->> ''abierta''))', o, v_lead, o));
    if r ? 'error' or position(v_oculto in r::text) > 0 then raise exception 'nivel %: crear sin tipear el nodo falla o lo devuelve a quien no lo ve: %', v_nivel, r; end if;
    if (select c.valores -> v_oculto from public.cotizaciones c where c.id = (r -> 'cotizacion' ->> 'id')::uuid) is distinct from '0'::jsonb then
      raise exception 'nivel %: lo guardado no trae el nodo oculto con su valor por defecto: %', v_nivel, (select c.valores from public.cotizaciones c where c.id = (r -> 'cotizacion' ->> 'id')::uuid);
    end if;
    r := pg_temp.cv_corre(con, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, jsonb_build_object(''inputs'', jsonb_build_object(''visible'', 2, %L, %s::numeric)), (public.cotizacion_hoja(%L) ->> ''abierta''))', o, v_lead, v_oculto, v_centinela, o));
    if r ? 'error' or (r -> 'valores' ->> v_oculto)::numeric is distinct from v_centinela::numeric
       or (select (c.valores ->> v_oculto)::numeric from public.cotizaciones c where c.id = (r -> 'cotizacion' ->> 'id')::uuid) <> v_centinela::numeric then
      raise exception 'nivel %: quien tiene el nivel no recibe ni guarda lo que tipeó: %', v_nivel, r;
    end if;
    -- Quien ve el nivel pero no lo edita: tipearlo es nodo_no_editable (el nodo se ve, no se edita); quien lo edita y no lo ve, el error del nodo que no existe.
    r := pg_temp.cv_corre(solo_ver, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, jsonb_build_object(''inputs'', jsonb_build_object(%L, 1)), (public.cotizacion_hoja(%L) ->> ''abierta''))', o, v_lead, v_oculto, o));
    if r ->> 'error' is distinct from '42501' or r ->> 'detail' is distinct from 'nodo_no_editable' or r ->> 'hint' is distinct from v_oculto then raise exception 'nivel %: sólo ver el nivel y tipear su nodo debía dar nodo_no_editable: %', v_nivel, r; end if;

    -- Guardar (4.10-3), la mitad de escritura por nivel.
    -- a. Quien no ve el nivel guarda lo suyo: lo oculto queda idéntico (leído como postgres), y ni la respuesta ni la revisión que deja lo traen.
    select jsonb_build_object('valores', c.valores -> v_oculto, 'fuentes', c.fuentes -> v_oculto) into v_antes from public.cotizaciones c where c.id = v_c;
    v_int := gen_random_uuid(); v_ver := (select c.actualizado_en from public.cotizaciones c where c.id = v_c);
    v_gsql := format('select public.cotizacion_guardar(%L, %L, %L, ''{"inputs": {"visible": 3.5}}'', null, ''título nuevo'', null, null, false)', v_c, v_int, v_ver);
    r := pg_temp.cv_corre(sin, v_gsql);
    if r ? 'error' then raise exception 'nivel %: quien no ve el nivel no pudo guardar: %', v_nivel, r; end if;
    if position(v_oculto in r::text) > 0 or position(v_centinela in r::text) > 0 then raise exception 'nivel %: la respuesta de guardar trae el nodo del nivel a quien no lo ve: %', v_nivel, r; end if;
    select jsonb_build_object('valores', c.valores -> v_oculto, 'fuentes', c.fuentes -> v_oculto) into v_despues from public.cotizaciones c where c.id = v_c;
    if v_despues is distinct from v_antes then raise exception 'nivel %: guardar de quien no ve el nivel cambió lo oculto: % contra %', v_nivel, v_antes, v_despues; end if;
    r := pg_temp.cv_corre(sin, format('select public.cotizacion_revisiones(%L)', v_c));
    if position(v_oculto in r::text) > 0 or position(v_centinela in r::text) > 0 then raise exception 'nivel %: la revisión del guardado delata el nodo del nivel: %', v_nivel, r; end if;
    -- Repetir el intento y guardar sin cambiar nada devuelven lo mismo que se ve, también sin el nodo del nivel.
    r := pg_temp.cv_corre(sin, v_gsql);
    if r ? 'error' or r ->> 'repetido' is distinct from 'true' or position(v_oculto in r::text) > 0 or position(v_centinela in r::text) > 0 then raise exception 'nivel %: el intento repetido falla o trae el nodo del nivel: %', v_nivel, r; end if;
    r := pg_temp.cv_corre(sin, pg_temp.cv_ver_en(format('select public.cotizacion_guardar(%L, gen_random_uuid(), {version}, ''{"inputs": {"visible": 3.5}}'', null, ''título nuevo'', null, null, false)', v_c), v_c));
    if r ? 'error' or r ->> 'repetido' is distinct from 'false' or position(v_oculto in r::text) > 0 or position(v_centinela in r::text) > 0 then raise exception 'nivel %: guardar sin cambios falla o trae el nodo del nivel: %', v_nivel, r; end if;
    -- b. Paridad: calcular sin guardar y guardar dan lo mismo (el total y los valores visibles), para quien no ve el nivel y para quien sí.
    foreach v_txt in array array['sin', 'con'] loop
      v_quien := case v_txt when 'sin' then sin else con end;
      v_gsql := case v_txt when 'sin' then '{"inputs": {"visible": 9.5}}' else format('{"inputs": {"visible": 9.5, "%s": 40.25}}', v_oculto) end;
      v_e := pg_temp.cv_corre(v_quien, format('select public.cotizacion_evaluar(%L::jsonb, %L)', v_gsql, v_c));
      v_g := pg_temp.cv_corre(v_quien, pg_temp.cv_ver_en(format('select public.cotizacion_guardar(%L, gen_random_uuid(), {version}, %L::jsonb, null, null, null, null, false)', v_c, v_gsql), v_c));
      if v_e ? 'error' or v_g ? 'error' or v_e -> 'valores' is distinct from v_g -> 'valores' or v_e -> 'totales' is distinct from v_g -> 'totales' then
        raise exception 'nivel %: evaluar y guardar no dan lo mismo para «%»: % contra %', v_nivel, v_txt, v_e, v_g;
      end if;
    end loop;
    -- c. Con el nivel el nodo cambia (el último guardado fue de «con»: 40,25).
    if (select (c.valores ->> v_oculto)::numeric from public.cotizaciones c where c.id = v_c) is distinct from 40.25 then raise exception 'nivel %: quien tiene el nivel no cambió el nodo al guardar', v_nivel; end if;
    -- d. Los errores de una que no existe, está en la papelera, es de otro origen o sólo se ve son el mismo, palabra por palabra.
    ed_o2 := gen_random_uuid();
    perform pg_temp.cv_persona(ed_o2, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o2), jsonb_build_object('clave', 'cotizaciones.editar', 'origen', o2), jsonb_build_object('clave', 'leads.ver')));
    r0 := pg_temp.cv_corre(sin, format('select public.cotizacion_guardar(%L, gen_random_uuid(), now(), ''{}'', null, null, null, null, false)', gen_random_uuid()));
    if r0 ->> 'error' is distinct from '42501' or r0 ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'nivel %: guardar una inexistente: %', v_nivel, r0; end if;
    if pg_temp.cv_corre(ed_o2, format('select public.cotizacion_guardar(%L, gen_random_uuid(), now(), ''{}'', null, null, null, null, false)', v_c)) is distinct from r0 then raise exception 'nivel %: guardar la de otro origen se distingue de una inexistente', v_nivel; end if;
    if pg_temp.cv_corre(solo_ver, format('select public.cotizacion_guardar(%L, gen_random_uuid(), now(), ''{}'', null, null, null, null, false)', v_c)) is distinct from r0 then raise exception 'nivel %: guardar sin poder editar se distingue de una inexistente', v_nivel; end if;
    update public.cotizaciones set eliminado_en = now() where id = v_c;
    if pg_temp.cv_corre(sin, format('select public.cotizacion_guardar(%L, gen_random_uuid(), now(), ''{}'', null, null, null, null, false)', v_c)) is distinct from r0 then raise exception 'nivel %: guardar la de la papelera se distingue de una inexistente', v_nivel; end if;
    update public.cotizaciones set eliminado_en = null where id = v_c;
  end loop;
end $$;
rollback;

-- @test visibilidad: el lead que se transfiere lleva sus cotizaciones a la cartera nueva, recortadas por nivel; quien no es de la cartera no las lee
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  a constant uuid := '00000000-0000-0000-0000-000000000d11'; b constant uuid := '00000000-0000-0000-0000-000000000d12'; z constant uuid := '00000000-0000-0000-0000-000000000d13';
  v_web uuid := (select id from public.origenes_lead where clave = 'web'); asesor uuid := (select id from public.roles where clave = 'asesor');
  o uuid; v_lead uuid; v_c uuid; r jsonb; v_def jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (a, 'cv-tr-a@ejemplo.com', '{"invitado": true}'), (b, 'cv-tr-b@ejemplo.com', '{"invitado": true}'), (z, 'cv-tr-z@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id) values (a, asesor), (b, asesor), (z, asesor);
  insert into public.origenes (clave, nombre) values ('cv_transfer', 'CV transferencia') returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(jsonb_build_object('id', 'visible', 'tipo', 'input'), jsonb_build_object('id', 'costo', 'tipo', 'input'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'salida', 'total')));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', '{}', '{"visible": {"ver": "todos", "editar": "todos"}, "costo": {"ver": "costos", "editar": "costos"}, "total": {"ver": "todos", "editar": null}}');
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values ('CV transferencia', '73900011', a, v_web, '{}') returning id into v_lead;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, valores, fuentes, tipos_cambio, totales, total_base, titulo)
  values (o, a, (select id from public.formulas where origen_id = o), v_lead, '{"visible": 10.5, "costo": 88888.5, "total": 99999.25}', '{}', '{}', '{"bs": 99999.25, "usd": 99999.25, "suma_usd": 99999.25}', 99999.25, 'CV transferencia') returning id into v_c;
  -- Antes: B (asesora, «propios») no la ve; A, que la creó, sí.
  r := pg_temp.cv_corre(b, format('select public.cotizacion_leer(%L)', v_c));
  if r ->> 'error' is distinct from '42501' then raise exception 'B lee una cotización de un lead que no es suyo: %', r; end if;
  if (pg_temp.cv_corre(a, format('select public.cotizacion_leer(%L)', v_c))) ? 'error' then raise exception 'A no lee la suya'; end if;
  -- A transfiere el lead a B: B la lee en el acto, sin el costo (no tiene el nivel); Z, que nunca fue de la cartera, no.
  r := pg_temp.cv_corre(a, format('select public.lead_transferir(%L, %L, %L)', v_lead, b, a));
  if r ? 'error' then raise exception 'no se transfirió: %', r; end if;
  r := pg_temp.cv_corre(b, format('select public.cotizacion_leer(%L)', v_c));
  if r ? 'error' or r -> 'valores' ->> 'total' <> '99999.25' or r -> 'valores' ->> 'visible' <> '10.5' then raise exception 'B no lee la cotización del lead transferido: %', r; end if;
  if pg_temp.cv_trae(r, '{88888.5}') or position('costo' in r::text) > 0 then raise exception 'B ve el costo sin el nivel: %', r; end if;
  if (pg_temp.cv_corre(z, format('select public.cotizacion_leer(%L)', v_c))) ->> 'error' is distinct from '42501' then raise exception 'Z lee una cotización de un lead que no es suyo'; end if;
  -- B le quita el acceso a A: A sigue leyendo la que creó (creado_por), y Z sigue sin poder.
  r := pg_temp.cv_corre(b, format('select public.lead_revocar_acceso(%L, %L)', v_lead, a));
  if r ? 'error' then raise exception 'no se revocó: %', r; end if;
  if (pg_temp.cv_corre(a, format('select public.cotizacion_leer(%L)', v_c))) ? 'error' then raise exception 'A deja de leer la que creó'; end if;
end $$;
rollback;

-- @test visibilidad: cotizacion_evaluar devuelve sólo lo que se ve (con el total y lo aparte), no sirve de oráculo y sólo deja elegir los modos de la hoja a quien no configura
-- Con la fórmula sembrada de `subasta_usa` y su visibilidad compilada: los nodos de «Avanzado» son del nivel «costos» y `nacionalizacion`, el total y la garantía son de todos.
begin;
do $$
declare
  sin constant uuid := '00000000-0000-0000-0000-000000000e01'; con constant uuid := '00000000-0000-0000-0000-000000000e02'; cfg constant uuid := '00000000-0000-0000-0000-000000000e03';
  solo_crear constant uuid := '00000000-0000-0000-0000-000000000e04'; sin_crear constant uuid := '00000000-0000-0000-0000-000000000e05';
  o uuid := (select id from public.origenes where clave = 'subasta_usa'); f uuid := (select id from public.formulas where origen_id = o and estado = 'publicada');
  v_vis jsonb; v_costos text[]; v_todos text[]; r jsonb; r2 jsonb; v_q text; v_libre jsonb; v_unificado jsonb; v_msg text;
begin
  select visibilidad into v_vis from public.formulas where id = f;
  v_costos := array(select k from jsonb_each(v_vis) e (k, v) where v ->> 'ver' = 'costos' order by k);
  if cardinality(v_costos) < 10 then raise exception 'la fórmula sembrada debía tener nodos de costos: %', v_costos; end if;
  perform pg_temp.cv_persona(sin, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear')));
  perform pg_temp.cv_persona(con, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.nivel.costos.ver'), jsonb_build_object('clave', 'cotizaciones.nivel.costos.editar')));
  perform pg_temp.cv_persona(cfg, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.configurar')));
  perform pg_temp.cv_persona(solo_crear, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.crear')));
  perform pg_temp.cv_persona(sin_crear, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver')));
  v_unificado := (select jsonb_build_object('buckets', (select jsonb_object_agg(b ->> 'bucket', b ->> 'nodo') from jsonb_array_elements(m -> 'buckets') b), 'total_en', m ->> 'total_en')
                    from public.formulas x, jsonb_array_elements(x.diseno -> 'cabecera' -> 'modos') m where x.id = f and m ->> 'clave' = 'unificado');
  v_libre := '{"buckets": {"exterior": "tc_oficial", "aduana": "tc_oficial"}, "total_en": "tc_oficial"}';
  if v_unificado is null then raise exception 'la fórmula sembrada debía traer el modo unificado'; end if;

  -- 1. Sin el nivel: ninguna clave de «costos» en valores, estados ni fuentes; el total y lo aparte, sí; ningún subtotal delata un nodo oculto (los grupos de la semilla no los llevan).
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(%L, null, %L)', '{"inputs": {"remate": 14200}}', o));
  if r ? 'error' then raise exception 'sin el nivel no evalúa: %', r; end if;
  if r -> 'valores' ?| v_costos or r -> 'estados' ?| v_costos or r -> 'fuentes' ?| v_costos then raise exception 'una clave de costos viaja sin el nivel: %', r -> 'valores'; end if;
  if not (r -> 'valores' ? 'total') or not (r -> 'valores' ? 'garantia') or not (r -> 'totales' ? 'usd') or not (r -> 'totales' ? 'bs') then raise exception 'falta el total o lo aparte: %', r; end if;
  if r -> 'valores' ->> 'remate' <> '14200' then raise exception 'lo que ve, calculado: %', r -> 'valores'; end if;
  -- 2. Con el nivel (el motor completo) y quien configura (el recorte sólo suma lo no nombrado): las claves de costos llegan a quien tiene el nivel.
  r2 := pg_temp.cv_corre(con, format('select public.cotizacion_evaluar(%L, null, %L)', '{"inputs": {"remate": 14200}}', o));
  if not (r2 -> 'valores' ?& v_costos) then raise exception 'con el nivel debía ver las claves de costos: %', r2 -> 'valores'; end if;
  if (select count(*) from jsonb_object_keys(r2 -> 'valores')) <= (select count(*) from jsonb_object_keys(r -> 'valores')) then raise exception 'con el nivel no ve más'; end if;
  r2 := pg_temp.cv_corre(cfg, format('select public.cotizacion_evaluar(%L, null, %L)', '{"inputs": {"remate": 14200}}', o));
  if r2 -> 'valores' ?| v_costos then raise exception 'configurar se salta el nivel: %', r2 -> 'valores'; end if;
  -- 3. Sin oráculo: tipear un input de costos da exactamente el error de tipear uno que no existe (cambia sólo el nombre), en inputs, en banderas y en overrides.
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(%L, null, %L)', '{"inputs": {"valor_tabla": 30000}}', o));
  r2 := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(%L, null, %L)', '{"inputs": {"zz_no_existe": 30000}}', o));
  if r ->> 'error' is distinct from 'P0001' and r ->> 'error' is distinct from '22023' then raise exception 'no dio un error de llamada: %', r; end if;
  if replace(r::text, 'valor_tabla', 'zz_no_existe') is distinct from r2::text then raise exception 'un input oculto se distingue de uno inexistente: % contra %', r, r2; end if;
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(%L, null, %L)', '{"banderas": {"fob": true}}', o));
  r2 := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(%L, null, %L)', '{"banderas": {"zz_no_existe": true}}', o));
  if replace(r::text, 'fob', 'zz_no_existe') is distinct from r2::text then raise exception 'una bandera oculta se distingue de una inexistente: % contra %', r, r2; end if;
  -- Y con el nivel el mismo input se acepta.
  r := pg_temp.cv_corre(con, format('select public.cotizacion_evaluar(%L, null, %L)', '{"inputs": {"valor_tabla": 30000}}', o));
  if r ? 'error' or r -> 'valores' ->> 'valor_tabla' <> '30000' then raise exception 'con el nivel, el input se acepta: %', r; end if;
  -- Los overrides de un nodo oculto se descartan como inexistentes, entre los inexistentes y ordenados por id (bytes), después de los de nodos que se ven.
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(%L, null, %L)', '{"overrides": {"fob": 1, "zzz": 2, "aaa": 3, "remate": 4}}', o));
  if r ? 'error' then raise exception 'overrides: %', r; end if;
  r2 := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(%L, null, %L)', '{"overrides": {"qqq": 1, "zzz": 2, "aaa": 3, "remate": 4}}', o));
  if replace(r::text, 'fob', 'qqq') is distinct from r2::text then raise exception 'un override oculto se distingue de uno inexistente: % contra %', r -> 'overrides_descartados', r2 -> 'overrides_descartados'; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'overrides_descartados') d where d ->> 'id' = 'fob' and d ->> 'motivo' = 'nodo_inexistente') then raise exception 'el override oculto no se descarta como inexistente: %', r -> 'overrides_descartados'; end if;
  -- La forma de lo que llega se rechaza igual aunque el nodo no se vea (un override que no es un número).
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(%L, null, %L)', '{"overrides": {"fob": "x"}}', o));
  r2 := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(%L, null, %L)', '{"overrides": {"zz_no_existe": "x"}}', o));
  if r ->> 'error' is null or replace(r::text, 'fob', 'zz_no_existe') is distinct from r2::text then raise exception 'la forma de un override oculto se distingue: % contra %', r, r2; end if;
  -- 4. El modo: quien no configura sólo elige uno de los de la hoja; quien configura, cualquiera.
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(%L, null, %L, null, %L)', '{"inputs": {"remate": 14200}}', o, v_unificado));
  if r ? 'error' then raise exception 'un modo de la hoja se rechaza: %', r; end if;
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(%L, null, %L, null, %L)', '{"inputs": {"remate": 14200}}', o, v_libre));
  if r ->> 'error' is null or position('modo' in lower(r ->> 'mensaje')) = 0 then raise exception 'un modo libre se acepta: %', r; end if;
  r := pg_temp.cv_corre(cfg, format('select public.cotizacion_evaluar(%L, null, %L, null, %L)', '{"inputs": {"remate": 14200}}', o, v_libre));
  if r ? 'error' then raise exception 'quien configura puede elegir cualquier modo: %', r; end if;
  -- 5. Con crear y sin ver (4-32): no evalúa por origen ni con la hoja ni sin ella; cotizar pide también cotizaciones.ver del origen.
  r := pg_temp.cv_corre(solo_crear, format('select public.cotizacion_evaluar(%L, null, %L)', '{}', o));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' not like '%cotizaciones.ver%' then raise exception 'crear sin ver debía dar 42501 (cotizaciones.ver): %', left(r::text, 200); end if;
  r := pg_temp.cv_corre(solo_crear, format('select public.cotizacion_evaluar(%L, null, %L)', '{"inputs": {"remate": 1}}', o));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' not like '%cotizaciones.ver%' then raise exception 'crear sin ver tipea un input: %', left(r::text, 200); end if;
  -- 6. Sin cotizaciones.crear del origen no evalúa por origen; sin ver la cotización, no evalúa por ella.
  if (pg_temp.cv_corre(sin_crear, format('select public.cotizacion_evaluar(%L, null, %L)', '{}', o))) ->> 'error' is distinct from '42501' then raise exception 'sin crear evalúa por origen'; end if;
  -- 7. Los grants: authenticated sí, anon y PUBLIC no; el armado, de nadie.
  if has_function_privilege('anon', 'public.cotizacion_evaluar(jsonb,uuid,uuid,uuid,jsonb,text,text)', 'execute') or not has_function_privilege('authenticated', 'public.cotizacion_evaluar(jsonb,uuid,uuid,uuid,jsonb,text,text)', 'execute')
     or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x where p.oid = 'public.cotizacion_evaluar(jsonb,uuid,uuid,uuid,jsonb,text,text)'::regprocedure and x.grantee = 0) then
    raise exception 'los grants de cotizacion_evaluar';
  end if;
  if has_function_privilege('anon', 'public._cotizacion_armar(jsonb,uuid,uuid,uuid,uuid,timestamp with time zone,boolean)', 'execute') or has_function_privilege('authenticated', 'public._cotizacion_armar(jsonb,uuid,uuid,uuid,uuid,timestamp with time zone,boolean)', 'execute')
     or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x where p.oid = 'public._cotizacion_armar(jsonb,uuid,uuid,uuid,uuid,timestamp with time zone,boolean)'::regprocedure and x.grantee = 0) then
    raise exception '_cotizacion_armar se puede ejecutar';
  end if;
end $$;
rollback;

-- @test visibilidad: cotizacion_evaluar no da el Bs de un grupo cuando un tipo de cambio de la fórmula lo esconde un nivel, y un grupo con un nodo oculto no viaja
-- Una copia de la fórmula sembrada de `subasta_usa` en otro origen, con el tipo de cambio paralelo (el del bucket «exterior») restringido a «costos» y el nodo `grua` (del grupo
-- «logistica») también.
begin;
do $$
declare
  sin constant uuid := '00000000-0000-0000-0000-000000000e11'; con constant uuid := '00000000-0000-0000-0000-000000000e12';
  f0 public.formulas; o uuid; r jsonb; v_vis jsonb;
begin
  select f.* into f0 from public.formulas f join public.origenes x on x.id = f.origen_id where x.clave = 'subasta_usa' and f.estado = 'publicada';
  insert into public.origenes (clave, nombre) values ('cv_eval_tc', 'CV evaluar tc') returning id into o;
  v_vis := jsonb_set(jsonb_set(f0.visibilidad, '{tc_paralelo}', '{"ver": "costos", "editar": "costos"}'), '{grua}', '{"ver": "costos", "editar": "costos"}');
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o, 1, 'publicada', f0.definicion, f0.params, f0.diseno, v_vis);
  perform pg_temp.cv_persona(sin, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear')));
  perform pg_temp.cv_persona(con, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.nivel.costos.ver')));
  -- Con el nivel: los tres grupos con su USD y su Bs (el motor completo).
  r := pg_temp.cv_corre(con, format('select public.cotizacion_evaluar(%L, null, %L)', '{"inputs": {"remate": 14200}}', o));
  if r ? 'error' or (select array_agg(k order by k) from jsonb_object_keys(r -> 'totales' -> 'grupos') k) is distinct from array['aduana', 'compra', 'logistica'] then raise exception 'con el nivel: %', r -> 'totales'; end if;
  if not (r -> 'totales' -> 'grupos' -> 'compra' ? 'bs') then raise exception 'con el nivel, compra con su Bs: %', r -> 'totales' -> 'grupos' -> 'compra'; end if;
  -- Sin el nivel: «logistica» (tiene `grua`, oculta) no viaja; «compra» y «aduana» viajan con su USD y SIN Bs (el tipo de cambio paralelo está oculto); el total, entero.
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(%L, null, %L)', '{"inputs": {"remate": 14200}}', o));
  if r ? 'error' then raise exception 'sin el nivel no evalúa: %', r; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'totales' -> 'grupos') k) is distinct from array['aduana', 'compra'] then raise exception 'grupos sin el nivel: %', r -> 'totales' -> 'grupos'; end if;
  if r -> 'totales' -> 'grupos' -> 'compra' ? 'bs' or r -> 'totales' -> 'grupos' -> 'aduana' ? 'bs' or not (r -> 'totales' -> 'grupos' -> 'compra' ? 'usd') then raise exception 'el Bs viaja con el tipo de cambio oculto: %', r -> 'totales' -> 'grupos'; end if;
  if not (r -> 'totales' ? 'bs') or not (r -> 'totales' ? 'usd') or r -> 'valores' ? 'grua' or r -> 'valores' ? 'tc_paralelo' then raise exception 'el total viaja y lo oculto no: %', r; end if;
end $$;
rollback;

-- @test visibilidad: cotizacion_evaluar no deja que un override o una bandera de un nodo oculto cambien lo que se ve, ni los distingue de un nodo que no existe
-- Una fórmula chica donde el nodo oculto `ocultoh` (sobrescribible, de «costos») suma al total y una bandera oculta `obandera` existe: si el override se aplicara, el total cambiaría.
begin;
do $$
declare
  sin constant uuid := '00000000-0000-0000-0000-000000000e21'; con constant uuid := '00000000-0000-0000-0000-000000000e22';
  o uuid; r jsonb; r2 jsonb;
begin
  insert into public.origenes (clave, nombre) values ('cv_eval_ov', 'CV evaluar override') returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o, 1, 'publicada',
    '{"nodos": [{"id": "tc", "tipo": "tipo_cambio", "clave": "oficial", "etiqueta": "TC", "formato": "raw"},
                {"id": "remate", "tipo": "input", "etiqueta": "Remate", "bucket": "origen"},
                {"id": "ocultoh", "tipo": "calculo", "op": "suma", "de": ["remate"], "sobrescribible": true, "etiqueta": "Oculto", "bucket": "origen"},
                {"id": "obandera", "tipo": "bandera", "etiqueta": "Bandera oculta"},
                {"id": "total", "tipo": "calculo", "op": "suma", "de": ["remate", "ocultoh"], "etiqueta": "Total", "salida": "total", "bucket": "origen"}], "buckets": {"origen": "tc"}}',
    '{}', '{}', '{"tc": {"ver": "todos", "editar": "todos"}, "remate": {"ver": "todos", "editar": "todos"}, "ocultoh": {"ver": "costos", "editar": "costos"},
              "obandera": {"ver": "costos", "editar": "costos"}, "total": {"ver": "todos", "editar": null}}');
  perform pg_temp.cv_persona(sin, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear')));
  perform pg_temp.cv_persona(con, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.nivel.costos.ver')));
  -- Con el nivel, el override se aplica: el total cambia.
  r := pg_temp.cv_corre(con, format('select public.cotizacion_evaluar(%L, null, %L)', '{"overrides": {"ocultoh": 5000}}', o));
  if r ? 'error' or (r -> 'valores' ->> 'total')::numeric <> 5000 then raise exception 'con el nivel el override se aplica: %', r; end if;
  -- Sin el nivel, no: el total es el de siempre y la respuesta es la de un nodo que no existe (cambia sólo el nombre).
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(%L, null, %L)', '{"overrides": {"ocultoh": 5000}}', o));
  r2 := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(%L, null, %L)', '{"overrides": {"zz_inexistente": 5000}}', o));
  if r ? 'error' or (r -> 'valores' ->> 'total')::numeric <> 0 then raise exception 'sin el nivel, el override cambia el total: %', r; end if;
  if replace(r::text, 'ocultoh', 'zz_inexistente') is distinct from r2::text then raise exception 'un override oculto se distingue de uno inexistente: % contra %', r, r2; end if;
  if r -> 'valores' ? 'ocultoh' then raise exception 'el nodo oculto viaja'; end if;
  -- La bandera oculta: con el nivel se acepta, sin él da el error de una bandera que no existe.
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(%L, null, %L)', '{"banderas": {"obandera": true}}', o));
  r2 := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(%L, null, %L)', '{"banderas": {"zz_inexistente": true}}', o));
  if r ->> 'error' is null or replace(r::text, 'obandera', 'zz_inexistente') is distinct from r2::text then raise exception 'una bandera oculta se distingue de una inexistente: % contra %', r, r2; end if;
  if (pg_temp.cv_corre(con, format('select public.cotizacion_evaluar(%L, null, %L)', '{"banderas": {"obandera": true}}', o))) ? 'error' then raise exception 'con el nivel, la bandera se acepta'; end if;
  -- Por cotización: la que no existe, la de la papelera y la que no se ve dan el mismo error y el mismo texto que leer.
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(%L, %L)', '{}', gen_random_uuid()));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'evaluar por una cotización inexistente: %', r; end if;
end $$;
rollback;

-- @test visibilidad: un tipo de cambio congelado que no es un número no rompe la evaluación (el AND de la conversión), y recortar lo que dio el motor a quien lo ve todo no cambia nada
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; o uuid := (select id from public.origenes where clave = 'subasta_usa'); f uuid := (select id from public.formulas where origen_id = o and estado = 'publicada');
  c uuid; r jsonb; v_res jsonb; v_def jsonb; v_ids text[];
begin
  -- Cotizaciones con un tipo de cambio congelado de texto, de cero y negativo: faltan como `tipo_de_cambio_sin_valor`, sin lanzar al convertir.
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base)
  values (o, duena, f, '{}', '{}', '{"oficial": "abc", "paralelo": 0, "unificado": -3}', '{}', 0) returning id into c;
  r := pg_temp.cv_corre(duena, format('select public.cotizacion_evaluar(%L, %L)', '{}', c));
  if r ? 'error' then raise exception 'un tipo de cambio de texto rompe la evaluación: %', r; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'faltantes') x where x ->> 'codigo' = 'tipo_de_cambio_sin_valor') then raise exception 'debía faltar un tipo de cambio: %', r -> 'faltantes'; end if;
  -- Recortar a quien lo ve todo es devolver lo mismo: con la dueña y la fórmula sembrada, el recorte de lo que dio el motor es lo que dio el motor.
  select definicion into v_def from public.formulas where id = f;
  v_ids := array(select n ->> 'id' from jsonb_array_elements(v_def -> 'nodos') n);
  v_res := public.evaluar_formula(v_def, (select params from public.formulas where id = f),
    jsonb_build_object('inputs', jsonb_build_object('remate', 14200), 'banderas', '{}'::jsonb, 'tipos_cambio', '{"oficial": 6.96, "paralelo": 12.4, "unificado": 12.2}'::jsonb, 'vehiculo', '{}'::jsonb, 'tablas', '{}'::jsonb, 'overrides', '{}'::jsonb));
  if pg_temp.cv_recorte(v_res, v_ids, v_def, '{}') is distinct from v_res then raise exception 'recortar lo que ve quien lo ve todo cambia el resultado'; end if;
end $$;
rollback;

-- @test visibilidad: cotizacion_revisiones recorta cada diff por nodo, no delata un cambio de sólo lo oculto, pagina por cursor y niega lo que no se ve igual que lo que no existe
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  sin constant uuid := '00000000-0000-0000-0000-000000000f01'; con constant uuid := '00000000-0000-0000-0000-000000000f02'; otro constant uuid := '00000000-0000-0000-0000-000000000f03';
  o uuid; o2 uuid; f1 uuid; c uuid; c_ajena uuid; r jsonb; r2 jsonb; v_ids bigint[]; v_def jsonb; v_pag1 jsonb; v_pag2 jsonb; v_pag3 jsonb; v_msg text;
  v0 constant jsonb := '{"tc_o": 6.96, "tc_p": 12.4, "remate": 1000.5, "fees": 50.25, "flete": 41111.5, "margen": 42222.5, "total": 99999.5, "garantia": 55.5}';
  v1 jsonb; v2 jsonb; t0 constant jsonb := '{"grupos": {"g1": {"usd": 1050, "bs": 7308, "se_dibuja": true}, "g2": {"usd": 41111.5, "bs": 286127, "se_dibuja": true}}, "bs": 99999000.5, "usd": 99999.5, "suma_usd": 99999.5}';
  v_vis constant jsonb := '{"remate": {"ver": "todos", "editar": "todos"}, "fees": {"ver": "todos", "editar": null}, "flete": {"ver": "costos", "editar": "costos"},
    "margen": {"ver": "costos", "editar": "costos"}, "total": {"ver": "todos", "editar": null}, "garantia": {"ver": "costos", "editar": null},
    "tc_o": {"ver": "costos", "editar": "costos"}, "tc_p": {"ver": "todos", "editar": "todos"}}';
begin
  v1 := jsonb_set(v0, '{flete}', '50123.5'); v2 := v1 || '{"remate": 2000.5, "flete": 60123.5}';
  v_def := jsonb_build_object(
    'nodos', jsonb_build_array(
      jsonb_build_object('id', 'tc_o', 'tipo', 'tipo_cambio', 'clave', 'oficial'), jsonb_build_object('id', 'tc_p', 'tipo', 'tipo_cambio', 'clave', 'paralelo'),
      jsonb_build_object('id', 'remate', 'tipo', 'input', 'grupo', 'g1'), jsonb_build_object('id', 'fees', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('remate'), 'grupo', 'g1'),
      jsonb_build_object('id', 'flete', 'tipo', 'input', 'grupo', 'g2'), jsonb_build_object('id', 'margen', 'tipo', 'input'),
      jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('remate'), 'salida', 'total'),
      jsonb_build_object('id', 'garantia', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('remate'), 'salida', 'aparte')),
    'grupos', jsonb_build_array(jsonb_build_object('id', 'g1'), jsonb_build_object('id', 'g2')));
  perform pg_temp.cv_persona(sin, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver')));
  perform pg_temp.cv_persona(con, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.nivel.costos.ver')));
  insert into public.origenes (clave, nombre) values ('cv_revisiones', 'CV revisiones') returning id into o;
  insert into public.origenes (clave, nombre) values ('cv_revisiones_otro', 'CV revisiones otro') returning id into o2;
  perform pg_temp.cv_persona(otro, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o2)));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o, 1, 'publicada', v_def, '{}', '{}', v_vis) returning id into f1;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o2, 1, 'publicada', v_def, '{}', '{}', v_vis);
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo)
  values (o, duena, f1, v0, '{"remate": "input", "flete": "input"}', '{"oficial": 6.96, "paralelo": 12.4}', t0, 99999.5, 'CV revisiones') returning id into c;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo)
  values (o2, duena, (select id from public.formulas where origen_id = o2), '{}', '{}', '{}', '{}', 1, 'CV revisiones ajena') returning id into c_ajena;
  -- Seis cambios (cada uno deja su revisión): una nota; sólo un costo; un costo y un dato visible; el subtotal de un grupo oculto; la tarifa oficial; el título y el total.
  update public.cotizaciones set notas = 'uno' where id = c;
  update public.cotizaciones set valores = jsonb_set(valores, '{flete}', '50123.5') where id = c;
  update public.cotizaciones set valores = valores || '{"remate": 2000.5, "flete": 60123.5}' where id = c;
  update public.cotizaciones set totales = jsonb_set(totales, '{grupos,g2,usd}', '77123.5') where id = c;
  update public.cotizaciones set tipos_cambio = '{"oficial": 7.75, "paralelo": 12.4}' where id = c;
  update public.cotizaciones set titulo = 'CV revisiones nuevo', total_base = 5 where id = c;
  if (select count(*) from public.cotizaciones_revisiones where cotizacion_id = c) <> 6 then raise exception 'esperaba 6 revisiones y hay %', (select count(*) from public.cotizaciones_revisiones where cotizacion_id = c); end if;

  -- 1. Sin el nivel: seis revisiones, de la más nueva a la más vieja; cada una dice quién y cuándo; los cambios de sólo lo oculto viajan con el diff vacío.
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_revisiones(%L)', c));
  if r ? 'error' then raise exception 'sin el nivel no lee las revisiones: %', r; end if;
  if jsonb_array_length(r -> 'revisiones') <> 6 or r ->> 'hay_mas' <> 'false' or r -> 'siguiente' is distinct from 'null'::jsonb then raise exception 'las seis, sin otra página: %', r; end if;
  select array_agg((x ->> 'id')::bigint order by ord) into v_ids from jsonb_array_elements(r -> 'revisiones') with ordinality t (x, ord);
  if v_ids <> (select array_agg(id order by id desc) from public.cotizaciones_revisiones where cotizacion_id = c) then raise exception 'el orden de las revisiones: %', v_ids; end if;
  if r -> 'revisiones' -> 0 -> 'diff' is distinct from '{"titulo": {"de": "CV revisiones", "a": "CV revisiones nuevo"}, "total_base": {"de": 99999.5, "a": 5}}'::jsonb then raise exception 'las columnas legibles, tal cual: %', r -> 'revisiones' -> 0 -> 'diff'; end if;
  if r -> 'revisiones' -> 1 -> 'diff' <> '{}'::jsonb then raise exception 'cambió sólo la tarifa oficial (oculta): % ', r -> 'revisiones' -> 1 -> 'diff'; end if;
  if r -> 'revisiones' -> 2 -> 'diff' <> '{}'::jsonb then raise exception 'cambió sólo el subtotal de un grupo oculto: %', r -> 'revisiones' -> 2 -> 'diff'; end if;
  -- La revisión guarda por nodo: sólo lo que cambió (el dato visible `remate`; el costo `flete` que cambió con él no viaja).
  if r -> 'revisiones' -> 3 -> 'diff' is distinct from '{"valores": {"de": {"remate": 1000.5}, "a": {"remate": 2000.5}}}'::jsonb then raise exception 'el dato visible, sin los costos: %', r -> 'revisiones' -> 3 -> 'diff'; end if;
  if r -> 'revisiones' -> 4 -> 'diff' <> '{}'::jsonb then raise exception 'cambió sólo un costo: %', r -> 'revisiones' -> 4 -> 'diff'; end if;
  if r -> 'revisiones' -> 5 -> 'diff' is distinct from '{"notas": {"de": null, "a": "uno"}}'::jsonb then raise exception 'la nota: %', r -> 'revisiones' -> 5 -> 'diff'; end if;
  -- Los valores, como hojas (la respuesta trae seis fechas: «7.75» calzaba con una hora); los nombres de nodo, como texto (no son hexadecimales).
  if pg_temp.cv_trae(r, '{50123.5, 60123.5, 77123.5, 7.75, 41111.5}') or position('flete' in r::text) > 0 or position('tc_o' in r::text) > 0 then
    raise exception 'algo oculto viaja por las revisiones: %', r;
  end if;
  -- 2. Con el nivel: los diffs enteros.
  r2 := pg_temp.cv_corre(con, format('select public.cotizacion_revisiones(%L)', c));
  if r2 -> 'revisiones' -> 4 -> 'diff' is distinct from '{"valores": {"de": {"flete": 41111.5}, "a": {"flete": 50123.5}}}'::jsonb then raise exception 'con el nivel, el costo: %', r2 -> 'revisiones' -> 4 -> 'diff'; end if;
  if r2 -> 'revisiones' -> 3 -> 'diff' is distinct from '{"valores": {"de": {"remate": 1000.5, "flete": 50123.5}, "a": {"remate": 2000.5, "flete": 60123.5}}}'::jsonb then raise exception 'con el nivel, el dato y el costo: %', r2 -> 'revisiones' -> 3 -> 'diff'; end if;
  if r2 -> 'revisiones' -> 2 -> 'diff' is distinct from jsonb_build_object('totales', jsonb_build_object('de', t0, 'a', jsonb_set(t0, '{grupos,g2,usd}', '77123.5'))) then
    raise exception 'con el nivel, el subtotal del grupo: %', r2 -> 'revisiones' -> 2 -> 'diff';
  end if;
  if r2 -> 'revisiones' -> 1 -> 'diff' is distinct from '{"tipos_cambio": {"de": {"oficial": 6.96, "paralelo": 12.4}, "a": {"oficial": 7.75, "paralelo": 12.4}}}'::jsonb then raise exception 'con el nivel, la tarifa: %', r2 -> 'revisiones' -> 1 -> 'diff'; end if;
  -- 2b. Una versión nueva de la fórmula (que muestra el flete a todos) no cambia lo que se ve de las revisiones de una cotización de la v1: se leen con SU visibilidad.
  update public.formulas set estado = 'archivada' where id = f1;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 2, 'publicada', v_def, '{}', '{}', jsonb_set(jsonb_set(v_vis, '{flete}', '{"ver": "todos", "editar": "todos"}'), '{tc_o}', '{"ver": "todos", "editar": "todos"}'));
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_revisiones(%L)', c));
  if pg_temp.cv_trae(r, '{50123.5, 60123.5, 7.75}') or position('flete' in r::text) > 0 then raise exception 'una versión nueva cambia lo que se ve de una cotización de la anterior: %', r; end if;
  -- 3. Páginas de a 2 por el cursor: 2 + 2 + 2, la última sin otra, y sin repetir ni saltar.
  v_pag1 := pg_temp.cv_corre(sin, format('select public.cotizacion_revisiones(%L, null, 2)', c));
  v_pag2 := pg_temp.cv_corre(sin, format('select public.cotizacion_revisiones(%L, %s, 2)', c, v_pag1 ->> 'siguiente'));
  v_pag3 := pg_temp.cv_corre(sin, format('select public.cotizacion_revisiones(%L, %s, 2)', c, v_pag2 ->> 'siguiente'));
  if jsonb_array_length(v_pag1 -> 'revisiones') <> 2 or v_pag1 ->> 'hay_mas' <> 'true' or jsonb_array_length(v_pag2 -> 'revisiones') <> 2 or v_pag2 ->> 'hay_mas' <> 'true'
     or jsonb_array_length(v_pag3 -> 'revisiones') <> 2 or v_pag3 ->> 'hay_mas' <> 'false' then raise exception 'las páginas: % % %', v_pag1, v_pag2, v_pag3; end if;
  if (v_pag1 -> 'revisiones') || (v_pag2 -> 'revisiones') || (v_pag3 -> 'revisiones') is distinct from r -> 'revisiones' then raise exception 'las páginas no suman las seis, en orden'; end if;
  if (v_pag1 ->> 'siguiente')::bigint <> (v_pag1 -> 'revisiones' -> 1 ->> 'id')::bigint then raise exception 'el cursor es el id de la última de la página'; end if;
  -- 4. Una cotización que no existe, una de un origen sin permiso y una que no se ve dan el mismo error; anon no la ejecuta, y los ayudantes son de nadie.
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_revisiones(%L)', gen_random_uuid()));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'una inexistente: %', r; end if;
  if pg_temp.cv_corre(otro, format('select public.cotizacion_revisiones(%L)', c)) is distinct from r then raise exception 'de otro origen se distingue de lo inexistente'; end if;
  if (pg_temp.cv_corre(otro, format('select public.cotizacion_revisiones(%L)', c_ajena))) ? 'error' then raise exception 'quien ve su origen no lee las revisiones de la suya'; end if;
  if has_function_privilege('anon', 'public.cotizacion_revisiones(uuid,bigint,integer)', 'execute') or not has_function_privilege('authenticated', 'public.cotizacion_revisiones(uuid,bigint,integer)', 'execute')
     or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x where p.oid = 'public.cotizacion_revisiones(uuid,bigint,integer)'::regprocedure and x.grantee = 0) then
    raise exception 'los grants de cotizacion_revisiones';
  end if;
  if exists (select 1 from unnest(array['public._cotizacion_diff_recortado(jsonb,jsonb,text[])']) f
              where has_function_privilege('anon', f, 'execute') or has_function_privilege('authenticated', f, 'execute')
                 or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x where p.oid = f::regprocedure and x.grantee = 0)) then
    raise exception 'el recorte del diff se puede ejecutar';
  end if;
  -- 5. Una clave del diff que no es una columna conocida no viaja (falla cerrada), ni una columna oculta que no es del snapshot.
  r := jsonb_build_object('d', public._cotizacion_diff_recortado('{"desconocida": {"de": 1, "a": 2}, "notas": {"de": null, "a": "x"}, "eliminado_por": {"de": null, "a": "p"}}',
         public._cotizacion_contexto(array['remate'], v_def, v_vis), array['notas', 'titulo']));
  if r -> 'd' is distinct from '{"notas": {"de": null, "a": "x"}}'::jsonb then raise exception 'una clave desconocida viaja: %', r; end if;
  -- 6. Las revisiones de antes (dos snapshots enteros en valores) se siguen leyendo recortadas igual que las de ahora.
  r := jsonb_build_object('d', public._cotizacion_diff_recortado(jsonb_build_object('valores', jsonb_build_object('de', v1, 'a', v2)),
         public._cotizacion_contexto(array['remate', 'fees', 'tc_p'], v_def, v_vis), array['notas']));
  if r -> 'd' is distinct from jsonb_build_object('valores', jsonb_build_object('de', v1 - 'tc_o' - 'flete' - 'margen', 'a', v2 - 'tc_o' - 'flete' - 'margen')) then raise exception 'una revisión con dos snapshots enteros no se recorta: %', r; end if;
end $$;
rollback;

-- @test visibilidad: formula_para_cotizar sólo la da a quien configura el origen (el mismo error con cualquier uuid), y trae la publicada entera
begin;
do $$
declare
  cfg constant uuid := '00000000-0000-0000-0000-000000000a01'; cfg_otro constant uuid := '00000000-0000-0000-0000-000000000a02'; ve_todo constant uuid := '00000000-0000-0000-0000-000000000a03';
  cfg_todos constant uuid := '00000000-0000-0000-0000-000000000a04'; cfg_sin_formula constant uuid := '00000000-0000-0000-0000-000000000a05';
  o uuid; o2 uuid; o_sin uuid; f_pub uuid; r jsonb; r2 jsonb; v_msg text;
begin
  insert into public.origenes (clave, nombre) values ('cv_fpc', 'CV fpc') returning id into o;
  insert into public.origenes (clave, nombre) values ('cv_fpc_otro', 'CV fpc otro') returning id into o2;
  insert into public.origenes (clave, nombre) values ('cv_fpc_sin', 'CV fpc sin fórmula') returning id into o_sin;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota)
  values (o, 1, 'archivada', '{"nodos": []}', '{"vieja": 1}', '{}', '{}', 'la vieja');
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota)
  values (o, 2, 'publicada', '{"nodos": [{"id": "x", "tipo": "input"}]}', '{"c": 5}', '{"secciones": []}', '{"x": {"ver": "costos", "editar": "costos"}}', 'la publicada') returning id into f_pub;
  insert into public.formulas (origen_id, estado, definicion, params, diseno) values (o, 'borrador', '{"nodos": [{"id": "borrador"}]}', '{}', '{}');
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o2, 1, 'publicada', '{"nodos": []}', '{}', '{}', '{}');
  perform pg_temp.cv_persona(cfg, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o)));
  perform pg_temp.cv_persona(cfg_otro, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o2)));
  perform pg_temp.cv_persona(ve_todo, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.editar'),
                                                         jsonb_build_object('clave', 'cotizaciones.nivel.costos.ver'), jsonb_build_object('clave', 'cotizaciones.nivel.costos.editar')));
  perform pg_temp.cv_persona(cfg_todos, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.configurar')));
  perform pg_temp.cv_persona(cfg_sin_formula, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o_sin)));
  -- 1. Quien configura el origen recibe la publicada entera (no la vieja ni el borrador).
  r := pg_temp.cv_corre(cfg, format('select public.formula_para_cotizar(%L)', o));
  if r ? 'error' then raise exception 'quien configura no la recibe: %', r; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from array['definicion', 'diseno', 'id', 'nota', 'params', 'publicado_en', 'version', 'visibilidad'] then raise exception 'las claves: %', r; end if;
  if r ->> 'id' <> f_pub::text or (r ->> 'version')::int <> 2 or r ->> 'nota' <> 'la publicada' or r -> 'definicion' <> '{"nodos": [{"id": "x", "tipo": "input"}]}'::jsonb
     or r -> 'params' <> '{"c": 5}'::jsonb or r -> 'diseno' <> '{"secciones": []}'::jsonb or r -> 'visibilidad' <> '{"x": {"ver": "costos", "editar": "costos"}}'::jsonb then
    raise exception 'no es la publicada: %', r;
  end if;
  if position('borrador' in r::text) > 0 or position('vieja' in r::text) > 0 then raise exception 'trae el borrador o la vieja: %', r; end if;
  -- 2. Quien configura TODOS los orígenes (una concesión sin origen) también.
  if (pg_temp.cv_corre(cfg_todos, format('select public.formula_para_cotizar(%L)', o))) ? 'error' then raise exception 'quien configura todos los orígenes no la recibe'; end if;
  -- 3. Quien no la configura —ni con ver, crear, editar y el nivel de costos, ni configurando otro origen— recibe el MISMO error con la fórmula de este origen, la de otro, un origen sin fórmula, uno que no existe y null.
  r := pg_temp.cv_corre(ve_todo, format('select public.formula_para_cotizar(%L)', o));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes el permiso «cotizaciones.configurar».' then raise exception 'ver, crear, editar y los costos no dan la fórmula: %', r; end if;
  for r2 in select pg_temp.cv_corre(ve_todo, format('select public.formula_para_cotizar(%L)', x)) from unnest(array[o2, o_sin, gen_random_uuid()]) x loop
    if r2 is distinct from r then raise exception 'el error cambia según el origen: % contra %', r2, r; end if;
  end loop;
  if pg_temp.cv_corre(ve_todo, 'select public.formula_para_cotizar(null)') is distinct from r then raise exception 'null se distingue'; end if;
  r2 := pg_temp.cv_corre(cfg_otro, format('select public.formula_para_cotizar(%L)', o));
  if r2 ->> 'error' is distinct from '42501' then raise exception 'configurar otro origen da la fórmula de éste: %', r2; end if;
  -- 4. Quien configura sí ve lo suyo aunque no haya fórmula, con su error; y sin origen, el suyo.
  r := pg_temp.cv_corre(cfg_sin_formula, format('select public.formula_para_cotizar(%L)', o_sin));
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' is distinct from 'Este origen no tiene una fórmula publicada.' then raise exception 'origen sin fórmula: %', r; end if;
  r := pg_temp.cv_corre(cfg_todos, 'select public.formula_para_cotizar(null)');
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' is distinct from 'Falta el origen.' then raise exception 'sin origen: %', r; end if;
  -- 5. Los grants.
  if has_function_privilege('anon', 'public.formula_para_cotizar(uuid)', 'execute') or not has_function_privilege('authenticated', 'public.formula_para_cotizar(uuid)', 'execute')
     or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x where p.oid = 'public.formula_para_cotizar(uuid)'::regprocedure and x.grantee = 0) then
    raise exception 'los grants de formula_para_cotizar';
  end if;
end $$;
rollback;

-- @test visibilidad: las tablas de referencia se leen por lo que la hoja ve: sólo las columnas que leen los nodos visibles, la congelada de la versión manda, y sin acceso es como si no existieran
begin;
do $$
declare
  sin constant uuid := '00000000-0000-0000-0000-000000000b01'; con constant uuid := '00000000-0000-0000-0000-000000000b02'; cfg constant uuid := '00000000-0000-0000-0000-000000000b03';
  cfg_todos constant uuid := '00000000-0000-0000-0000-000000000b04'; sin_crear constant uuid := '00000000-0000-0000-0000-000000000b05'; otro constant uuid := '00000000-0000-0000-0000-000000000b06';
  propios constant uuid := '00000000-0000-0000-0000-000000000b07';
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  o uuid; o2 uuid; v_def jsonb; v_vis jsonb; v_diseno jsonb; v_par jsonb; f1 uuid; c uuid; r jsonb; r2 jsonb; k text;
begin
  insert into public.origenes (clave, nombre) values ('cv_tabla', 'CV tabla') returning id into o;
  insert into public.origenes (clave, nombre) values ('cv_tabla_otro', 'CV tabla otro') returning id into o2;
  -- Las tablas: el transporte (con la columna de costos), la depreciación (un tramo con una columna interna), una que sólo lee un nodo de costos, una que nadie nombra y una compartida.
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values
    (o, 'transporte', 'Transporte', '[{"clave": "tipo", "etiqueta": "Tipo", "tipo": "texto"}, {"clave": "oficina", "etiqueta": "Oficina", "tipo": "numero"}, {"clave": "cliente", "etiqueta": "Cliente", "tipo": "numero"}]'),
    (o, 'dep', 'Depreciación', '[{"clave": "desde", "etiqueta": "Desde", "tipo": "anio"}, {"clave": "hasta", "etiqueta": "Hasta", "tipo": "anio"}, {"clave": "factor", "etiqueta": "Factor", "tipo": "numero"}, {"clave": "interno", "etiqueta": "Interno", "tipo": "numero"}, {"clave": "rotulo", "etiqueta": "Rótulo", "tipo": "texto"}]'),
    (o, 'solo_costos', 'Sólo costos', '[{"clave": "k", "etiqueta": "K", "tipo": "texto"}, {"clave": "v", "etiqueta": "V", "tipo": "numero"}]'),
    (o, 'ruido', 'Ruido', '[{"clave": "k", "etiqueta": "K", "tipo": "texto"}]'),
    (o2, 'transporte', 'Transporte de otro origen', '[{"clave": "tipo", "etiqueta": "Tipo", "tipo": "texto"}]'),
    (null, 'compartida', 'Compartida', '[{"clave": "k", "etiqueta": "K", "tipo": "texto"}, {"clave": "v", "etiqueta": "V", "tipo": "numero"}]');
  insert into public.tablas_referencia_filas (tabla_id, valores, orden)
    select t.id, f.v, f.ord from public.tablas_referencia t join (values
      ('transporte', '{"tipo": "autos", "oficina": 1500.5, "cliente": 2500.5}'::jsonb, 0), ('transporte', '{"tipo": "motos", "oficina": 700.5, "cliente": 900.5}', 1),
      ('dep', '{"desde": 2020, "hasta": 2025, "factor": 0.9, "interno": 777.5, "rotulo": "reciente"}', 0), ('dep', '{"desde": 2010, "hasta": 2019, "factor": 0.7, "interno": 888.5, "rotulo": "antiguo"}', 1),
      ('solo_costos', '{"k": "a", "v": 3131.5}', 0), ('ruido', '{"k": "r"}', 0), ('compartida', '{"k": "c", "v": 4242.5}', 0)) f (clave, v, ord) on t.clave = f.clave and t.origen_id is not distinct from
        (case when f.clave = 'compartida' then null else o end);
  insert into public.tablas_referencia_filas (tabla_id, valores, orden) select id, '{"tipo": "ajena"}', 0 from public.tablas_referencia where origen_id = o2;
  -- La fórmula: dos nodos de `transporte` (uno de todos, otro de costos), un tramo de `dep` con sus atajos, un nodo de costos sobre `solo_costos` y uno de todos sobre la compartida.
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'anio_x', 'tipo', 'input'),
    jsonb_build_object('id', 't_cliente', 'tipo', 'tabla', 'tabla', 'transporte', 'match', jsonb_build_object('tipo', 'tipo_vehiculo'), 'columna', 'cliente'),
    jsonb_build_object('id', 't_oficina', 'tipo', 'tabla', 'tabla', 'transporte', 'match', jsonb_build_object('tipo', 'tipo_vehiculo'), 'columna', 'oficina'),
    jsonb_build_object('id', 'fact', 'tipo', 'tramo', 'tabla', 'dep', 'sobre', 'anio_x', 'columna', 'factor'),
    jsonb_build_object('id', 't_costos', 'tipo', 'tabla', 'tabla', 'solo_costos', 'match', jsonb_build_object('k', 'k'), 'columna', 'v'),
    jsonb_build_object('id', 't_comp', 'tipo', 'tabla', 'tabla', 'compartida', 'match', jsonb_build_object('k', 'k'), 'columna', 'v'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('anio_x'), 'salida', 'total')));
  v_vis := '{"anio_x": {"ver": "todos", "editar": "todos"}, "t_cliente": {"ver": "todos", "editar": null}, "t_oficina": {"ver": "costos", "editar": null}, "fact": {"ver": "todos", "editar": null},
             "t_costos": {"ver": "costos", "editar": null}, "t_comp": {"ver": "todos", "editar": null}, "total": {"ver": "todos", "editar": null}}';
  v_diseno := jsonb_build_object('secciones', jsonb_build_array(jsonb_build_object('id', 's', 'items', jsonb_build_array(jsonb_build_object('tipo', 'atajos', 'nodo', 'fact', 'columna', 'rotulo', 'filas', 3),
    jsonb_build_object('tipo', 'atajos', 'nodo', 't_costos', 'columna', 'k', 'filas', 3)))));
  v_par := '{"tablas": {"transporte": [{"tipo": "autos", "oficina": 9999.5, "cliente": 8888.5}]}}';
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o, 1, 'publicada', v_def, '{}', v_diseno, v_vis) returning id into f1;
  perform pg_temp.cv_persona(sin, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear')));
  perform pg_temp.cv_persona(con, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.nivel.costos.ver')));
  perform pg_temp.cv_persona(cfg, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o)));
  perform pg_temp.cv_persona(cfg_todos, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.configurar')));
  perform pg_temp.cv_persona(sin_crear, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver')));
  perform pg_temp.cv_persona(propios, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o, 'alcance', 'propios'), jsonb_build_object('clave', 'cotizaciones.crear', 'origen', o)));
  perform pg_temp.cv_persona(otro, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o2), jsonb_build_object('clave', 'cotizaciones.crear', 'origen', o2), jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o2)));

  -- 1. Sin el nivel: del transporte, `tipo` y `cliente` (el nodo de todos), nunca `oficina` ni su valor; las etiquetas también se recortan.
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_tabla(%L, null, %L)', 'transporte', o));
  if r ? 'error' then raise exception 'sin el nivel no lee la tabla que un nodo suyo lee: %', r; end if;
  if (select array_agg(col ->> 'clave' order by col ->> 'clave') from jsonb_array_elements(r -> 'columnas') col) is distinct from array['cliente', 'tipo'] then raise exception 'columnas sin el nivel: %', r -> 'columnas'; end if;
  if r -> 'filas' is distinct from '[{"tipo": "autos", "cliente": 2500.5}, {"tipo": "motos", "cliente": 900.5}]'::jsonb then raise exception 'filas sin el nivel: %', r -> 'filas'; end if;
  if position('oficina' in r::text) > 0 or position('1500' in r::text) > 0 or position('700.5' in r::text) > 0 or r ->> 'congelada' <> 'false' then raise exception 'la columna de costos viaja: %', r; end if;
  -- 2. Con el nivel: la columna de costos también.
  r := pg_temp.cv_corre(con, format('select public.cotizacion_tabla(%L, null, %L)', 'transporte', o));
  if (select array_agg(col ->> 'clave' order by col ->> 'clave') from jsonb_array_elements(r -> 'columnas') col) is distinct from array['cliente', 'oficina', 'tipo']
     or r -> 'filas' -> 0 is distinct from '{"tipo": "autos", "oficina": 1500.5, "cliente": 2500.5}'::jsonb then raise exception 'con el nivel: %', r; end if;
  -- 3. Un tramo: `desde`, `hasta` y su columna, más la que etiqueta sus atajos (que ve); la interna no. Los atajos de un nodo de costos no abren su tabla.
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_tabla(%L, null, %L)', 'dep', o));
  if (select array_agg(col ->> 'clave' order by col ->> 'clave') from jsonb_array_elements(r -> 'columnas') col) is distinct from array['desde', 'factor', 'hasta', 'rotulo'] or position('interno' in r::text) > 0 or position('777' in r::text) > 0 then
    raise exception 'el tramo: %', r;
  end if;
  -- 4. Una tabla que sólo lee un nodo de costos, una que nadie nombra, una de otro origen y una que no existe dan el MISMO error a quien no ve el nodo.
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_tabla(%L, null, %L)', 'zz_no_existe', o));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esa tabla.' then raise exception 'una inexistente: %', r; end if;
  for k in select unnest(array['solo_costos', 'ruido', 'compartida_x']) loop
    if pg_temp.cv_corre(sin, format('select public.cotizacion_tabla(%L, null, %L)', k, o)) is distinct from r then raise exception 'la tabla % se distingue de una inexistente', k; end if;
  end loop;
  -- 5. Con el nivel, la de costos sí; la compartida (la del origen no existe) llega a quien ve el nodo que la lee.
  r2 := pg_temp.cv_corre(con, format('select public.cotizacion_tabla(%L, null, %L)', 'solo_costos', o));
  if r2 ? 'error' or r2 -> 'filas' <> '[{"k": "a", "v": 3131.5}]'::jsonb then raise exception 'con el nivel, la tabla de costos: %', r2; end if;
  r2 := pg_temp.cv_corre(sin, format('select public.cotizacion_tabla(%L, null, %L)', 'compartida', o));
  if r2 ? 'error' or r2 -> 'filas' <> '[{"k": "c", "v": 4242.5}]'::jsonb then raise exception 'la compartida: %', r2; end if;
  -- 6. Quien configura el origen: la tabla entera, también la que nadie nombra; no la de otro origen.
  r2 := pg_temp.cv_corre(cfg, format('select public.cotizacion_tabla(%L, null, %L)', 'transporte', o));
  if r2 -> 'filas' -> 0 is distinct from '{"tipo": "autos", "oficina": 1500.5, "cliente": 2500.5}'::jsonb then raise exception 'quien configura recibe la tabla entera: %', r2; end if;
  if (pg_temp.cv_corre(cfg, format('select public.cotizacion_tabla(%L, null, %L)', 'ruido', o))) ? 'error' then raise exception 'quien configura no recibe la que nadie nombra'; end if;
  -- 7. Por cotización: la congelada de SU versión manda (aunque la viva sea otra), y lo oculto sigue oculto.
  update public.formulas set estado = 'archivada' where id = f1;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o, 2, 'publicada', v_def, v_par, v_diseno, v_vis) returning id into f1;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo)
  values (o, duena, f1, '{}', '{}', '{}', '{}', 0, 'CV tabla') returning id into c;
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_tabla(%L, %L)', 'transporte', c));
  if r -> 'filas' is distinct from '[{"tipo": "autos", "cliente": 8888.5}]'::jsonb or r ->> 'congelada' <> 'true' or position('9999' in r::text) > 0 then raise exception 'la congelada de la versión, sin la columna de costos: %', r; end if;
  r := pg_temp.cv_corre(con, format('select public.cotizacion_tabla(%L, %L)', 'transporte', c));
  if r -> 'filas' is distinct from '[{"tipo": "autos", "oficina": 9999.5, "cliente": 8888.5}]'::jsonb then raise exception 'con el nivel, la congelada: %', r; end if;
  -- Y la publicada, por origen, también trae la congelada.
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_tabla(%L, null, %L)', 'transporte', o));
  if r ->> 'congelada' <> 'true' then raise exception 'por origen, la publicada trae la congelada: %', r; end if;
  -- 8. Los permisos de la llamada: sin crear no hay por origen; sin ver la cotización no hay por ella; ni los dos ni ninguno.
  if (pg_temp.cv_corre(sin_crear, format('select public.cotizacion_tabla(%L, null, %L)', 'transporte', o))) ->> 'error' is distinct from '42501' then raise exception 'sin crear lee por origen'; end if;
  if (pg_temp.cv_corre(otro, format('select public.cotizacion_tabla(%L, %L)', 'transporte', c))) ->> 'error' is distinct from '42501' then raise exception 'quien no ve la cotización lee su tabla'; end if;
  -- Ve el origen (y los nodos de todos) pero no esa cotización, que es de otra persona y de ningún lead suyo: tampoco su tabla.
  if (pg_temp.cv_corre(propios, format('select public.cotizacion_tabla(%L, %L)', 'transporte', c))) ->> 'error' is distinct from '42501' then raise exception 'quien ve «propios» lee la tabla de una cotización ajena'; end if;
  if (pg_temp.cv_corre(propios, format('select public.cotizacion_tabla(%L, null, %L)', 'transporte', o))) ? 'error' then raise exception 'quien ve «propios» sí lee la tabla del origen que cotiza'; end if;
  if (pg_temp.cv_corre(sin, format('select public.cotizacion_tabla(%L)', 'transporte'))) ->> 'error' is distinct from '22023' then raise exception 'sin cotización ni origen'; end if;
  if (pg_temp.cv_corre(sin, format('select public.cotizacion_tabla(%L, %L, %L)', 'transporte', c, o))) ->> 'error' is distinct from '22023' then raise exception 'con las dos'; end if;
  -- 9. La policy: nadie lee las tablas directo salvo quien configura (su origen, o todos con una concesión sin origen).
  if (pg_temp.cv_corre(sin, 'select jsonb_build_object(''t'', (select count(*) from public.tablas_referencia), ''f'', (select count(*) from public.tablas_referencia_filas))')) <> '{"t": 0, "f": 0}'::jsonb then raise exception 'sin configurar lee tablas directo'; end if;
  if (pg_temp.cv_corre(con, 'select jsonb_build_object(''t'', (select count(*) from public.tablas_referencia), ''f'', (select count(*) from public.tablas_referencia_filas))')) <> '{"t": 0, "f": 0}'::jsonb then raise exception 'con el nivel lee tablas directo'; end if;
  r := pg_temp.cv_corre(cfg, 'select jsonb_build_object(''t'', (select count(*) from public.tablas_referencia where clave in (''transporte'', ''dep'', ''solo_costos'', ''ruido'', ''compartida'')), ''ajena'', (select count(*) from public.tablas_referencia where origen_id is distinct from ' || quote_literal(o) || '::uuid and clave like ''transporte%''), ''compartida'', (select count(*) from public.tablas_referencia where origen_id is null and clave = ''compartida''))');
  -- Las cuatro de su origen y la compartida (quien configura algún origen la lee: la usa cualquiera); no la de otro origen.
  if r is distinct from '{"t": 5, "ajena": 0, "compartida": 1}'::jsonb then raise exception 'quien configura un origen lee las tablas de su origen y las compartidas, no las de otros: %', r; end if;
  r := pg_temp.cv_corre(cfg_todos, 'select jsonb_build_object(''compartida'', (select count(*) from public.tablas_referencia where origen_id is null and clave = ''compartida''), ''filas'', (select count(*) from public.tablas_referencia_filas f join public.tablas_referencia t on t.id = f.tabla_id where t.clave = ''compartida''))');
  if r is distinct from '{"compartida": 1, "filas": 1}'::jsonb then raise exception 'quien configura todos los orígenes lee también la compartida: %', r; end if;
  -- 10. Los grants.
  if has_function_privilege('anon', 'public.cotizacion_tabla(text,uuid,uuid,text)', 'execute') or not has_function_privilege('authenticated', 'public.cotizacion_tabla(text,uuid,uuid,text)', 'execute')
     or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x where p.oid = 'public.cotizacion_tabla(text,uuid,uuid,text)'::regprocedure and x.grantee = 0) then
    raise exception 'los grants de cotizacion_tabla';
  end if;
end $$;
rollback;

-- @test visibilidad: ninguna escritura directa de cotizaciones ni de sus revisiones (4.10-2): ni insert, ni update, ni delete, por tabla y por columna, para authenticated, anon y PUBLIC; la lectura y service_role siguen
begin;
do $$
declare
  v_t text; v_r text; v_p text; v_col record; v_sql text;
begin
  create role cv_nadie nologin;
  foreach v_t in array array['cotizaciones', 'cotizaciones_revisiones'] loop
    foreach v_r in array array['authenticated', 'anon', 'public', 'cv_nadie'] loop
      -- Por tabla: ningún privilegio de escritura (y ni los de referencia ni el de disparador).
      foreach v_p in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
        if has_table_privilege(v_r, 'public.' || v_t, v_p) then raise exception '% tiene % sobre %', v_r, v_p, v_t; end if;
      end loop;
      -- Por columna: ni insert, ni update, ni referencias de ninguna (el revoke de tabla ya las quita; el de columna es la defensa explícita).
      for v_col in select a.attname, a.attnum from pg_attribute a where a.attrelid = ('public.' || v_t)::regclass and a.attnum > 0 and not a.attisdropped loop
        foreach v_p in array array['INSERT', 'UPDATE', 'REFERENCES'] loop
          if has_column_privilege(v_r, ('public.' || v_t)::regclass, v_col.attnum, v_p) then raise exception '% tiene % sobre %.%', v_r, v_p, v_t, v_col.attname; end if;
        end loop;
      end loop;
    end loop;
    -- Quien sí escribe (los jobs y las funciones con los derechos de la base).
    foreach v_p in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
      if not has_table_privilege('service_role', 'public.' || v_t, v_p) then raise exception 'service_role perdió % sobre %', v_p, v_t; end if;
    end loop;
  end loop;
  -- La lectura de las columnas legibles sigue como estaba.
  if not has_column_privilege('authenticated', 'public.cotizaciones', 'total_base', 'select') or not has_column_privilege('authenticated', 'public.cotizaciones', 'id', 'select') then
    raise exception 'authenticated perdió la lectura de las columnas legibles';
  end if;

  -- Y por el SQL de verdad: como authenticated, como anon y como un rol que sólo tiene lo de PUBLIC, el insert, el update y el delete directos dan 42501 (por tabla y por cada columna).
  foreach v_r in array array['authenticated', 'anon', 'cv_nadie'] loop
    execute format('set local role %I', v_r);
    foreach v_t in array array['cotizaciones', 'cotizaciones_revisiones'] loop
      perform pg_temp.cv_da(format('delete from public.%I where false', v_t), '42501');
      -- (Una columna `generated always` —el número— da 428C9 antes de mirar el permiso: sólo cuenta su privilegio, que ya se miró arriba.)
      for v_col in select a.attname from pg_attribute a where a.attrelid = ('public.' || v_t)::regclass and a.attnum > 0 and not a.attisdropped and a.attidentity <> 'a' and a.attgenerated = '' loop
        perform pg_temp.cv_da(format('update public.%I set %I = %I where false', v_t, v_col.attname, v_col.attname), '42501');
        perform pg_temp.cv_da(format('insert into public.%I (%I) values (null)', v_t, v_col.attname), '42501');
      end loop;
    end loop;
    reset role;
  end loop;
  -- No queda una policy de escritura (sin grant eran letra muerta).
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename in ('cotizaciones', 'cotizaciones_revisiones') and cmd in ('INSERT', 'UPDATE', 'DELETE')) then
    raise exception 'quedó una policy de escritura sobre cotizaciones o sus revisiones';
  end if;
end $$;
rollback;

-- @test visibilidad: la auditoría sigue completa con la escritura por RPC (4.10-2): el alta por cotizacion_crear, la edición por cotizacion_marcar_final y el borrado por la papelera, sin el snapshot
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  o uuid := (select id from public.origenes where clave = 'oficina'); l uuid; v uuid; r jsonb; v_c uuid; v_lote uuid; v_n int;
  v_ocultas constant text[] := array['valores', 'fuentes', 'totales', 'tipos_cambio'];
begin
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('CV lead auditoria', '72150001', duena, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'CV auditoria', 'toyota') returning id into v;
  -- Alta: por la RPC, como la dueña (authenticated).
  r := pg_temp.cv_corre(duena, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{"inputs": {}}'', (public.cotizacion_hoja(%L) ->> ''abierta''), %L)', o, l, o, v));
  if r ? 'error' then
    -- La fórmula de «oficina» pide sus entradas: si falla por falta de datos, se prueba con la tipeada en la fórmula sembrada.
    raise exception 'el alta por la RPC falló: %', r;
  end if;
  v_c := (r -> 'cotizacion' ->> 'id')::uuid;
  if (select count(*) from public.actividad where tabla = 'cotizaciones' and registro_id = v_c::text and accion = 'cotizaciones.insert' and actor_id = duena) <> 1 then
    raise exception 'el alta por cotizacion_crear no quedó en actividad con su actor';
  end if;
  -- Edición: marcarla final (la RPC cambia la clase).
  r := pg_temp.cv_corre(duena, format('select jsonb_build_object(''ok'', true) from (select public.cotizacion_marcar_final(%L)) x', v_c));
  if r ? 'error' then raise exception 'marcar la final falló: %', r; end if;
  if not exists (select 1 from public.actividad where tabla = 'cotizaciones' and registro_id = v_c::text and accion = 'cotizaciones.update' and despues ->> 'clase' = 'final') then
    raise exception 'marcar la final no quedó en actividad';
  end if;
  -- Borrado: a la papelera (que ya no puede por ser la final) y purgada: se prueba con otra, preventa.
  r := pg_temp.cv_corre(duena, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{"inputs": {}}'', (public.cotizacion_hoja(%L) ->> ''abierta''), %L)', o, l, o, v));
  if r ? 'error' then raise exception 'la segunda alta por la RPC falló: %', r; end if;
  v_c := (r -> 'cotizacion' ->> 'id')::uuid;
  r := pg_temp.cv_corre(duena, format('select to_jsonb(public.papelera_enviar(%L, array[%L]::uuid[]))', 'cotizaciones', v_c));
  if r ? 'error' then raise exception 'enviar a la papelera falló: %', r; end if;
  v_lote := (r #>> '{}')::uuid;
  r := pg_temp.cv_corre(duena, format('select to_jsonb(public.papelera_purgar(%L))', v_lote));
  if r ? 'error' then raise exception 'purgar falló: %', r; end if;
  if not exists (select 1 from public.actividad where tabla = 'cotizaciones' and registro_id = v_c::text and accion = 'cotizaciones.delete' and despues is null and antes ->> 'id' = v_c::text) then
    raise exception 'el borrado por la papelera no quedó en actividad';
  end if;
  -- Ninguna fila guarda el snapshot, ni el valor tipeado.
  select count(*) into v_n from public.actividad where tabla = 'cotizaciones' and (coalesce(antes, '{}') ?| v_ocultas or coalesce(despues, '{}') ?| v_ocultas);
  if v_n <> 0 then raise exception 'actividad guarda el snapshot de una cotización (% filas)', v_n; end if;
end $$;
rollback;

-- @test visibilidad: lo que `cotizacion_crear` y `cotizacion_evaluar` dicen de un lead, un vehículo, un nodo o una variante que quien llama no ve es lo mismo que dirían si no existieran (4.10-2)
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  base constant text[] := array['cotizaciones.ver', 'cotizaciones.crear', 'leads.ver', 'vehiculos.ver'];
  sin uuid := gen_random_uuid(); sin_lv uuid := gen_random_uuid(); sin_v uuid := gen_random_uuid(); solo_ver uuid := gen_random_uuid(); otro uuid := gen_random_uuid(); k uuid := gen_random_uuid();
  o_con uuid; o_sin uuid; o_nd uuid; l uuid; l_pap uuid; v uuid; v_pap uuid; c_ajena uuid; v_def jsonb; v_vis jsonb; v_def_sin jsonb; v_vis_sin jsonb;
  r jsonb; r2 jsonb; v_sql text; v_q record; v_cb text := '{"inputs": {"visible": 1}';
  c_nodos constant jsonb := jsonb_build_array(
    jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'oculto_costos', 'tipo', 'input', 'etiqueta', 'Oculto', 'bucket', 'origen'));
begin
  update public.ajustes_empresa set vehiculo_obligatorio_al_cotizar = false where id = 1;
  perform pg_temp.cv_persona(sin, (select jsonb_agg(jsonb_build_object('clave', c)) from unnest(base) c));
  perform pg_temp.cv_persona(otro, (select jsonb_agg(jsonb_build_object('clave', c)) from unnest(base) c));
  perform pg_temp.cv_persona(sin_lv, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear')));
  perform pg_temp.cv_persona(solo_ver, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'leads.ver'), jsonb_build_object('clave', 'cotizaciones.nivel.costos.ver')));
  perform pg_temp.cv_persona(sin_v, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'leads.ver')));
  perform pg_temp.cv_persona(k, (select jsonb_agg(jsonb_build_object('clave', c)) from unnest(base || array['cotizaciones.nivel.costos.ver', 'cotizaciones.nivel.costos.editar']) c));
  -- Tres fórmulas: una con una variante, una bandera y un input del nivel «costos» (con y sin `por_defecto`) y otra sin variante ni bandera.
  v_def := jsonb_build_object('nodos', c_nodos || jsonb_build_array(
      jsonb_build_object('id', 'b_costos', 'tipo', 'bandera', 'etiqueta', 'B', 'formato', 'raw'),
      jsonb_build_object('id', 'var_costos', 'tipo', 'opcion', 'etiqueta', 'V', 'por_defecto', 'a', 'opciones', jsonb_build_array(
        jsonb_build_object('clave', 'a', 'etiqueta', 'A', 'titulo', 'T A'), jsonb_build_object('clave', 'b', 'etiqueta', 'B', 'titulo', 'T B'))),
      jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible', 'oculto_costos'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
    'buckets', jsonb_build_object('origen', 'tc'));
  v_vis := jsonb_build_object('tc', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'),
    'oculto_costos', jsonb_build_object('ver', 'costos', 'editar', 'costos'), 'b_costos', jsonb_build_object('ver', 'costos', 'editar', 'costos'),
    'var_costos', jsonb_build_object('ver', 'costos', 'editar', 'costos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null));
  v_def_sin := jsonb_build_object('nodos', c_nodos || jsonb_build_array(
      jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible', 'oculto_costos'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
    'buckets', jsonb_build_object('origen', 'tc'));
  v_vis_sin := jsonb_build_object('tc', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'),
    'oculto_costos', jsonb_build_object('ver', 'costos', 'editar', 'costos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null));
  insert into public.origenes (clave, nombre) values ('cv_d_con', 'CV d con') returning id into o_con;
  insert into public.origenes (clave, nombre) values ('cv_d_sin', 'CV d sin') returning id into o_sin;
  insert into public.origenes (clave, nombre) values ('cv_d_nd', 'CV d nd') returning id into o_nd;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o_con, 1, 'publicada', v_def, '{}', '{}', v_vis);
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o_sin, 1, 'publicada', v_def_sin, '{}', '{}', v_vis_sin);
  -- La tercera es la primera sin `por_defecto`.
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o_nd, 1, 'publicada', jsonb_set(v_def, '{nodos}', (select jsonb_agg(case when n ->> 'id' = 'var_costos' then n - 'por_defecto' else n end) from jsonb_array_elements(v_def -> 'nodos') n)), '{}', '{}', v_vis);
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('CV d lead', '72150002', duena, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos, eliminado_en)
  values ('CV d lead borrado', '72150003', duena, (select id from public.origenes_lead where clave = 'web'), '{}', now()) returning id into l_pap;
  insert into public.vehiculos (origen_id, titulo, marca) values (o_sin, 'CV d vehículo', 'toyota') returning id into v;
  insert into public.vehiculos (origen_id, titulo, marca, eliminado_en) values (o_sin, 'CV d vehículo borrado', 'toyota', now()) returning id into v_pap;

  -- 1. El lead: inexistente, de la papelera y de quien no tiene leads.ver dan el mismo error.
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{}'', (public.cotizacion_hoja(%L) ->> ''abierta''))', o_sin, gen_random_uuid(), o_sin));
  if r ->> 'error' is distinct from '42501' then raise exception 'un lead inexistente debía dar 42501: %', r; end if;
  if pg_temp.cv_corre(sin, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{}'', (public.cotizacion_hoja(%L) ->> ''abierta''))', o_sin, l_pap, o_sin)) is distinct from r
     or pg_temp.cv_corre(sin_lv, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{}'', (public.cotizacion_hoja(%L) ->> ''abierta''))', o_sin, l, o_sin)) is distinct from r then
    raise exception 'el lead de la papelera o el de quien no lo ve se distinguen de uno inexistente';
  end if;
  -- 2. El vehículo: inexistente, de la papelera y de quien no tiene vehiculos.ver dan el mismo error, y el mismo que da cotizacion_evaluar.
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{}'', (public.cotizacion_hoja(%L) ->> ''abierta''), %L)', o_sin, l, o_sin, gen_random_uuid()));
  if r ->> 'error' is distinct from '42501' then raise exception 'un vehículo inexistente debía dar 42501: %', r; end if;
  if pg_temp.cv_corre(sin, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{}'', (public.cotizacion_hoja(%L) ->> ''abierta''), %L)', o_sin, l, o_sin, v_pap)) is distinct from r
     or pg_temp.cv_corre(sin_v, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{}'', (public.cotizacion_hoja(%L) ->> ''abierta''), %L)', o_sin, l, o_sin, v)) is distinct from r
     or pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(''{}''::jsonb, null, %L, %L)', o_sin, gen_random_uuid())) is distinct from r then
    raise exception 'el vehículo de la papelera, el que no se ve o el de cotizacion_evaluar se distinguen de uno inexistente';
  end if;
  -- 3. El id de una cotización de otra persona da lo que daría cotizacion_leer con un id que no existe.
  r := pg_temp.cv_corre(otro, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{}'', (public.cotizacion_hoja(%L) ->> ''abierta''))', o_sin, l, o_sin));
  c_ajena := (r -> 'cotizacion' ->> 'id')::uuid;
  if c_ajena is null then raise exception 'la alta de la otra persona falló: %', r; end if;
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_crear(%L, %L, %L, ''{}'', (public.cotizacion_hoja(%L) ->> ''abierta''))', c_ajena, o_sin, l, o_sin));
  if r is distinct from pg_temp.cv_corre(sin, format('select public.cotizacion_leer(%L)', gen_random_uuid())) then raise exception 'un id ajeno se distingue de uno que no existe: %', r; end if;
  -- 4. Un nodo oculto (un input, una bandera, un override) o la variante oculta se dicen como uno que no existe, en las dos RPC.
  for v_q in select * from (values
      ('crear', 'inputs', '{"inputs": {"oculto_costos": 1}}', '{"inputs": {"zz_inexistente": 1}}', 'oculto_costos'),
      ('crear', 'banderas', '{"banderas": {"b_costos": true}}', '{"banderas": {"zz_inexistente": true}}', 'b_costos'),
      ('crear', 'overrides', '{"overrides": {"oculto_costos": 1}}', '{"overrides": {"zz_inexistente": 1}}', 'oculto_costos'),
      ('evaluar', 'inputs', '{"inputs": {"oculto_costos": 1}}', '{"inputs": {"zz_inexistente": 1}}', 'oculto_costos'),
      ('evaluar', 'banderas', '{"banderas": {"b_costos": true}}', '{"banderas": {"zz_inexistente": true}}', 'b_costos'),
      ('evaluar', 'overrides', '{"overrides": {"oculto_costos": 1}}', '{"overrides": {"zz_inexistente": 1}}', 'oculto_costos')) t (rpc, que, oculto, inexistente, nodo) loop
    v_sql := case v_q.rpc when 'crear' then 'select public.cotizacion_crear(gen_random_uuid(), %L, %L, %L::jsonb, (public.cotizacion_hoja(%L) ->> ''abierta''))' else 'select public.cotizacion_evaluar(%L::jsonb, null, %L)' end;
    if v_q.rpc = 'crear' then
      r := pg_temp.cv_corre(sin, format(v_sql, o_con, l, v_q.oculto, o_con)); r2 := pg_temp.cv_corre(sin, format(v_sql, o_con, l, v_q.inexistente, o_con));
    else
      r := pg_temp.cv_corre(sin, format(v_sql, v_q.oculto, o_con)); r2 := pg_temp.cv_corre(sin, format(v_sql, v_q.inexistente, o_con));
    end if;
    if replace(r::text, v_q.nodo, 'zz_inexistente') is distinct from r2::text then
      raise exception '% de % con un nodo oculto se distingue de uno inexistente: % contra %', v_q.que, v_q.rpc, r, r2;
    end if;
    if v_q.que = 'overrides' and v_q.rpc = 'crear' and r ->> 'detail' is distinct from 'nodo_inexistente' then raise exception 'un override oculto en crear debía dar nodo_inexistente: %', r; end if;
  end loop;
  -- 5. La variante: con la opción oculta, elegir una da lo que da una fórmula SIN variante (el texto no nombra el nodo ni lleva su pista), en las dos RPC; no elegir ninguna, sin `por_defecto`, tampoco la nombra.
  r2 := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(''{"variante": "b"}''::jsonb, null, %L)', o_sin));
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(''{"variante": "b"}''::jsonb, null, %L)', o_con));
  if r2 ->> 'error' is distinct from '22023' or r is distinct from r2 then raise exception 'la variante oculta en evaluar se distingue de una fórmula sin variante: % contra %', r, r2; end if;
  r2 := pg_temp.cv_corre(sin, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{"variante": "b"}'', (public.cotizacion_hoja(%L) ->> ''abierta''))', o_sin, l, o_sin));
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{"variante": "b"}'', (public.cotizacion_hoja(%L) ->> ''abierta''))', o_con, l, o_con));
  if r2 ->> 'error' is distinct from '22023' or r is distinct from r2 then raise exception 'la variante oculta en crear se distingue de una fórmula sin variante: % contra %', r, r2; end if;
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(''{}''::jsonb, null, %L)', o_nd));
  if r ->> 'error' is distinct from '22023' or r::text like '%var_costos%' then raise exception 'sin por_defecto y con la opción oculta debía dar un error que no nombra el nodo: %', r; end if;
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{}'', (public.cotizacion_hoja(%L) ->> ''abierta''))', o_nd, l, o_nd));
  if r ->> 'error' is distinct from '22023' or r::text like '%var_costos%' then raise exception 'crear sin por_defecto y con la opción oculta debía dar un error que no nombra el nodo: %', r; end if;
  -- Quien ve el nivel y no lo edita ve la variante pero no la elige: nodo_no_editable (con la pista del nodo, que sí ve).
  r := pg_temp.cv_corre(solo_ver, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{"variante": "b"}'', (public.cotizacion_hoja(%L) ->> ''abierta''))', o_con, l, o_con));
  if r ->> 'error' is distinct from '42501' or r ->> 'detail' is distinct from 'nodo_no_editable' or r ->> 'hint' is distinct from 'var_costos' then raise exception 'elegir la variante de un nivel que sólo se ve debía dar nodo_no_editable: %', r; end if;
  -- Quien ve y edita el nivel sí elige la variante.
  r := pg_temp.cv_corre(k, format('select public.cotizacion_evaluar(''{"variante": "b"}''::jsonb, null, %L)', o_con));
  if r ? 'error' or r -> 'valores' ->> 'var_costos' is distinct from 'b' then raise exception 'quien tiene el nivel no pudo elegir la variante: %', r; end if;
  r := pg_temp.cv_corre(k, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{"variante": "b"}'', (public.cotizacion_hoja(%L) ->> ''abierta''))', o_con, l, o_con));
  if r ? 'error' or r -> 'valores' ->> 'var_costos' is distinct from 'b' then raise exception 'quien tiene el nivel no pudo crear con la variante: %', r; end if;
  -- 6. Una cotización que ya tiene su variante (la opción es de «costos» y no trae `por_defecto`): quien no la ve la evalúa sin el error de «sin elección» y la variante guardada se conserva.
  r := pg_temp.cv_corre(k, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{"variante": "b"}'', (public.cotizacion_hoja(%L) ->> ''abierta''))', o_nd, l, o_nd));
  r2 := pg_temp.cv_corre(sin, format('select public.cotizacion_evaluar(''{}''::jsonb, %L)', r -> 'cotizacion' ->> 'id'));
  if r2 ? 'error' or r2::text like '%var_costos%' then raise exception 'una cotización guardada con variante debía evaluarse sin elegirla: %', r2; end if;
  r2 := pg_temp.cv_corre(k, format('select public.cotizacion_evaluar(''{}''::jsonb, %L)', r -> 'cotizacion' ->> 'id'));
  if r2 ? 'error' or r2 -> 'valores' ->> 'var_costos' is distinct from 'b' then raise exception 'la variante guardada debía conservarse al evaluar sin mandarla: %', r2; end if;
end $$;
rollback;
