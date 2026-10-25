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
--   - Una función "puede devolver contenido" si su tipo de retorno carga datos (no void, booleano, uuid, número, fecha ni trigger).
--   - Es fuente si su texto, sin comentarios, nombra una de las tablas con una de sus columnas ocultas, hace `select *` de ellas, o devuelve su fila.
--   - Y también lo es quien la llama (cierre): una función que devuelve lo que otra leyó.
create or replace function pg_temp.cv_inventario()
returns table (id oid, nombre name, argumentos text, retorna text, ejecutable boolean) language sql as $f$
  with recursive todas as (
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args, pg_get_function_result(p.oid) as retorna,
           regexp_replace(p.prosrc, '--[^\n]*', '', 'g') as src, p.prorettype,
           p.prorettype not in ('void'::regtype, 'boolean'::regtype, 'uuid'::regtype, 'integer'::regtype, 'bigint'::regtype, 'smallint'::regtype,
                                'numeric'::regtype, 'timestamp with time zone'::regtype, 'date'::regtype, 'trigger'::regtype) as carga,
           has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute') as ejecutable
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'web') and p.prokind = 'f'
  ), fuente as (
    select t.oid from todas t where t.carga and (
         (t.src ~* '\mpublic\.cotizaciones\M' and t.src ~* '\m(valores|fuentes|totales|tipos_cambio)\M')
      or (t.src ~* '\mpublic\.cotizaciones_revisiones\M' and t.src ~* '\mdiff\M')
      or (t.src ~* '\mpublic\.formulas\M' and t.src ~* '\m(definicion|params|diseno|visibilidad)\M')
      or (t.src ~* '\mpublic\.tablas_referencia(_filas)?\M' and t.src ~* '\m(valores|columnas)\M')
      or (t.src ~* '\mpublic\.actividad\M' and t.src ~* '\m(antes|despues)\M')
      or t.src ~* 'select\s+(\w+\.)?\*[^;]{0,60}from\s+public\.(cotizaciones|cotizaciones_revisiones|formulas|tablas_referencia|tablas_referencia_filas)\M'
      or t.src ~* '(to_jsonb|row_to_json)\s*\(\s*\w+\s*\)[^;]{0,80}from\s+public\.(cotizaciones|cotizaciones_revisiones|formulas)\M'
      or t.prorettype in ('public.cotizaciones'::regtype, 'public.cotizaciones_revisiones'::regtype, 'public.formulas'::regtype, 'public.tablas_referencia_filas'::regtype)
         or exists (select 1 from pg_type ty where ty.oid = t.prorettype and ty.typelem <> 0
                      and ty.typelem in ('public.cotizaciones'::regtype, 'public.cotizaciones_revisiones'::regtype, 'public.formulas'::regtype, 'public.tablas_referencia_filas'::regtype)))
  ), cierre as (
    select oid from fuente
    union
    select t.oid from todas t join cierre c on true join todas g on g.oid = c.oid
     where t.carga and t.src ~ ('\m' || g.proname || '\s*\(') and t.oid <> g.oid
  )
  select t.oid, t.proname, t.args, t.retorna, t.ejecutable from todas t where t.oid in (select oid from cierre)
$f$;

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
    'cotizacion_revisiones', jsonb_build_object('clase', 'recorta', 'sonda', 'select public.cotizacion_revisiones({cot})',
      'motivo', 'cada diff recortado por nodo con _nodos_visibles() de SU versión; una revisión de sólo lo oculto viaja con el diff vacío'),
    'cotizacion_leer', jsonb_build_object('clase', 'recorta', 'sonda', 'select public.cotizacion_leer({cot})',
      'motivo', 'el snapshot de una cotización recortado con _nodos_visibles() de SU versión: el total y lo aparte siempre, los subtotales por grupo sólo si se ve el grupo entero')
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
    if (r.ficha ->> 'clase') in ('recorta', 'configurar') and coalesce(btrim(r.ficha ->> 'sonda'), '') = '' then
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
  v_ocultas constant jsonb := '{"cotizaciones": ["valores", "fuentes", "totales", "tipos_cambio"], "cotizaciones_revisiones": ["diff"]}';
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
  v_legible_c constant text := 'id, numero, origen_id, lead_id, vehiculo_id, creado_por, clase, estado, titulo, formula_id, plantilla_id, total_base, moneda_mostrar, modo_tc, notas, version, creado_en, actualizado_en';
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
create temp table cv_inv on commit drop as select * from pg_temp.cv_inventario();
do $$
declare
  v_buenas text[] := array['cv_sonda_directa', 'cv_sonda_revisiones', 'cv_sonda_formula', 'cv_sonda_tabla', 'cv_sonda_actividad', 'cv_sonda_estrella', 'cv_sonda_fila', 'cv_sonda_arreglo', 'cv_sonda_llama'];
  v_malas text[] := array['cv_sonda_comentario', 'cv_sonda_void', 'cv_sonda_inocente'];
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
    if exists (select 1 from pg_temp.cv_inv i where i.nombre = v_n) then raise exception 'el detector encuentra % y no debía (comentario, void o sin tablas)', v_n; end if;
  end loop;
  -- Y las reales: lo que lee el diseño o el snapshot entra; el motor puro y los validadores, que no leen ninguna tabla, no.
  foreach v_n in array array['_cotizacion_armar', '_nodos_visibles', 'cotizacion_evaluar', '_nivel_uso'] loop
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
  -- El valor que se escribió no aparece en ninguna parte de lo que se auditó.
  if exists (select 1 from public.actividad where tabla = 'cotizaciones' and registro_id = v_c::text and (antes::text like '%7777%' or despues::text like '%7777%')) then
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

-- Las que la policy de edición le deja actualizar: un `update … set notas = notas` dentro de una subtransacción que se deshace.
create or replace function pg_temp.cv_edita(p_quien uuid) returns uuid[] language plpgsql as $f$
declare v uuid[];
begin
  perform pg_temp.cv_como(p_quien);
  begin
    set local role authenticated;
    with u as (update public.cotizaciones set notas = notas where id in (select id from cv_c) returning id)
      select coalesce(array_agg(id order by id), '{}') into v from u;
    reset role;
    raise exception 'deshacer' using errcode = 'P0999';
  exception when sqlstate 'P0999' then
    null;
  end;
  reset role;
  return v;
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

-- Lo que puede actualizar: lo que ve, y de eso una preventa con el alcance de cotizaciones.editar o cualquier clase con final.gestionar del origen.
create or replace function pg_temp.cv_regla_edita(p_quien uuid) returns uuid[] language sql as $f$
  select coalesce(array_agg(c.id order by c.id), '{}') from public.cotizaciones c
   where c.id = any (pg_temp.cv_regla(p_quien, 'cotizaciones.ver'))
     and ((c.clase = 'preventa' and c.id = any (pg_temp.cv_regla(p_quien, 'cotizaciones.editar')))
          or exists (select 1 from public.usuarios_roles ur join public.roles_permisos rp on rp.rol_id = ur.rol_id
                      where ur.usuario_id = p_quien and rp.permiso_clave = 'cotizaciones.final.gestionar' and (rp.origen_id is null or rp.origen_id = c.origen_id)))
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

-- Cada persona, lo que ve y lo que edita: tres caminos (policy, puede_cotizacion, regla a mano) y los nombres concretos.
create or replace function pg_temp.cv_verificar(p_quien uuid, p_nombre text, p_ve text[], p_edita text[]) returns void language plpgsql as $f$
declare v_regla uuid[] := pg_temp.cv_regla(p_quien, 'cotizaciones.ver'); v_lee uuid[] := pg_temp.cv_lee(p_quien);
        v_puede uuid[] := pg_temp.cv_puede(p_quien, 'cotizaciones.ver'); v_edita uuid[] := pg_temp.cv_edita(p_quien); v_regla_e uuid[] := pg_temp.cv_regla_edita(p_quien);
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
  if v_edita is distinct from v_regla_e then
    raise exception 'la policy de edición deja a % actualizar algo distinto de la regla: policy %, regla %', p_nombre, pg_temp.cv_nombres(v_edita), pg_temp.cv_nombres(v_regla_e);
  end if;
  if pg_temp.cv_nombres(v_edita) is distinct from (select array_agg(n order by n) from unnest(p_edita) n) and not (cardinality(p_edita) = 0 and cardinality(v_edita) = 0) then
    raise exception '% debía poder editar % y puede %', p_nombre, p_edita, pg_temp.cv_nombres(v_edita);
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
  -- A: las que creó y las de leads de su cartera (también una cuyo lead está en la papelera, como `mis_leads()`); la final es de otra clase y no la edita.
  perform pg_temp.cv_verificar(a, 'A (propios)', array['a_la', 'b_la', 'a_o2', 'b_lead_borrado', 'a_final'], array['a_la', 'b_la', 'a_o2', 'b_lead_borrado']);
  perform pg_temp.cv_verificar(b, 'B (propios)', array['b_la', 'b_lb', 'b_sin_lead', 'b_limbo', 'b_lead_borrado'], array['b_la', 'b_lb', 'b_sin_lead', 'b_limbo', 'b_lead_borrado']);
  perform pg_temp.cv_verificar(t, 'T (todos)', v_todas, array['a_la', 'b_la', 'b_lb', 'b_sin_lead', 'a_o2', 'b_limbo', 'b_lead_borrado', 'x_bloqueada', 'c_o2', 'c_o1', 'r_o1']);
  -- R ve todo y edita sólo lo suyo: ver «todos» no da editar «todos».
  perform pg_temp.cv_verificar(r, 'R (ve todos, edita propios)', v_todas, array['r_o1']);
  -- C: «propios» sólo en el origen 2: lo suyo de ahí, y nada de lo que creó en el 1.
  perform pg_temp.cv_verificar(c, 'C (propios sólo en el origen 2)', array['c_o2'], array['c_o2']);
  perform pg_temp.cv_verificar(l, 'L (logística, sin cotizaciones.ver)', '{}', '{}');
  perform pg_temp.cv_verificar(x, 'X (bloqueada)', '{}', '{}');
  perform pg_temp.cv_verificar(s, 'S (sin leads ni cotizaciones propias)', '{}', '{}');
  -- F: ve todo el origen 1 y cierra finales ahí: edita también la final, y no toca el origen 2.
  perform pg_temp.cv_verificar(f, 'F (ve todo el origen 1 y gestiona finales ahí)', array['a_la', 'b_la', 'b_lb', 'b_sin_lead', 'b_limbo', 'b_lead_borrado', 'x_bloqueada', 'a_final', 'c_o1', 'r_o1'],
                               array['a_la', 'b_la', 'b_lb', 'b_sin_lead', 'b_limbo', 'b_lead_borrado', 'x_bloqueada', 'a_final', 'c_o1', 'r_o1']);
  perform pg_temp.cv_verificar(d, 'la dueña', v_todas, v_todas);

  -- El lead de A pasa a B: la cartera nueva ve sus cotizaciones en el acto (a_la y la final, que no veía); A, que queda como compartida, sigue viéndolas.
  perform pg_temp.cv_como(a);
  set local role authenticated;
  v_r := public.lead_transferir(la, b, a);
  reset role;
  perform pg_temp.cv_verificar(b, 'B (dueña de lo transferido)', array['a_la', 'a_final', 'b_la', 'b_lb', 'b_sin_lead', 'b_limbo', 'b_lead_borrado'], array['a_la', 'b_la', 'b_lb', 'b_sin_lead', 'b_limbo', 'b_lead_borrado']);
  perform pg_temp.cv_verificar(a, 'A (que queda como compartida)', array['a_la', 'b_la', 'a_o2', 'b_lead_borrado', 'a_final'], array['a_la', 'b_la', 'a_o2', 'b_lead_borrado']);
  perform pg_temp.cv_verificar(s, 'S (sin relación con el lead)', '{}', '{}');
  -- B le quita el acceso a A: A pierde lo que sólo veía por el lead (b_la) y conserva lo que creó (a_la, a_final).
  perform pg_temp.cv_como(b);
  set local role authenticated;
  v_r := public.lead_revocar_acceso(la, a);
  reset role;
  perform pg_temp.cv_verificar(a, 'A (sin acceso al lead)', array['a_la', 'a_o2', 'b_lead_borrado', 'a_final'], array['a_la', 'a_o2', 'b_lead_borrado']);
  perform pg_temp.cv_verificar(b, 'B (sigue siendo la dueña)', array['a_la', 'a_final', 'b_la', 'b_lb', 'b_sin_lead', 'b_limbo', 'b_lead_borrado'], array['a_la', 'b_la', 'b_lb', 'b_sin_lead', 'b_limbo', 'b_lead_borrado']);
end $$;

-- La policy y la función ya no arman el arreglo de la cartera, y usan la regla por fila.
do $$
declare v_pol record;
begin
  for v_pol in select policyname, coalesce(qual, '') as qual, coalesce(with_check, '') as con from pg_policies
                where schemaname = 'public' and tablename = 'cotizaciones' and policyname in ('cotizaciones: leer', 'cotizaciones: editar') loop
    if v_pol.qual ~ 'mis_leads' or v_pol.con ~ 'mis_leads' then raise exception '«%» arma el arreglo de toda la cartera (mis_leads)', v_pol.policyname; end if;
    if v_pol.qual !~ 'en_cartera' or v_pol.qual !~ 'origenes_con_alcance' then raise exception '«%» no pregunta por fila con en_cartera y los orígenes con alcance', v_pol.policyname; end if;
    if v_pol.policyname = 'cotizaciones: editar' and (v_pol.con !~ 'en_cartera' or v_pol.con !~ 'final.gestionar') then raise exception 'el WITH CHECK de editar no lleva las dos ramas'; end if;
  end loop;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'cotizaciones' and policyname in ('cotizaciones: leer', 'cotizaciones: editar')) <> 2 then raise exception 'faltan las policies'; end if;
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
  if position('41111' in r::text) > 0 or position('42222' in r::text) > 0 or position('286127' in r::text) > 0 or position('6.96' in r::text) > 0 or position('flete' in r::text) > 0 or position('margen' in r::text) > 0 or position('tc_o' in r::text) > 0 then
    raise exception 'algo del nivel oculto viaja: %', r;
  end if;
  -- 2. Con el nivel: todo, los dos grupos con su Bs y las dos tarifas.
  r := pg_temp.cv_corre(con, format('select public.cotizacion_leer(%L)', c1));
  if r -> 'valores' is distinct from (v_res -> 'valores') - 'interno' or r -> 'fuentes' is distinct from v_res -> 'fuentes' or r -> 'totales' is distinct from v_res -> 'totales' then raise exception 'con el nivel debía ver todo lo que la visibilidad nombra: %', r; end if;
  if r -> 'tipos_cambio' is distinct from '{"oficial": 6.96, "paralelo": 12.4}'::jsonb then raise exception 'con el nivel, las dos tarifas: %', r -> 'tipos_cambio'; end if;
  if position('31313' in r::text) > 0 then raise exception 'un nodo que la visibilidad no nombra le llega a quien no configura: %', r; end if;
  -- 3. Quien configura el origen suma lo que la visibilidad no nombra (sin saltarse los niveles); el permiso de EDITAR el nivel, solo, no da a ver.
  r := pg_temp.cv_corre(cfg, format('select public.cotizacion_leer(%L)', c1));
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'valores') k) is distinct from array['fees', 'garantia', 'interno', 'remate', 'tc_p', 'total'] then raise exception 'quien configura, sin el nivel: %', r -> 'valores'; end if;
  if position('41111' in r::text) > 0 then raise exception 'configurar se salta el nivel: %', r; end if;
  r := pg_temp.cv_corre(todo, format('select public.cotizacion_leer(%L)', c1));
  if r -> 'valores' is distinct from v_res -> 'valores' then raise exception 'quien configura y tiene el nivel lo ve todo: %', r -> 'valores'; end if;
  r := pg_temp.cv_corre(solo_editar, format('select public.cotizacion_leer(%L)', c1));
  if position('41111' in r::text) > 0 or position('flete' in r::text) > 0 then raise exception 'editar el nivel sin verlo deja ver: %', r; end if;
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
  v_vis jsonb; v_def jsonb; v_con_como jsonb; r jsonb; v_quien uuid; v_tipea boolean;
begin
  perform pg_temp.cv_como(duena);
  set local role authenticated;
  perform public.nivel_crear(v_nuevo, 'Gerencia CV');
  reset role;
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
    insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo)
    values (o, duena, (select id from public.formulas where origen_id = o), jsonb_build_object('visible', 111.25, v_oculto, v_centinela::numeric, 'total', 123456.78),
            jsonb_build_object('visible', 'input', v_oculto, 'input'), '{}', '{"bs": 123456.78, "usd": 123456.78, "suma_usd": 123456.78}', 123456.78, 'CV generico ' || v_i) returning id into v_c;
    -- Un cambio del nodo oculto y su vuelta dejan dos revisiones cuyo diff lleva el valor (lo lee cotizacion_revisiones()); la cotización queda como estaba.
    update public.cotizaciones set valores = jsonb_set(valores, array[v_oculto], to_jsonb(v_centinela::numeric + 1)) where id = v_c;
    update public.cotizaciones set valores = jsonb_set(valores, array[v_oculto], to_jsonb(v_centinela::numeric)) where id = v_c;
    -- sin: ve cotizaciones; con: además el nivel; ed: sólo editar el nivel; ajeno: el nivel, pero en otro origen; otro_nivel: el ver de otro nivel; ver_como: el nivel y gestionar roles.
    sin := gen_random_uuid(); con := gen_random_uuid(); ed := gen_random_uuid(); ajeno := gen_random_uuid(); otro_nivel := gen_random_uuid(); ver_como := gen_random_uuid();
    cfg := gen_random_uuid(); cfg_ajeno := gen_random_uuid();
    perform pg_temp.cv_persona(cfg, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o)));
    perform pg_temp.cv_persona(cfg_ajeno, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o2)));
    perform pg_temp.cv_persona(sin, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear')));
    perform pg_temp.cv_persona(con, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.nivel.' || v_nivel || '.ver')));
    perform pg_temp.cv_persona(ed, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.nivel.' || v_nivel || '.editar')));
    perform pg_temp.cv_persona(ajeno, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.nivel.' || v_nivel || '.ver', 'origen', o2)));
    perform pg_temp.cv_persona(otro_nivel, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.nivel.' || v_otro_nivel || '.ver')));
    perform pg_temp.cv_persona(ver_como, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.nivel.' || v_nivel || '.ver'), jsonb_build_object('clave', 'equipo.roles.gestionar')));
    for k in select jsonb_object_keys(v_reg) loop
      v_sql := replace(replace(replace(replace(v_reg -> k ->> 'sonda', '{cot}', quote_literal(v_c)), '{origen}', quote_literal(o)), '{oculto}', quote_literal(v_oculto)), '{centinela}', v_centinela);
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
        r := pg_temp.cv_corre(v_quien, v_sql);
        if r ? 'error' then
          if not v_tipea then raise exception 'nivel %: % falla a «%» sin tipear nada oculto: %', v_nivel, k, v_txt, r; end if;
          if replace(r::text, v_oculto, 'zz_inexistente') is distinct from (pg_temp.cv_corre(v_quien, replace(v_sql, quote_literal(v_oculto), quote_literal('zz_inexistente'))))::text then
            raise exception 'nivel %: % distingue el nodo oculto % de uno que no existe, para «%»: %', v_nivel, k, v_oculto, v_txt, r;
          end if;
        elsif position(v_centinela in r::text) > 0 or (not v_tipea and position(v_oculto in r::text) > 0) or (v_tipea and (r -> 'valores') ? v_oculto) then
          raise exception 'nivel %: % deja ver el nodo %/valor % a «%»: %', v_nivel, k, v_oculto, v_centinela, v_txt, r;
        end if;
      end loop;
      -- Con el permiso, llegan los dos.
      v_txt := (pg_temp.cv_corre(con, v_sql))::text;
      if position(v_oculto in v_txt) = 0 or position(v_centinela in v_txt) = 0 then raise exception 'nivel %: % no le da a quien tiene el permiso el nodo %/valor %: %', v_nivel, k, v_oculto, v_centinela, v_txt; end if;
      -- «Ver como» un rol sin el nivel no cambia lo que decide la base: la interfaz lo estrecha (permisos_efectivos), la base sigue con los permisos reales.
      v_rol_sin := (select ur.rol_id from public.usuarios_roles ur where ur.usuario_id = sin);
      v_con_como := pg_temp.cv_corre(ver_como, format('select jsonb_build_object(''real'', exists (select 1 from public.mis_permisos() m where m.clave = %L), ''como'', exists (select 1 from public.permisos_efectivos(%L) m where m.clave = %L))',
                                                      'cotizaciones.nivel.' || v_nivel || '.ver', v_rol_sin, 'cotizaciones.nivel.' || v_nivel || '.ver'));
      if v_con_como is distinct from '{"real": true, "como": false}'::jsonb then raise exception 'nivel %: «ver como» no estrecha lo que la interfaz ve (o la prueba no lo ve): %', v_nivel, v_con_como; end if;
      v_txt := (pg_temp.cv_corre(ver_como, v_sql))::text;
      if position(v_oculto in v_txt) = 0 or position(v_centinela in v_txt) = 0 then raise exception 'nivel %: con «ver como» % cambia lo que decide la base: %', v_nivel, k, v_txt; end if;
    end loop;
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
  if position('88888' in r::text) > 0 or position('costo' in r::text) > 0 then raise exception 'B ve el costo sin el nivel: %', r; end if;
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
  -- 5. Con crear y sin ver: sólo el total y lo aparte, y no puede tipear nada.
  r := pg_temp.cv_corre(solo_crear, format('select public.cotizacion_evaluar(%L, null, %L)', '{}', o));
  if r ? 'error' or (select array_agg(k order by k) from jsonb_object_keys(r -> 'valores') k) is distinct from array['garantia', 'total'] then raise exception 'crear sin ver: %', r -> 'valores'; end if;
  r := pg_temp.cv_corre(solo_crear, format('select public.cotizacion_evaluar(%L, null, %L)', '{"inputs": {"remate": 1}}', o));
  if r ->> 'error' is null then raise exception 'crear sin ver tipea un input'; end if;
  -- 6. Sin cotizaciones.crear del origen no evalúa por origen; sin ver la cotización, no evalúa por ella.
  if (pg_temp.cv_corre(sin_crear, format('select public.cotizacion_evaluar(%L, null, %L)', '{}', o))) ->> 'error' is distinct from '42501' then raise exception 'sin crear evalúa por origen'; end if;
  -- 7. Los grants: authenticated sí, anon y PUBLIC no; el armado, de nadie.
  if has_function_privilege('anon', 'public.cotizacion_evaluar(jsonb,uuid,uuid,uuid,jsonb)', 'execute') or not has_function_privilege('authenticated', 'public.cotizacion_evaluar(jsonb,uuid,uuid,uuid,jsonb)', 'execute')
     or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x where p.oid = 'public.cotizacion_evaluar(jsonb,uuid,uuid,uuid,jsonb)'::regprocedure and x.grantee = 0) then
    raise exception 'los grants de cotizacion_evaluar';
  end if;
  if has_function_privilege('anon', 'public._cotizacion_armar(jsonb,uuid,uuid,uuid)', 'execute') or has_function_privilege('authenticated', 'public._cotizacion_armar(jsonb,uuid,uuid,uuid)', 'execute')
     or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x where p.oid = 'public._cotizacion_armar(jsonb,uuid,uuid,uuid)'::regprocedure and x.grantee = 0) then
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
  if r -> 'revisiones' -> 3 -> 'diff' is distinct from jsonb_build_object('valores', jsonb_build_object('de', v1 - 'tc_o' - 'flete' - 'margen', 'a', v2 - 'tc_o' - 'flete' - 'margen')) then raise exception 'el dato visible, sin los costos: %', r -> 'revisiones' -> 3 -> 'diff'; end if;
  if r -> 'revisiones' -> 4 -> 'diff' <> '{}'::jsonb then raise exception 'cambió sólo un costo: %', r -> 'revisiones' -> 4 -> 'diff'; end if;
  if r -> 'revisiones' -> 5 -> 'diff' is distinct from '{"notas": {"de": null, "a": "uno"}}'::jsonb then raise exception 'la nota: %', r -> 'revisiones' -> 5 -> 'diff'; end if;
  if position('50123' in r::text) > 0 or position('60123' in r::text) > 0 or position('77123' in r::text) > 0 or position('7.75' in r::text) > 0 or position('41111' in r::text) > 0 or position('flete' in r::text) > 0 or position('tc_o' in r::text) > 0 then
    raise exception 'algo oculto viaja por las revisiones: %', r;
  end if;
  -- 2. Con el nivel: los diffs enteros.
  r2 := pg_temp.cv_corre(con, format('select public.cotizacion_revisiones(%L)', c));
  if r2 -> 'revisiones' -> 4 -> 'diff' is distinct from jsonb_build_object('valores', jsonb_build_object('de', v0, 'a', v1)) then raise exception 'con el nivel, el costo: %', r2 -> 'revisiones' -> 4 -> 'diff'; end if;
  if r2 -> 'revisiones' -> 3 -> 'diff' is distinct from jsonb_build_object('valores', jsonb_build_object('de', v1, 'a', v2)) then raise exception 'con el nivel, el dato y el costo: %', r2 -> 'revisiones' -> 3 -> 'diff'; end if;
  if r2 -> 'revisiones' -> 2 -> 'diff' is distinct from jsonb_build_object('totales', jsonb_build_object('de', t0, 'a', jsonb_set(t0, '{grupos,g2,usd}', '77123.5'))) then
    raise exception 'con el nivel, el subtotal del grupo: %', r2 -> 'revisiones' -> 2 -> 'diff';
  end if;
  if r2 -> 'revisiones' -> 1 -> 'diff' is distinct from '{"tipos_cambio": {"de": {"oficial": 6.96, "paralelo": 12.4}, "a": {"oficial": 7.75, "paralelo": 12.4}}}'::jsonb then raise exception 'con el nivel, la tarifa: %', r2 -> 'revisiones' -> 1 -> 'diff'; end if;
  -- 2b. Una versión nueva de la fórmula (que muestra el flete a todos) no cambia lo que se ve de las revisiones de una cotización de la v1: se leen con SU visibilidad.
  update public.formulas set estado = 'archivada' where id = f1;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 2, 'publicada', v_def, '{}', '{}', jsonb_set(jsonb_set(v_vis, '{flete}', '{"ver": "todos", "editar": "todos"}'), '{tc_o}', '{"ver": "todos", "editar": "todos"}'));
  r := pg_temp.cv_corre(sin, format('select public.cotizacion_revisiones(%L)', c));
  if position('50123' in r::text) > 0 or position('60123' in r::text) > 0 or position('7.75' in r::text) > 0 or position('flete' in r::text) > 0 then raise exception 'una versión nueva cambia lo que se ve de una cotización de la anterior: %', r; end if;
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
