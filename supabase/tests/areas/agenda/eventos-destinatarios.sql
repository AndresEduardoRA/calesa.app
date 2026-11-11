-- Los destinatarios de un evento (paso 7.06-1): tope, todo o nada, quién puede estar y los avisos. Partido de `eventos.sql` por largo.
-- No depende de otro archivo (`SOLO=areas/agenda/eventos-destinatarios.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   E6. Destinatarios: tope 50, todo o nada, sin bajas ni bloqueados; seleccionados con alguien, privado y público sin nadie.
--   E7. Avisos `evento_invitacion` a cada destinatario nuevo.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (alcance «todos») o 'clave:propios'.
create or replace function pg_temp.ag_persona(p_concesiones text[] default '{}') returns uuid language plpgsql as $f$
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
create or replace function pg_temp.ag_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- Llama a una RPC de eventos como esa persona: 'crear' (id, datos, destinatarios) y 'guardar' (evento, versión, datos, destinatarios).
create or replace function pg_temp.ag_crear(p_quien uuid, p_id uuid, p_datos jsonb, p_dest uuid[] default '{}') returns jsonb language sql as $f$
  select pg_temp.ag_corre(p_quien, format('select public.evento_crear(%L, %L, %L)', p_id, p_datos, p_dest));
$f$;
create or replace function pg_temp.ag_guardar(p_quien uuid, p_ev uuid, p_v timestamptz, p_datos jsonb, p_dest uuid[] default null) returns jsonb language sql as $f$
  select pg_temp.ag_corre(p_quien, format('select public.evento_guardar(%L, %L, %L, %L)', p_ev, p_v, p_datos, p_dest));
$f$;
-- Datos mínimos de un evento con esta visibilidad.
create or replace function pg_temp.ag_datos(p_vis text default 'privado') returns jsonb language sql as $f$
  select jsonb_build_object('titulo', 'Reunión AG', 'inicia_en', now() + interval '2 days', 'visibilidad', p_vis);
$f$;


-- @test agenda: destinatarios: tope 50, todo o nada, sin bajas ni bloqueados, seleccionados con alguien y privado sin nadie (E6)
begin;
do $$
declare
  pub uuid := pg_temp.ag_persona(array['agenda.eventos.publicar']); d1 uuid := pg_temp.ag_persona(); baja uuid := pg_temp.ag_persona(); bloq uuid := pg_temp.ag_persona();
  s uuid := gen_random_uuid(); muchos uuid[] := '{}'; i int; v0 timestamptz; r jsonb;
begin
  for i in 1..51 loop muchos := muchos || pg_temp.ag_persona(); end loop;
  update public.perfiles set activo = false where id = baja;
  update public.perfiles set bloqueado = true where id = bloq;
  r := pg_temp.ag_crear(pub, gen_random_uuid(), pg_temp.ag_datos('seleccionados'), muchos);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'destinatarios' then raise exception '51 destinatarios al crear no dieron 22023: %', r; end if;
  r := pg_temp.ag_crear(pub, gen_random_uuid(), pg_temp.ag_datos('seleccionados'), muchos[1:50] || pub);
  if r ->> 'resultado' is distinct from 'creado' then raise exception '50 destinatarios más el creador no se crearon: %', r; end if;
  r := pg_temp.ag_crear(pub, gen_random_uuid(), pg_temp.ag_datos('privado'), array[d1]);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'destinatarios' then raise exception 'un privado con destinatarios no dio 22023: %', r; end if;
  r := pg_temp.ag_crear(pub, gen_random_uuid(), pg_temp.ag_datos('seleccionados'));
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'destinatarios' then raise exception 'seleccionados sin nadie no dio 23514: %', r; end if;

  v0 := (pg_temp.ag_crear(pub, s, pg_temp.ag_datos('seleccionados'), array[d1]) ->> 'actualizado_en')::timestamptz;
  r := pg_temp.ag_guardar(pub, s, v0, '{"titulo": "Cambio"}', muchos);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'destinatarios' then raise exception '51 destinatarios al guardar no dieron 22023: %', r; end if;
  r := pg_temp.ag_guardar(pub, s, v0, '{}', array[d1, baja]);
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'destinatarios' then raise exception 'una persona de baja no dio 23514: %', r; end if;
  r := pg_temp.ag_guardar(pub, s, v0, '{}', array[d1, bloq]);
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'destinatarios' then raise exception 'una persona bloqueada no dio 23514: %', r; end if;
  r := pg_temp.ag_guardar(pub, s, v0, '{}', array[]::uuid[]);
  if r ->> 'error' is distinct from '23514' then raise exception 'dejar seleccionados sin nadie no dio 23514: %', r; end if;
  if (select array_agg(usuario_id) from public.eventos_destinatarios where evento_id = s) is distinct from array[d1]
     or (select titulo from public.eventos where id = s) <> 'Reunión AG' then
    raise exception 'un guardar fallido dejó cambios';
  end if;
  r := pg_temp.ag_guardar(pub, s, v0, '{"visibilidad": "privado"}');
  if r ->> 'resultado' is distinct from 'guardado' or exists (select 1 from public.eventos_destinatarios where evento_id = s) then raise exception 'pasar a privado no borró los destinatarios: %', r; end if;
end $$;
rollback;

-- @test agenda: avisos: evento_invitacion a cada destinatario nuevo, ninguno al creador ni a quien ya estaba (E7)
begin;
do $$
declare
  pub uuid := pg_temp.ag_persona(array['agenda.eventos.publicar']); a uuid := pg_temp.ag_persona(); b uuid := pg_temp.ag_persona(); c uuid := pg_temp.ag_persona();
  s uuid := gen_random_uuid(); v0 timestamptz; r jsonb;
begin
  v0 := (pg_temp.ag_crear(pub, s, pg_temp.ag_datos('seleccionados'), array[a, b]) ->> 'actualizado_en')::timestamptz;
  if (select count(*) from public.notificaciones where tipo = 'evento_invitacion' and referencia_id = s and usuario_id = a) <> 1
     or (select count(*) from public.notificaciones where tipo = 'evento_invitacion' and referencia_id = s and usuario_id = b) <> 1
     or exists (select 1 from public.notificaciones where referencia_id = s and usuario_id = pub) then
    raise exception 'crear no avisó una vez a cada destinatario y a nadie más';
  end if;
  if exists (select 1 from public.notificaciones where referencia_id = s and (requiere_accion or ruta <> '/agenda?evento=' || s or referencia_tipo <> 'evento')) then
    raise exception 'el aviso no lleva la ruta del evento o pide acción';
  end if;
  r := pg_temp.ag_guardar(pub, s, v0, '{}', array[b, c]);
  if r ->> 'resultado' is distinct from 'guardado' then raise exception 'guardar destinatarios falló: %', r; end if;
  if (select count(*) from public.notificaciones where tipo = 'evento_invitacion' and referencia_id = s) <> 3
     or (select count(*) from public.notificaciones where tipo = 'evento_invitacion' and referencia_id = s and usuario_id = c) <> 1 then
    raise exception 'guardar no avisó sólo al destinatario nuevo';
  end if;
end $$;
rollback;
