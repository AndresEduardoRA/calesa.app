-- Importar todo (9.06): `importacion_crear()` es el enforcement de `datos.importar.todo` (importar para otra persona) y de `leads.crear` /
-- `vehiculos.crear` (importar para sí misma); `importaciones_filas` se lee con la regla de `importaciones`; las de `service_role` no las ejecuta
-- `authenticated`. Aquí viven los cinco casos del Assert de la fila; el resto de los lotes, en `importar-lotes.sql`. Corre en PGlite
-- (`pnpm db:probar`); cada bloque arma su terreno y lo revierte.

-- @test importar: los ayudantes
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

-- @test importar: sin datos.importar.todo, crear para otra persona da 42501; con él, el destino tiene que estar activo y poder crear leads
begin;
select pg_temp.imp_preparar();
do $$
declare ada uuid := '00000000-0000-4000-8000-00000000906a'; bea uuid := '00000000-0000-4000-8000-00000000906b';
        ceci uuid := '00000000-0000-4000-8000-00000000906c'; dani uuid := '00000000-0000-4000-8000-00000000906d';
        r text; v public.importaciones;
begin
  -- Ceci (leads.crear, sin datos.importar.todo) para Bea: 42501.
  r := pg_temp.imp_crear(ceci, gen_random_uuid(), 'leads', bea);
  if r <> '42501' then raise exception 'sin datos.importar.todo, crear para otra persona debía dar 42501: %', r; end if;
  -- Ada para Bea: pendiente, con destino.
  r := pg_temp.imp_crear(ada, '00000000-0000-4000-8000-0000009060a1', 'leads', bea);
  if r::jsonb <> '{"id": "00000000-0000-4000-8000-0000009060a1", "estado": "pendiente", "repetido": false}'::jsonb then
    raise exception 'Ada para Bea debía crear en pendiente: %', r;
  end if;
  select * into v from public.importaciones where id = '00000000-0000-4000-8000-0000009060a1';
  if v.usuario_id <> ada or v.asignar_a is distinct from bea or not v.con_destino or v.procesadas <> 0 or v.origen_id is not null then
    raise exception 'la importación para Bea quedó mal: % % % %', v.usuario_id, v.asignar_a, v.con_destino, v.procesadas;
  end if;
  -- Ada para sí misma (con su propio id como destino): sin destino.
  r := pg_temp.imp_crear(ada, '00000000-0000-4000-8000-0000009060a2', 'leads', ada);
  select * into v from public.importaciones where id = '00000000-0000-4000-8000-0000009060a2';
  if (r::jsonb ->> 'estado') <> 'pendiente' or v.asignar_a is not null or v.con_destino then
    raise exception 'Ada para sí misma no lleva destino: % %', r, v.asignar_a;
  end if;
  -- Destinos que no pueden recibir: sin leads.crear (Dani), bloqueada, dada de baja (activo = false).
  r := pg_temp.imp_crear(ada, gen_random_uuid(), 'leads', dani);
  if r <> '22023/asignar_a' then raise exception 'un destino sin leads.crear debía dar 22023/asignar_a: %', r; end if;
  update public.perfiles set bloqueado = true where id = bea;
  r := pg_temp.imp_crear(ada, gen_random_uuid(), 'leads', bea);
  if r <> '22023/asignar_a' then raise exception 'un destino bloqueado debía dar 22023/asignar_a: %', r; end if;
  update public.perfiles set bloqueado = false, activo = false, baja_en = now(), baja_por = ada where id = bea;
  r := pg_temp.imp_crear(ada, gen_random_uuid(), 'leads', bea);
  if r <> '22023/asignar_a' then raise exception 'un destino dado de baja debía dar 22023/asignar_a: %', r; end if;
  -- Para sí misma sin leads.crear (Dani): 42501.
  r := pg_temp.imp_crear(dani, gen_random_uuid(), 'leads');
  if r <> '42501' then raise exception 'sin leads.crear, importar para sí misma debía dar 42501: %', r; end if;
  -- Quien llama, bloqueada: 42501 antes de todo.
  update public.perfiles set bloqueado = true where id = ceci;
  r := pg_temp.imp_crear(ceci, gen_random_uuid(), 'leads');
  if r <> '42501' then raise exception 'quien llama bloqueada debía dar 42501: %', r; end if;
end $$;
rollback;

-- @test importar: la ruta va en la carpeta propia; entidad, origen y mapeo se validan con su hint; vehículos piden vehiculos.crear del origen
begin;
select pg_temp.imp_preparar();
do $$
declare ada uuid := '00000000-0000-4000-8000-00000000906a'; bea uuid := '00000000-0000-4000-8000-00000000906b';
        ceci uuid := '00000000-0000-4000-8000-00000000906c';
        v_origen uuid := (select id from public.origenes where activo order by id limit 1); v_inactivo uuid; r text; v public.importaciones;
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

-- @test importar: el mismo id es idempotente; el id de otra persona o de una importación de /leads da 42501 sin decir que existe
begin;
select pg_temp.imp_preparar();
do $$
declare ada uuid := '00000000-0000-4000-8000-00000000906a'; ceci uuid := '00000000-0000-4000-8000-00000000906c';
        v_id uuid := '00000000-0000-4000-8000-0000009060c1'; r text;
begin
  r := pg_temp.imp_crear(ada, v_id, 'leads');
  r := pg_temp.imp_crear(ada, v_id, 'leads');
  if r::jsonb <> jsonb_build_object('id', v_id, 'estado', 'pendiente', 'repetido', true) then raise exception 'el reintento debía ser repetido: %', r; end if;
  if (select count(*) from public.importaciones where id = v_id) <> 1 then raise exception 'el reintento duplicó la importación'; end if;
  r := pg_temp.imp_crear(ceci, v_id, 'leads');
  if r <> '42501' then raise exception 'el id de Ada llamado por Ceci debía dar 42501: %', r; end if;
  -- Una importación propia de /leads (sin archivo) no cuenta como propia.
  insert into public.importaciones (id, usuario_id, entidad, estado, filas_total) values ('00000000-0000-4000-8000-0000009060c2', ada, 'leads', 'procesando', 3);
  r := pg_temp.imp_crear(ada, '00000000-0000-4000-8000-0000009060c2', 'leads');
  if r <> '42501' then raise exception 'el id de una importación de /leads debía dar 42501: %', r; end if;
end $$;
rollback;

-- @test importar: las de service_role no las ejecuta authenticated ni anon; los ayudantes, sólo el dueño; todas definer con search_path vacío
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
    elsif v_nombre <> 'importacion_crear' then
      if has_function_privilege('authenticated', v_f, 'execute') then raise exception 'authenticated ejecuta %', v_nombre; end if;
      if not has_function_privilege('service_role', v_f, 'execute') then raise exception 'service_role no ejecuta %', v_nombre; end if;
    end if;
  end loop;
  r := pg_temp.imp_como(ada, 'select to_jsonb(1) from public.importacion_crear(null, null, null, null)');
  if r <> '22023' then raise exception 'importacion_crear sin id debía dar 22023: %', r; end if;
end $$;
rollback;

-- @test importar: importaciones_filas se lee con la regla de importaciones (propia o datos.importar.todo) y no se escribe desde la app
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
