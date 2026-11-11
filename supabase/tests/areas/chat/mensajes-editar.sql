-- Mensajes del chat (paso 7.08-2): editar y eliminar por RPC (C3, C9 y C10).
-- No depende de otro archivo (`SOLO=areas/chat/mensajes-editar.sql`). Cada bloque abre su transacción y la revierte. Prefijo `chme_`.

-- Una persona activa con un rol propio y estas concesiones (alcance «todos»). La primera cuenta de una base vacía queda dueña: se la lleva una aparte.
create or replace function pg_temp.chme_persona(p_concesiones text[] default '{}') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'chme_duena-' || v_id || '@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('chme_' || substr(v_id::text, 1, 8), 'CHME ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.chme_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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
create or replace function pg_temp.chme_conversacion(p_miembros uuid[]) returns uuid language plpgsql as $f$
declare v uuid; u uuid;
begin
  insert into public.conversaciones (tipo, nombre, creado_por) values ('grupo', 'CHME grupo', p_miembros[1]) returning id into v;
  foreach u in array p_miembros loop insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (v, u); end loop;
  return v;
end $f$;

-- enviar como esa persona: mensaje_enviar(id, conversación, cuerpo, menciones, responde_a, ficha)
create or replace function pg_temp.chme_enviar(p_quien uuid, p_id uuid, p_conv uuid, p_cuerpo text, p_menciones jsonb default '[]', p_responde uuid default null, p_ficha jsonb default null)
returns jsonb language sql as $f$
  select pg_temp.chme_corre(p_quien, format('select public.mensaje_enviar(%L, %L, %L, %L, %L, %L)', p_id, p_conv, p_cuerpo, p_menciones, p_responde, p_ficha));
$f$;

-- editar como esa persona: mensaje_editar(mensaje, versión, cuerpo, menciones)
create or replace function pg_temp.chme_editar(p_quien uuid, p_m uuid, p_version timestamptz, p_cuerpo text, p_menciones jsonb default '[]') returns jsonb language sql as $f$
  select pg_temp.chme_corre(p_quien, format('select public.mensaje_editar(%L, %L, %L, %L)', p_m, p_version, p_cuerpo, p_menciones));
$f$;

-- @test chat: editar sólo el autor, dentro de 15 minutos, un mensaje vivo y con la versión que tenía; mismo cuerpo es sin_cambios (E3, C3, C9)
begin;
do $$
declare a uuid := pg_temp.chme_persona(array['chat.participar']); b uuid := pg_temp.chme_persona(array['chat.participar']);
  conv uuid; m uuid := gen_random_uuid(); viejo uuid; borrado uuid; r jsonb; v1 timestamptz; v2 timestamptz;
begin
  conv := pg_temp.chme_conversacion(array[a, b]);
  v1 := (pg_temp.chme_enviar(a, m, conv, 'hola') ->> 'creado_en')::timestamptz;
  r := pg_temp.chme_editar(a, m, v1, 'hola');
  if r ->> 'resultado' is distinct from 'sin_cambios' then raise exception 'el mismo cuerpo no dio sin_cambios: %', r; end if;
  r := pg_temp.chme_editar(a, m, v1, 'hola, corregido');
  v2 := (r ->> 'actualizado_en')::timestamptz;
  if r ->> 'resultado' is distinct from 'editado' or (select editado_en from public.mensajes where id = m) is distinct from v2 or v2 <= v1 then
    raise exception 'el autor no editó o no movió la versión: %', r;
  end if;
  r := pg_temp.chme_editar(a, m, v1, 'otra vez');
  if r ->> 'error' is distinct from 'PT409' then raise exception 'la versión vieja no dio PT409: %', r; end if;
  r := pg_temp.chme_editar(b, m, v2, 'lo cambio yo');
  if r ->> 'error' is distinct from '42501' then raise exception 'otro miembro editó: %', r; end if;
  if (select cuerpo from public.mensajes where id = m) is distinct from 'hola, corregido' then raise exception 'el cuerpo cambió por un intento rechazado'; end if;

  insert into public.mensajes (conversacion_id, autor_id, cuerpo, creado_en) values (conv, a, 'de antes', now() - interval '16 minutes') returning id into viejo;
  r := pg_temp.chme_editar(a, viejo, now() - interval '16 minutes', 'tarde');
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'cuerpo' then raise exception 'fuera de la ventana no dio 23514: %', r; end if;
  insert into public.mensajes (conversacion_id, autor_id, cuerpo, eliminado_en) values (conv, a, null, now()) returning id into borrado;
  r := pg_temp.chme_editar(a, borrado, now(), 'revivo');
  if r ->> 'error' is distinct from '23514' then raise exception 'editar un eliminado no dio 23514: %', r; end if;
  r := pg_temp.chme_editar(a, m, v2, '   ');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'cuerpo' then raise exception 'dejar vacío un texto no dio 22023: %', r; end if;

  delete from public.roles_permisos rp using public.usuarios_roles ur where ur.usuario_id = a and rp.rol_id = ur.rol_id and rp.permiso_clave = 'chat.participar';
  r := pg_temp.chme_editar(a, m, v2, 'sin permiso');
  if r ->> 'error' is distinct from '42501' then raise exception 'sin chat.participar editó: %', r; end if;
end $$;
rollback;

-- @test chat: eliminar el autor o quien modera siendo miembro; el borrado no entrega cuerpo ni menciones y repetir es sin_cambios (E4, C10)
begin;
do $$
declare a uuid := pg_temp.chme_persona(array['chat.participar']); b uuid := pg_temp.chme_persona(array['chat.participar']);
  moderadora uuid := pg_temp.chme_persona(array['chat.participar', 'chat.moderar']); afuera uuid := pg_temp.chme_persona(array['chat.participar', 'chat.moderar']);
  conv uuid; m uuid := gen_random_uuid(); ajeno uuid := gen_random_uuid(); r jsonb;
begin
  conv := pg_temp.chme_conversacion(array[a, b, moderadora]);
  r := pg_temp.chme_enviar(a, m, conv, format('hola #[usuario:%s]', b), jsonb_build_array(jsonb_build_object('tipo', 'usuario', 'id', b)));
  if r ->> 'resultado' is distinct from 'enviado' then raise exception 'no envió con mención: %', r; end if;
  r := pg_temp.chme_corre(b, format('select public.mensaje_eliminar(%L)', m));
  if r ->> 'error' is distinct from '42501' then raise exception 'otro miembro sin chat.moderar eliminó: %', r; end if;
  r := pg_temp.chme_corre(a, format('select public.mensaje_eliminar(%L)', m));
  if r ->> 'resultado' is distinct from 'eliminado' then raise exception 'el autor no eliminó: %', r; end if;
  r := pg_temp.chme_corre(b, format('select to_jsonb(x) from (select cuerpo, eliminado_en is not null as eliminado from public.mensajes where id = %L) x', m));
  if r -> 'cuerpo' <> 'null'::jsonb or r ->> 'eliminado' is distinct from 'true' then raise exception 'el borrado entrega cuerpo o no se marcó: %', r; end if;
  r := pg_temp.chme_corre(b, format('select to_jsonb(count(*)) from public.mensajes_menciones where mensaje_id = %L', m));
  if r <> '0' then raise exception 'el borrado conserva sus menciones: %', r; end if;
  r := pg_temp.chme_corre(a, format('select public.mensaje_eliminar(%L)', m));
  if r ->> 'resultado' is distinct from 'sin_cambios' then raise exception 'eliminar dos veces no dio sin_cambios: %', r; end if;

  r := pg_temp.chme_enviar(b, ajeno, conv, 'algo para moderar');
  r := pg_temp.chme_corre(afuera, format('select public.mensaje_eliminar(%L)', ajeno));
  if r ->> 'error' is distinct from '42501' then raise exception 'quien modera sin ser miembro eliminó: %', r; end if;
  r := pg_temp.chme_corre(moderadora, format('select public.mensaje_eliminar(%L)', ajeno));
  if r ->> 'resultado' is distinct from 'eliminado' or (select cuerpo from public.mensajes where id = ajeno) is not null then raise exception 'quien modera no eliminó uno ajeno: %', r; end if;
  if (select editado_en from public.mensajes where id = ajeno) is not null then raise exception 'eliminar marcó el mensaje como editado'; end if;
end $$;
rollback;
