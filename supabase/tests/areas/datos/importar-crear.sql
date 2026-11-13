-- Importar todo (9.06): ruta, entidad y origen de `importacion_crear()`; los privilegios de las funciones de la importación total y la RLS de
-- `importaciones_filas` (se lee con la regla de `importaciones`). Salió de `importar.sql` en el 9.06-2 sin cambiar ninguna prueba. Corre en PGlite
-- (`pnpm db:probar`); cada bloque arma su terreno y lo revierte.

-- @test importar-crear: los ayudantes (los mismos de importar.sql: cada archivo corre solo)
reset role;
-- Ada (…a): datos.importar.todo, leads.crear y vehiculos.crear de todos los orígenes. Bea (…b) y Ceci (…c): leads.crear. Dani (…d): leads.ver
-- y nada más. La primera cuenta nace dueña: se le quitan sus roles.
create or replace function pg_temp.imp_preparar() returns void language plpgsql as $f$
declare p uuid; v_rol uuid; i int := 0;
begin
  foreach p in array array['00000000-0000-4000-8000-00000000906a', '00000000-0000-4000-8000-00000000906b',
                           '00000000-0000-4000-8000-00000000906c', '00000000-0000-4000-8000-00000000906d']::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'IMP ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('imp_rol_' || i, 'IMP rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    if i = 1 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values
        (v_rol, 'datos.importar.todo', null, 'todos'), (v_rol, 'leads.crear', null, 'todos'), (v_rol, 'leads.ver', null, 'todos'),
        (v_rol, 'vehiculos.crear', null, 'todos'), (v_rol, 'vehiculos.ver', null, 'todos');
    elsif i in (2, 3) then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values
        (v_rol, 'leads.crear', null, 'todos'), (v_rol, 'leads.ver', null, 'propios');
    else
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'leads.ver', null, 'propios');
    end if;
  end loop;
end $f$;

-- Pone la identidad de esa persona, local a la transacción (las RPC de service_role las llama el dueño de las funciones).
create or replace function pg_temp.imp_ser(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_quien::text, ''), true);
  perform set_config('request.jwt.claim.role', case when p_quien is null then 'service_role' else 'authenticated' end, true);
  perform set_config('request.jwt.claims', case when p_quien is null then '{"role": "service_role"}'
                                                else json_build_object('sub', p_quien, 'role', 'authenticated')::text end, true);
end $f$;

-- Lo que devuelve un SQL corrido como esa persona (una fila jsonb), o «sqlstate» / «sqlstate/hint».
create or replace function pg_temp.imp_como(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v jsonb; v_hint text;
begin
  perform pg_temp.imp_ser(p_quien);
  set local role authenticated;
  execute p_sql into v;
  reset role;
  return v::text;
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  reset role;
  return sqlstate || coalesce('/' || nullif(v_hint, ''), '');
end $f$;

-- Crear como esa persona: la respuesta, o el error. La ruta por omisión, en su carpeta.
create or replace function pg_temp.imp_crear(p_quien uuid, p_id uuid, p_entidad text, p_asignar uuid default null, p_origen uuid default null,
  p_ruta text default null, p_mapeo jsonb default '{"Nombre": "nombre", "Teléfono": "telefono_principal"}') returns text language sql as $f$
  select pg_temp.imp_como(p_quien, format('select public.importacion_crear(%L, %L, %L, %L, %L, %L)', p_id, p_entidad,
    coalesce(p_ruta, p_quien::text || '/' || p_id::text || '.csv'), p_mapeo, p_asignar, p_origen))
$f$;

-- Llamar como service_role (el dueño de las funciones con los claims de service_role): la respuesta, o «sqlstate» / «sqlstate/hint».
create or replace function pg_temp.imp_srv(p_sql text) returns text language plpgsql as $f$
declare v jsonb; v_hint text;
begin
  perform pg_temp.imp_ser(null);
  execute p_sql into v;
  return v::text;
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  return sqlstate || coalesce('/' || nullif(v_hint, ''), '');
end $f$;

create or replace function pg_temp.imp_lote(p_imp uuid, p_desde int, p_filas jsonb) returns text language sql as $f$
  select pg_temp.imp_srv(format('select public.importacion_procesar_lote(%L, %L, %L)', p_imp, p_desde, p_filas))
$f$;

-- Una importación de Ada (para p_destino, o de vehículos con p_origen) ya empezada con p_total filas.
create or replace function pg_temp.imp_empezada(p_id uuid, p_destino uuid, p_total int, p_entidad text default 'leads', p_origen uuid default null)
  returns void language plpgsql as $f$
declare r text;
begin
  r := pg_temp.imp_crear('00000000-0000-4000-8000-00000000906a', p_id, p_entidad, p_destino, p_origen);
  if (r::jsonb ->> 'estado') is distinct from 'pendiente' then raise exception 'no se creó: %', r; end if;
  r := pg_temp.imp_srv(format('select public.importacion_empezar(%L, %L)', p_id, p_total));
  if (r::jsonb ->> 'estado') is distinct from 'procesando' then raise exception 'no empezó: %', r; end if;
end $f$;

-- Una fila de un lote de leads.
create or replace function pg_temp.imp_fila(p_fila int, p_nombre text, p_tel text) returns jsonb language sql as $f$
  select jsonb_build_object('fila', p_fila, 'datos', jsonb_build_object('nombre', p_nombre, 'telefono_principal', p_tel,
    'origen_lead_id', (select id from public.origenes_lead where clave = 'web')))
$f$;

-- Quitarle un permiso a esa persona (en su rol).
create or replace function pg_temp.imp_quitar(p_quien uuid, p_clave text) returns void language sql as $f$
  delete from public.roles_permisos rp using public.usuarios_roles ur where ur.usuario_id = p_quien and rp.rol_id = ur.rol_id and rp.permiso_clave = p_clave
$f$;

-- @test importar-crear: la ruta va en la carpeta propia; entidad, origen y mapeo se validan con su hint; vehículos piden vehiculos.crear del origen
begin;
select pg_temp.imp_preparar();
do $$
declare ada uuid := '00000000-0000-4000-8000-00000000906a'; bea uuid := '00000000-0000-4000-8000-00000000906b';
        ceci uuid := '00000000-0000-4000-8000-00000000906c';
        -- Un origen de la base, siempre el mismo (por id, uuid al azar, podía tocar uno que dejó otro archivo de db:probar).
        v_origen uuid := (select id from public.origenes where activo order by creado_en, clave limit 1); v_inactivo uuid; r text; v public.importaciones;
begin
  insert into public.origenes (clave, nombre, tipo, activo) values ('imp_inactivo', 'IMP inactivo', 'manual', false) returning id into v_inactivo;
  foreach r in array array[
    pg_temp.imp_crear(ada, gen_random_uuid(), 'leads', p_ruta => bea::text || '/x.csv'),
    pg_temp.imp_crear(ada, gen_random_uuid(), 'leads', p_ruta => ada::text || '/../x.csv'),
    pg_temp.imp_crear(ada, gen_random_uuid(), 'leads', p_ruta => ada::text || '//x.csv'),
    pg_temp.imp_crear(ada, gen_random_uuid(), 'leads', p_ruta => ada::text || '/x.xlsx'),
    pg_temp.imp_crear(ada, gen_random_uuid(), 'leads', p_ruta => '')] loop
    if r <> '22023/archivo_ruta' then raise exception 'una ruta fuera de la carpeta o sin .csv debía dar 22023/archivo_ruta: %', r; end if;
  end loop;
  r := pg_temp.imp_crear(ada, gen_random_uuid(), 'leads', p_ruta => ada::text || '/Archivo.CSV');
  if (r::jsonb ->> 'estado') is distinct from 'pendiente' then raise exception '.CSV en mayúsculas vale: %', r; end if;
  foreach r in array array[pg_temp.imp_crear(ada, gen_random_uuid(), 'seguimientos'), pg_temp.imp_crear(ada, gen_random_uuid(), 'cotizaciones')] loop
    if r <> '22023/entidad' then raise exception 'sólo leads y vehículos: %', r; end if;
  end loop;
  foreach r in array array[pg_temp.imp_crear(ada, gen_random_uuid(), 'leads', p_mapeo => '{}'),
                           pg_temp.imp_crear(ada, gen_random_uuid(), 'leads', p_mapeo => '[]'),
                           pg_temp.imp_crear(ada, gen_random_uuid(), 'leads', p_mapeo => '{"a": 1}')] loop
    if r <> '22023/mapeo' then raise exception 'un mapeo vacío o sin texto debía dar 22023/mapeo: %', r; end if;
  end loop;
  r := pg_temp.imp_crear(ada, gen_random_uuid(), 'leads', p_origen => v_origen);
  if r <> '22023/origen' then raise exception 'leads no lleva origen: %', r; end if;
  -- Vehículos: sin origen, con uno inactivo o con destino, 22023; sin vehiculos.crear en ese origen, 42501.
  foreach r in array array[pg_temp.imp_crear(ada, gen_random_uuid(), 'vehiculos'),
                           pg_temp.imp_crear(ada, gen_random_uuid(), 'vehiculos', p_origen => v_inactivo)] loop
    if r <> '22023/origen' then raise exception 'vehículos pide un origen activo: %', r; end if;
  end loop;
  r := pg_temp.imp_crear(ada, gen_random_uuid(), 'vehiculos', bea, v_origen);
  if r <> '22023/asignar_a' then raise exception 'vehículos no se asigna: %', r; end if;
  r := pg_temp.imp_crear(ceci, gen_random_uuid(), 'vehiculos', p_origen => v_origen);
  if r <> '42501' then raise exception 'sin vehiculos.crear del origen debía dar 42501: %', r; end if;
  r := pg_temp.imp_crear(ada, '00000000-0000-4000-8000-0000009060b1', 'vehiculos', p_origen => v_origen);
  select * into v from public.importaciones where id = '00000000-0000-4000-8000-0000009060b1';
  if (r::jsonb ->> 'estado') <> 'pendiente' or v.origen_id <> v_origen or v.asignar_a is not null then
    raise exception 'vehículos de Ada debía crear con su origen: %', r;
  end if;
end $$;
rollback;


-- @test importar-crear: las de service_role no las ejecuta authenticated ni anon; los ayudantes, sólo el dueño; todas definer con search_path vacío
begin;
select pg_temp.imp_preparar();
do $$
declare v_f regprocedure; v_nombre text; v_def boolean; v_conf text[]; r text; ada uuid := '00000000-0000-4000-8000-00000000906a';
begin
  v_f := 'public.importacion_crear(uuid, text, text, jsonb, uuid, uuid)'::regprocedure;
  if has_function_privilege('anon', v_f, 'execute') then raise exception 'anon ejecuta importacion_crear'; end if;
  if not has_function_privilege('authenticated', v_f, 'execute') then raise exception 'authenticated no ejecuta importacion_crear'; end if;
  for v_f, v_nombre, v_def, v_conf in
    select p.oid::regprocedure, p.proname::text, p.prosecdef, coalesce(p.proconfig, '{}')
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and (p.proname like 'importacion\_%' or p.proname like '\_importacion\_%')
       and p.proname <> '_importacion_vence_en' loop  -- la de /leads (24 h para deshacer), de antes
    if v_nombre like 'importacion\_%' and not v_def then raise exception '% no es definer', v_nombre; end if;
    if v_def and not ('search_path=""' = any (v_conf)) then raise exception '% sin search_path vacío', v_nombre; end if;
    if has_function_privilege('anon', v_f, 'execute') then raise exception 'anon ejecuta %', v_nombre; end if;
    if v_nombre like '\_importacion\_%' then
      if has_function_privilege('authenticated', v_f, 'execute') or has_function_privilege('service_role', v_f, 'execute') then
        raise exception 'el ayudante % lo ejecuta alguien más que su dueño', v_nombre;
      end if;
    elsif v_nombre not in ('importacion_crear', 'importacion_pase_emitir') then  -- las dos que llama la app (9.06-2: el pase)
      if has_function_privilege('authenticated', v_f, 'execute') then raise exception 'authenticated ejecuta %', v_nombre; end if;
      if not has_function_privilege('service_role', v_f, 'execute') then raise exception 'service_role no ejecuta %', v_nombre; end if;
    end if;
  end loop;
  r := pg_temp.imp_como(ada, 'select to_jsonb(1) from public.importacion_crear(null, null, null, null)');
  if r <> '22023' then raise exception 'importacion_crear sin id debía dar 22023: %', r; end if;
end $$;
rollback;


-- @test importar-crear: importaciones_filas se lee con la regla de importaciones (propia o datos.importar.todo) y no se escribe desde la app
begin;
select pg_temp.imp_preparar();
do $$
declare ada uuid := '00000000-0000-4000-8000-00000000906a'; ceci uuid := '00000000-0000-4000-8000-00000000906c';
        v_id uuid := '00000000-0000-4000-8000-0000009060d1'; r text;
begin
  r := pg_temp.imp_crear(ada, v_id, 'leads');
  insert into public.importaciones_filas (importacion_id, fila, resultado, campo, motivo) values (v_id, 1, 'error', 'nombre', 'Falta el nombre.');
  r := pg_temp.imp_como(ada, 'select to_jsonb(count(*)) from public.importaciones_filas');
  if r <> '1' then raise exception 'Ada debía ver la fila de su importación: %', r; end if;
  r := pg_temp.imp_como(ceci, 'select to_jsonb(count(*)) from public.importaciones_filas');
  if r <> '0' then raise exception 'Ceci no debía ver las filas de Ada: %', r; end if;
  r := pg_temp.imp_como(ceci, format($s$with x as (insert into public.importaciones_filas (importacion_id, fila, resultado) values (%L, 2, 'error') returning 1) select to_jsonb(count(*)) from x$s$, v_id));
  if r <> '42501' then raise exception 'authenticated no escribe importaciones_filas: %', r; end if;
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    select ur.rol_id, 'datos.importar.todo', null, 'todos' from public.usuarios_roles ur where ur.usuario_id = ceci;
  r := pg_temp.imp_como(ceci, 'select to_jsonb(count(*)) from public.importaciones_filas');
  if r <> '1' then raise exception 'Ceci con datos.importar.todo debía ver la fila: %', r; end if;
  if (select aplicado_en from public.permisos where clave = 'datos.importar.todo') not like 'importacion_crear%' then
    raise exception 'datos.importar.todo no nombra su enforcement (seed y migración de acuerdo)';
  end if;
end $$;
rollback;
