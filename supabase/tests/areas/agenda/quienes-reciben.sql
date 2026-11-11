-- A quién se le puede dar una tarea (paso 7.06-2, C8, D27): `agenda_quienes_reciben(p_texto, p_conversacion)`, definer.
-- No depende de otro archivo (`SOLO=areas/agenda/quienes-reciben.sql`). Cada bloque abre su transacción y la revierte. Los nombres llevan «Qwz», que
-- no está en lo sembrado.
--
-- Qué asegura:
--   Q1. Sin agenda.tareas.asignar, 42501; menos de 3 letras o dígitos seguidos, lista vacía; sólo activas, sin bloqueo y con agenda.tareas.recibir;
--       busca por nombre o email; un `%` no es comodín; con `p_conversacion` sólo sus miembros y quien no es miembro, 42501 hint `conversacion_id`;
--       claves exactas `{personas, hay_mas}` e ítem `{id, nombre}`.
--   Q2. 21 coincidencias → 20 y `hay_mas`.
--   Q3. Catálogo: definer, `search_path` vacío, de authenticated y no de anon ni PUBLIC.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (alcance «todos») o 'clave:propios'.
create or replace function pg_temp.qr_persona(p_concesiones text[] default '{}') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  -- La primera cuenta de una base vacía queda dueña (con todos los permisos): se la lleva una aparte.
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'ag-duena-' || v_id || '@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('ag_' || substr(v_id::text, 1, 8), 'AG ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.qr_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  return coalesce(v, 'null'::jsonb);
end $f$;

-- Una persona con ese nombre.
create or replace function pg_temp.qr_nombrada(p_nombre text, p_concesiones text[] default array['agenda.tareas.recibir']) returns uuid language plpgsql as $f$
declare v uuid := pg_temp.qr_persona(p_concesiones);
begin
  update public.perfiles set nombre = p_nombre where id = v;
  return v;
end $f$;

-- La búsqueda como esa persona.
create or replace function pg_temp.qr_busca(p_quien uuid, p_texto text, p_conversacion uuid default null) returns jsonb language sql as $f$
  select pg_temp.qr_corre(p_quien, format('select public.agenda_quienes_reciben(%L, %L::uuid)', p_texto, p_conversacion))
$f$;

-- Los ids de la respuesta, ordenados por id (para comparar conjuntos).
create or replace function pg_temp.qr_ids(p_r jsonb) returns uuid[] language sql as $f$
  select coalesce(array_agg((e ->> 'id')::uuid order by (e ->> 'id')::uuid), '{}') from jsonb_array_elements(p_r -> 'personas') e
$f$;

-- @test agenda: quién recibe: pide asignar, 3 letras, sólo activas sin bloqueo y con recibir, sin comodines, y miembros de la conversación (Q1)
begin;
do $$
declare
  a uuid := pg_temp.qr_persona(array['agenda.tareas.asignar']); sin uuid := pg_temp.qr_persona(array['agenda.tareas.recibir']);
  ok1 uuid := pg_temp.qr_nombrada('Qwzana Uno'); ok2 uuid := pg_temp.qr_nombrada('Qwzana Dos');
  baja uuid := pg_temp.qr_nombrada('Qwzana Baja'); bloq uuid := pg_temp.qr_nombrada('Qwzana Bloqueada');
  sinrec uuid := pg_temp.qr_nombrada('Qwzana Sin', '{}'); conv uuid; ajena uuid; r jsonb;
begin
  update public.perfiles set activo = false where id = baja;
  update public.perfiles set bloqueado = true where id = bloq;
  r := pg_temp.qr_busca(sin, 'qwzana');
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' not like '%agenda.tareas.asignar%' then raise exception 'sin asignar dio %', r; end if;
  r := pg_temp.qr_busca(a, 'qw');
  if r is distinct from '{"personas": [], "hay_mas": false}'::jsonb then raise exception 'con 2 letras dio %', r; end if;
  r := pg_temp.qr_busca(a, 'qwzana');
  if pg_temp.qr_ids(r) is distinct from (select array_agg(x order by x) from unnest(array[ok1, ok2]) x) then raise exception 'qwzana dio %', r; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from array['hay_mas', 'personas']
     or (select array_agg(k order by k) from jsonb_object_keys(r -> 'personas' -> 0) k) is distinct from array['id', 'nombre'] then
    raise exception 'las claves: %', r; end if;
  if r -> 'personas' -> 0 ->> 'nombre' is distinct from 'Qwzana Dos' then raise exception 'el orden por nombre: %', r; end if;
  r := pg_temp.qr_busca(a, 'qwz%');
  if r -> 'personas' <> '[]'::jsonb then raise exception 'el %% fue comodín: %', r; end if;
  r := pg_temp.qr_busca(a, (select email from public.perfiles where id = ok1));
  if pg_temp.qr_ids(r) is distinct from array[ok1] then raise exception 'por email dio %', r; end if;
  insert into public.conversaciones (tipo, nombre, creado_por) values ('grupo', 'QR grupo', a) returning id into conv;
  insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (conv, a), (conv, ok1);
  insert into public.conversaciones (tipo, nombre, creado_por) values ('grupo', 'QR ajena', ok1) returning id into ajena;
  insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (ajena, ok1), (ajena, ok2);
  r := pg_temp.qr_busca(a, 'qwzana', conv);
  if pg_temp.qr_ids(r) is distinct from array[ok1] then raise exception 'con la conversación dio %', r; end if;
  r := pg_temp.qr_busca(a, 'qwzana', ajena);
  if r ->> 'error' is distinct from '42501' or r ->> 'hint' is distinct from 'conversacion_id' then raise exception 'una conversación ajena dio %', r; end if;
end $$;
rollback;

-- @test agenda: quién recibe corta en 20 y dice si hay más (Q2)
begin;
do $$
declare a uuid := pg_temp.qr_persona(array['agenda.tareas.asignar']); r jsonb;
begin
  perform pg_temp.qr_nombrada('Qwzbeto ' || lpad(g::text, 2, '0')) from generate_series(1, 21) g;
  r := pg_temp.qr_busca(a, 'qwzbeto');
  if jsonb_array_length(r -> 'personas') <> 20 or r -> 'hay_mas' is distinct from 'true'::jsonb then raise exception '21 dieron %', r; end if;
  if r -> 'personas' -> 19 ->> 'nombre' is distinct from 'Qwzbeto 20' then raise exception 'el orden: %', r -> 'personas' -> 19; end if;
end $$;
rollback;

-- @test agenda: agenda_quienes_reciben es definer, con search_path vacío, de authenticated y no de anon ni PUBLIC (Q3)
begin;
do $$
declare f record; v_oid oid := 'public.agenda_quienes_reciben(text, uuid)'::regprocedure;
begin
  select p.prosecdef, p.proconfig into f from pg_proc p where p.oid = v_oid;
  if not f.prosecdef or f.proconfig is distinct from array['search_path=""'] then raise exception 'definer % y config %', f.prosecdef, f.proconfig; end if;
  if not has_function_privilege('authenticated', v_oid, 'execute') or has_function_privilege('anon', v_oid, 'execute')
     or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.oid = v_oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
    raise exception 'execute de authenticated sí, de anon y PUBLIC no'; end if;
  if (select count(*) from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = 'agenda_quienes_reciben') <> 1 then
    raise exception 'agenda_quienes_reciben tiene sobrecargas'; end if;
end $$;
rollback;
