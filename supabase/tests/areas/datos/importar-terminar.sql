-- Importar todo (9.06): empezar y terminar la importación total (el total, retomar, la constancia y una de `/leads` que no se procesa aquí).
-- Salió de `importar-lotes.sql` en el 9.06-2 sin cambiar la prueba. Corre en PGlite (`pnpm db:probar`); cada bloque arma su terreno y lo revierte.

-- @test importar-terminar: los ayudantes (los mismos de importar.sql: cada archivo corre solo)
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

-- @test importar-terminar: empezar fija el total (1 a 20.000) y retoma; terminar exige todo procesado, deja la constancia sin datos y es idempotente
begin;
select pg_temp.imp_preparar();
do $$
declare ada uuid := '00000000-0000-4000-8000-00000000906a'; bea uuid := '00000000-0000-4000-8000-00000000906b';
        v_1 uuid := '00000000-0000-4000-8000-0000009061f1'; v_2 uuid := '00000000-0000-4000-8000-0000009061f2'; r text; v_det jsonb;
begin
  perform pg_temp.imp_crear(ada, v_1, 'leads', bea);
  perform pg_temp.imp_crear(ada, v_2, 'leads', bea);
  r := pg_temp.imp_srv(format('select public.importacion_empezar(%L, 20001)', v_1));
  if r <> '22023/filas_total' then raise exception 'más de 20.000 filas: %', r; end if;
  r := pg_temp.imp_srv(format('select public.importacion_empezar(%L, 0)', v_1));
  if r <> '22023/filas_total' then raise exception 'cero filas: %', r; end if;
  r := pg_temp.imp_srv(format('select public.importacion_terminar(%L)', v_1));
  if r <> '22023' then raise exception 'terminar sin empezar: %', r; end if;
  r := pg_temp.imp_srv(format('select public.importacion_empezar(%L, 2)', v_1));
  if r::jsonb <> jsonb_build_object('importacion', v_1, 'estado', 'procesando', 'filas_total', 2, 'procesadas', 0, 'repetido', false) then raise exception 'empezar: %', r; end if;
  r := pg_temp.imp_srv(format('select public.importacion_empezar(%L, 2)', v_1));
  if (r::jsonb ->> 'repetido') <> 'true' then raise exception 'empezar otra vez retoma: %', r; end if;
  r := pg_temp.imp_srv(format('select public.importacion_empezar(%L, 3)', v_1));
  if r <> '22023/filas_total' then raise exception 'otro total en procesando: %', r; end if;
  r := pg_temp.imp_lote(v_1, 1, jsonb_build_array(pg_temp.imp_fila(1, 'IMP T uno', '79067001')));
  r := pg_temp.imp_srv(format('select public.importacion_terminar(%L)', v_1));
  if r <> '22023' then raise exception 'terminar con filas por procesar: %', r; end if;
  r := pg_temp.imp_lote(v_1, 2, jsonb_build_array(jsonb_build_object('fila', 2, 'rechazo', jsonb_build_object('motivo', 'Falta el nombre.'))));
  r := pg_temp.imp_srv(format('select public.importacion_terminar(%L)', v_1));
  if r::jsonb <> jsonb_build_object('importacion', v_1, 'estado', 'terminada', 'creadas', 1, 'ya_existian', 0, 'rechazadas', 1, 'repetido', false) then
    raise exception 'terminar: %', r;
  end if;
  select detalle into v_det from public.actividad where accion = 'datos.importado' and registro_id = v_1::text and actor_id = ada and tabla = 'importaciones';
  if v_det <> jsonb_build_object('entidad', 'leads', 'estado', 'terminada', 'filas', 2, 'procesadas', 2, 'creadas', 1, 'ya_existian', 0, 'rechazadas', 1,
                                 'asignar_a', bea) then
    raise exception 'la constancia trae de más o de menos: %', v_det;
  end if;
  r := pg_temp.imp_srv(format('select public.importacion_terminar(%L)', v_1));
  if r::jsonb <> jsonb_build_object('importacion', v_1, 'estado', 'terminada', 'repetido', true) then raise exception 'terminar otra vez: %', r; end if;
  -- Con error, desde pendiente: fallida con su motivo; un motivo vacío, 22023/error.
  r := pg_temp.imp_srv(format('select public.importacion_terminar(%L, %L)', v_2, '  '));
  if r <> '22023/error' then raise exception 'un motivo vacío: %', r; end if;
  r := pg_temp.imp_srv(format('select public.importacion_terminar(%L, %L)', v_2, 'El archivo no se puede leer.'));
  if (r::jsonb ->> 'estado') <> 'fallida' or (select errores from public.importaciones where id = v_2) <> '[{"motivo": "El archivo no se puede leer."}]'::jsonb then
    raise exception 'terminar con error: %', r;
  end if;
  -- Una importación de /leads no se toca por aquí.
  insert into public.importaciones (id, usuario_id, entidad, estado, filas_total) values ('00000000-0000-4000-8000-0000009061f3', ada, 'leads', 'procesando', 1);
  foreach r in array array[pg_temp.imp_srv('select public.importacion_empezar(''00000000-0000-4000-8000-0000009061f3'', 1)'),
                           pg_temp.imp_lote('00000000-0000-4000-8000-0000009061f3', 1, jsonb_build_array(pg_temp.imp_fila(1, 'x', '79067009'))),
                           pg_temp.imp_srv('select public.importacion_terminar(''00000000-0000-4000-8000-0000009061f3'')')] loop
    if r <> '22023' then raise exception 'una importación de /leads no se procesa aquí: %', r; end if;
  end loop;
end $$;
rollback;
