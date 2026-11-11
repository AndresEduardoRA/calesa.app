-- Mensajes del chat (paso 7.08-2): la estructura, enviar por RPC, fichas y el fin de la escritura directa. Editar y eliminar: `mensajes-editar.sql`.
-- No depende de otro archivo (`SOLO=areas/chat/mensajes.sql`). Cada bloque abre su transacción y la revierte. Prefijo `chms_`.

-- Una persona activa con un rol propio y estas concesiones (alcance «todos»). La primera cuenta de una base vacía queda dueña: se la lleva una aparte.
create or replace function pg_temp.chms_persona(p_concesiones text[] default '{}') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'chms_duena-' || v_id || '@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('chms_' || substr(v_id::text, 1, 8), 'CHMS ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.chms_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- Una conversación de grupo armada como dueño de la tabla (terreno de la prueba).
create or replace function pg_temp.chms_conversacion(p_miembros uuid[]) returns uuid language plpgsql as $f$
declare v uuid; u uuid;
begin
  insert into public.conversaciones (tipo, nombre, creado_por) values ('grupo', 'CHMS grupo', p_miembros[1]) returning id into v;
  foreach u in array p_miembros loop insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (v, u); end loop;
  return v;
end $f$;

-- enviar como esa persona: mensaje_enviar(id, conversación, cuerpo, menciones, responde_a, ficha)
create or replace function pg_temp.chms_enviar(p_quien uuid, p_id uuid, p_conv uuid, p_cuerpo text, p_menciones jsonb default '[]', p_responde uuid default null, p_ficha jsonb default null)
returns jsonb language sql as $f$
  select pg_temp.chms_corre(p_quien, format('select public.mensaje_enviar(%L, %L, %L, %L, %L, %L)', p_id, p_conv, p_cuerpo, p_menciones, p_responde, p_ficha));
$f$;

-- @test chat: un mensaje eliminado no guarda cuerpo (check), el texto eliminado sin cuerpo entra y el hilo tiene su índice por cursor (E0, C1, C2)
begin;
do $$
declare a uuid := pg_temp.chms_persona(); b uuid := pg_temp.chms_persona(); conv uuid;
begin
  conv := pg_temp.chms_conversacion(array[a, b]);
  insert into public.mensajes (conversacion_id, autor_id, cuerpo, eliminado_en) values (conv, a, null, now());
  begin
    insert into public.mensajes (conversacion_id, autor_id, cuerpo, eliminado_en) values (conv, a, 'todavía acá', now());
    raise exception 'un mensaje eliminado con cuerpo entró';
  exception when check_violation then null;
  end;
  begin
    insert into public.mensajes (conversacion_id, autor_id, cuerpo) values (conv, a, null);
    raise exception 'un texto vivo sin cuerpo entró';
  exception when check_violation then null;
  end;
  if to_regclass('public.mensajes_hilo_idx') is null then raise exception 'falta mensajes_hilo_idx'; end if;
  if to_regclass('public.mensajes_conversacion_fecha_idx') is not null then raise exception 'quedó mensajes_conversacion_fecha_idx'; end if;
  if pg_get_indexdef('public.mensajes_hilo_idx'::regclass) not like '%(conversacion_id, creado_en DESC, id DESC)%' then
    raise exception 'mensajes_hilo_idx no es (conversacion_id, creado_en desc, id desc): %', pg_get_indexdef('public.mensajes_hilo_idx'::regclass);
  end if;
end $$;
rollback;
