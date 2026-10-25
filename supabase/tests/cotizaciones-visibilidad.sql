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
--   recorta       devuelve contenido de cotizaciones recortado por `_nodos_visibles()` (tiene sonda por nivel)
--   configurar    sólo la ejecuta quien tiene `cotizaciones.configurar` del origen (tiene sonda de 42501)
--   no_devuelve   lee esas tablas pero lo que devuelve no es contenido: conteos, ids, nombres o textos de motivo
create or replace function pg_temp.cv_registro() returns jsonb language sql as $f$
  select jsonb_build_object(
    'nivel_crear', jsonb_build_object('clase', 'no_devuelve', 'motivo', 'devuelve la lista de niveles con el uso de cada uno: conteos y el texto del motivo; _nivel_uso() lee formulas.diseno y sólo cuenta'),
    'nivel_renombrar', jsonb_build_object('clase', 'no_devuelve', 'motivo', 'devuelve la lista de niveles con el uso de cada uno: conteos y el texto del motivo'),
    'nivel_retirar', jsonb_build_object('clase', 'no_devuelve', 'motivo', 'devuelve la lista de niveles con el uso de cada uno: conteos y el texto del motivo'),
    'nivel_restaurar', jsonb_build_object('clase', 'no_devuelve', 'motivo', 'devuelve la lista de niveles con el uso de cada uno: conteos y el texto del motivo'),
    'nivel_eliminar', jsonb_build_object('clase', 'no_devuelve', 'motivo', 'devuelve la lista de niveles con el uso de cada uno: conteos y el texto del motivo'),
    'niveles_con_uso', jsonb_build_object('clase', 'no_devuelve', 'motivo', 'la lista de niveles con las banderas de lo que admiten y el texto del motivo de uso: conteos de celdas, secciones y orígenes'),
    'tono_eliminar', jsonb_build_object('clase', 'no_devuelve', 'motivo', 'devuelve la lista de tonos; _tono_en_uso() lee formulas.definicion y sólo dice el nombre de un origen')
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
