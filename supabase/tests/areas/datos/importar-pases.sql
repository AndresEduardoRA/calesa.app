-- Importar todo (9.06-2): los pases de la importación total. `importacion_pase_emitir` (authenticated) sólo para la total propia, nunca la
-- ajena aunque quien llama tenga `datos.importar.todo`, y reusa el pase vivo; `importacion_abrir` (service_role) lo canjea una sola vez y
-- dentro de 10 minutos; `importaciones_pases` no la lee la app. Corre en PGlite (`pnpm db:probar`); cada bloque arma su terreno y lo revierte.

-- @test importar-pases: los ayudantes (los mismos de importar.sql: cada archivo corre solo)
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


-- Pedir un pase como esa persona: el uuid entre comillas, o el error.
create or replace function pg_temp.imp_pase(p_quien uuid, p_imp uuid) returns text language sql as $f$
  select pg_temp.imp_como(p_quien, format('select to_jsonb(public.importacion_pase_emitir(%L))', p_imp))
$f$;

-- @test importar-pases: emitir sólo para la total propia y viva; la ajena da 42501 aunque quien pide tenga datos.importar.todo; el pase vivo se reusa
begin;
select pg_temp.imp_preparar();
do $$
declare ada uuid := '00000000-0000-4000-8000-00000000906a'; bea uuid := '00000000-0000-4000-8000-00000000906b';
        ceci uuid := '00000000-0000-4000-8000-00000000906c';
        v_1 uuid := '00000000-0000-4000-8000-0000009062a1'; v_b uuid := '00000000-0000-4000-8000-0000009062a2';
        v_t uuid := '00000000-0000-4000-8000-0000009062a3'; v_l uuid := '00000000-0000-4000-8000-0000009062a4'; r text; v_pase uuid;
begin
  perform pg_temp.imp_crear(ada, v_1, 'leads');
  r := pg_temp.imp_pase(ada, v_1);
  v_pase := (r::jsonb #>> '{}')::uuid;
  if (select count(*) from public.importaciones_pases where importacion_id = v_1 and pase = v_pase and usado_en is null) <> 1 then
    raise exception 'el pase de Ada no quedó en importaciones_pases: %', r;
  end if;
  -- Otra vez enseguida: el mismo pase, ninguna fila más.
  r := pg_temp.imp_pase(ada, v_1);
  if (r::jsonb #>> '{}')::uuid is distinct from v_pase or (select count(*) from public.importaciones_pases where importacion_id = v_1) <> 1 then
    raise exception 'el pase vivo debía reusarse: %', r;
  end if;
  -- Bea crea su propia total; Ada, con datos.importar.todo (que le deja leerla), no le saca un pase.
  r := pg_temp.imp_crear(bea, v_b, 'leads');
  if (r::jsonb ->> 'estado') is distinct from 'pendiente' then raise exception 'Bea no creó su importación: %', r; end if;
  r := pg_temp.imp_pase(ada, v_b);
  if r <> '42501' then raise exception 'Ada con datos.importar.todo sacó el pase de Bea: %', r; end if;
  if exists (select 1 from public.importaciones_pases where importacion_id = v_b) then raise exception 'se creó un pase para la de Bea'; end if;
  r := pg_temp.imp_pase(ceci, v_1);
  if r <> '42501' then raise exception 'Ceci sacó el pase de Ada: %', r; end if;
  -- Una de /leads (sin archivo) y una inexistente: 42501 sin decir que existe.
  insert into public.importaciones (id, usuario_id, entidad, estado) values (v_l, ada, 'leads', 'procesando');
  r := pg_temp.imp_pase(ada, v_l);
  if r <> '42501' then raise exception 'una de /leads no lleva pase: %', r; end if;
  r := pg_temp.imp_pase(ada, '00000000-0000-4000-8000-0000009062ff');
  if r <> '42501' then raise exception 'una inexistente: %', r; end if;
  r := pg_temp.imp_pase(ada, null);
  if r <> '22023' then raise exception 'sin id: %', r; end if;
  -- Terminada: 22023.
  perform pg_temp.imp_crear(ada, v_t, 'leads');
  update public.importaciones set estado = 'terminada', terminada_en = now() where id = v_t;
  r := pg_temp.imp_pase(ada, v_t);
  if r <> '22023' then raise exception 'una terminada no lleva pase: %', r; end if;
  if exists (select 1 from public.importaciones_pases where importacion_id in (v_l, v_t)) then raise exception 'un rechazo dejó un pase'; end if;
  -- Ada bloqueada: 42501 antes de todo.
  update public.perfiles set bloqueado = true where id = ada;
  r := pg_temp.imp_pase(ada, v_1);
  if r <> '42501' then raise exception 'bloqueada: %', r; end if;
end $$;
rollback;

-- @test importar-pases: abrir canjea el pase una sola vez y dentro de 10 minutos; si no, null
begin;
select pg_temp.imp_preparar();
do $$
declare ada uuid := '00000000-0000-4000-8000-00000000906a'; v_1 uuid := '00000000-0000-4000-8000-0000009062b1'; r text; v_pase uuid;
        v_viejo uuid := '00000000-0000-4000-8000-0000009062b2';
begin
  perform pg_temp.imp_crear(ada, v_1, 'leads');
  v_pase := (pg_temp.imp_pase(ada, v_1)::jsonb #>> '{}')::uuid;
  r := pg_temp.imp_srv(format('select to_jsonb(public.importacion_abrir(%L))', v_pase));
  if (r::jsonb #>> '{}')::uuid is distinct from v_1 then raise exception 'abrir debía devolver la importación: %', r; end if;
  if (select usado_en from public.importaciones_pases where pase = v_pase) is null then raise exception 'el pase no quedó usado'; end if;
  r := pg_temp.imp_srv(format('select to_jsonb(public.importacion_abrir(%L))', v_pase));
  if r is not null then raise exception 'un pase se canjeó dos veces: %', r; end if;
  -- Ya usado, el siguiente emitir crea otro.
  if (pg_temp.imp_pase(ada, v_1)::jsonb #>> '{}')::uuid = v_pase then raise exception 'se reusó un pase ya canjeado'; end if;
  insert into public.importaciones_pases (pase, importacion_id, creado_en) values (v_viejo, v_1, now() - interval '11 minutes');
  r := pg_temp.imp_srv(format('select to_jsonb(public.importacion_abrir(%L))', v_viejo));
  if r is not null then raise exception 'un pase de hace 11 minutos se canjeó: %', r; end if;
  r := pg_temp.imp_srv('select to_jsonb(public.importacion_abrir(''00000000-0000-4000-8000-0000009062ff''))');
  if r is not null then raise exception 'un pase inexistente se canjeó: %', r; end if;
end $$;
rollback;

-- @test importar-pases: authenticated sólo ejecuta emitir; abrir es de service_role; anon nada; importaciones_pases con RLS y sin lectura de la app
begin;
select pg_temp.imp_preparar();
do $$
declare ada uuid := '00000000-0000-4000-8000-00000000906a'; v_f regprocedure; r text;
begin
  v_f := 'public.importacion_pase_emitir(uuid)'::regprocedure;
  if not has_function_privilege('authenticated', v_f, 'execute') then raise exception 'authenticated no ejecuta importacion_pase_emitir'; end if;
  if has_function_privilege('anon', v_f, 'execute') then raise exception 'anon ejecuta importacion_pase_emitir'; end if;
  v_f := 'public.importacion_abrir(uuid)'::regprocedure;
  if has_function_privilege('authenticated', v_f, 'execute') or has_function_privilege('anon', v_f, 'execute') then
    raise exception 'importacion_abrir la ejecuta alguien más que service_role';
  end if;
  if not has_function_privilege('service_role', v_f, 'execute') then raise exception 'service_role no ejecuta importacion_abrir'; end if;
  if exists (select 1 from pg_proc p where p.oid in ('public.importacion_pase_emitir(uuid)'::regprocedure, 'public.importacion_abrir(uuid)'::regprocedure)
              and (not p.prosecdef or not ('search_path=""' = any (coalesce(p.proconfig, '{}'))))) then
    raise exception 'emitir y abrir van definer con search_path vacío';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.importaciones_pases'::regclass) then raise exception 'importaciones_pases sin RLS'; end if;
  r := pg_temp.imp_como(ada, 'select to_jsonb(count(*)) from public.importaciones_pases');
  if r <> '42501' then raise exception 'authenticated lee importaciones_pases: %', r; end if;
  if has_table_privilege('anon', 'public.importaciones_pases', 'select') then raise exception 'anon lee importaciones_pases'; end if;
end $$;
rollback;
