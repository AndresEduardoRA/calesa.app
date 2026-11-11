-- Fichas del chat (paso 7.08-2, C11, C12 y C6): una tarea o un evento desde un mensaje, y una ficha o mención que no amplía lo que se ve.
-- No depende de otro archivo (`SOLO=areas/chat/fichas.sql`). Cada bloque abre su transacción y la revierte. Prefijo `chfi_`.

-- Una persona activa con un rol propio y estas concesiones (alcance «todos»). La primera cuenta de una base vacía queda dueña: se la lleva una aparte.
create or replace function pg_temp.chfi_persona(p_concesiones text[] default '{}') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'chfi_duena-' || v_id || '@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('chfi_' || substr(v_id::text, 1, 8), 'CHFI ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.chfi_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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
create or replace function pg_temp.chfi_conversacion(p_miembros uuid[]) returns uuid language plpgsql as $f$
declare v uuid; u uuid;
begin
  insert into public.conversaciones (tipo, nombre, creado_por) values ('grupo', 'CHFI grupo', p_miembros[1]) returning id into v;
  foreach u in array p_miembros loop insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (v, u); end loop;
  return v;
end $f$;

-- enviar como esa persona: mensaje_enviar(id, conversación, cuerpo, menciones, responde_a, ficha)
create or replace function pg_temp.chfi_enviar(p_quien uuid, p_id uuid, p_conv uuid, p_cuerpo text, p_menciones jsonb default '[]', p_responde uuid default null, p_ficha jsonb default null)
returns jsonb language sql as $f$
  select pg_temp.chfi_corre(p_quien, format('select public.mensaje_enviar(%L, %L, %L, %L, %L, %L)', p_id, p_conv, p_cuerpo, p_menciones, p_responde, p_ficha));
$f$;

-- @test chat: mensaje_tarea_crear deja la tarea en la conversación, el mensaje-ficha y la tarea_asignada al responsable; la ven los miembros y no quien no lo es (F1, C11)
begin;
do $$
declare a uuid := pg_temp.chfi_persona(array['chat.participar', 'agenda.tareas.asignar']); b uuid := pg_temp.chfi_persona(array['chat.participar', 'agenda.tareas.recibir']);
  c uuid := pg_temp.chfi_persona(array['chat.participar']); afuera uuid := pg_temp.chfi_persona(array['chat.participar']);
  conv uuid; m uuid := gen_random_uuid(); r jsonb; t uuid; q text;
begin
  conv := pg_temp.chfi_conversacion(array[a, b, c]);
  q := format('select public.mensaje_tarea_crear(%L, %L, %L)', m, conv, jsonb_build_object('titulo', 'CHFI tarea', 'responsable_id', b));
  r := pg_temp.chfi_corre(a, q);
  t := (r ->> 'tarea_id')::uuid;
  if r ->> 'resultado' is distinct from 'creado' or (r ->> 'id')::uuid is distinct from m then raise exception 'no creó la tarea desde el chat: %', r; end if;
  if (select tipo::text || tarea_id::text from public.mensajes where id = m) is distinct from 'tarea' || t then raise exception 'el mensaje no es la ficha de la tarea'; end if;
  if (select conversacion_id from public.tareas where id = t) is distinct from conv then raise exception 'la tarea no quedó en la conversación'; end if;
  if not exists (select 1 from public.notificaciones where usuario_id = b and tipo = 'tarea_asignada' and referencia_id = t) then raise exception 'el responsable no tiene su tarea_asignada'; end if;
  if pg_temp.chfi_corre(c, format('select to_jsonb(count(*)) from public.tareas where id = %L', t)) <> '1' then raise exception 'otro miembro no ve la tarea'; end if;
  if pg_temp.chfi_corre(afuera, format('select to_jsonb(count(*)) from public.tareas where id = %L', t)) <> '0' then raise exception 'quien no es miembro ve la tarea'; end if;
  r := pg_temp.chfi_corre(a, q);
  if r ->> 'resultado' is distinct from 'repetido' or (r ->> 'tarea_id')::uuid is distinct from t then raise exception 'repetir no dio repetido: %', r; end if;
  if (select count(*) from public.tareas where conversacion_id = conv) <> 1 then raise exception 'repetir creó otra tarea'; end if;
  r := pg_temp.chfi_corre(afuera, format('select public.mensaje_tarea_crear(%L, %L, %L)', gen_random_uuid(), conv, jsonb_build_object('titulo', 'CHFI de afuera')));
  if r ->> 'error' is distinct from '42501' then raise exception 'quien no es miembro creó una tarea en la conversación: %', r; end if;
end $$;
rollback;

-- @test chat: un responsable que no es miembro vigente (en el canal global, sin chat.global aunque tenga la fila) da 23514 y no deja tarea ni mensaje (F2, C4, C11)
begin;
do $$
declare a uuid := pg_temp.chfi_persona(array['chat.participar', 'chat.global', 'agenda.tareas.asignar']); b uuid := pg_temp.chfi_persona(array['chat.participar', 'agenda.tareas.recibir']);
  d uuid := pg_temp.chfi_persona(array['chat.participar', 'agenda.tareas.recibir']); conv uuid; g uuid; m uuid; r jsonb; v_par record;
begin
  conv := pg_temp.chfi_conversacion(array[a, b]);
  select id into g from public.conversaciones where es_global;
  insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (g, a), (g, d);
  for v_par in select * from (values (conv, d), (g, d)) x (c, u) loop
    m := gen_random_uuid();
    r := pg_temp.chfi_corre(a, format('select public.mensaje_tarea_crear(%L, %L, %L)', m, v_par.c, jsonb_build_object('titulo', 'CHFI sin miembro', 'responsable_id', v_par.u)));
    if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'responsable_id' then raise exception 'un responsable que no es miembro vigente no dio 23514: %', r; end if;
    if exists (select 1 from public.mensajes where id = m) or exists (select 1 from public.tareas where titulo = 'CHFI sin miembro') then
      raise exception 'el rechazo dejó una tarea o un mensaje';
    end if;
  end loop;
end $$;
rollback;

-- @test chat: mensaje_evento_crear con un destinatario miembro deja el evento y su ficha; con uno que no es miembro, 23514 y ningún evento (F3, C12)
begin;
do $$
declare a uuid := pg_temp.chfi_persona(array['chat.participar', 'agenda.eventos.publicar']); b uuid := pg_temp.chfi_persona(array['chat.participar']);
  d uuid := pg_temp.chfi_persona(array['chat.participar']); conv uuid; m uuid := gen_random_uuid(); r jsonb; datos jsonb;
begin
  conv := pg_temp.chfi_conversacion(array[a, b]);
  datos := jsonb_build_object('titulo', 'CHFI evento', 'inicia_en', now() + interval '2 days', 'visibilidad', 'seleccionados');
  r := pg_temp.chfi_corre(a, format('select public.mensaje_evento_crear(%L, %L, %L, %L)', m, conv, datos, array[b]));
  if r ->> 'resultado' is distinct from 'creado' or (select tipo::text || evento_id::text from public.mensajes where id = m) is distinct from 'evento' || (r ->> 'evento_id') then
    raise exception 'no creó el evento desde el chat: %', r;
  end if;
  m := gen_random_uuid();
  r := pg_temp.chfi_corre(a, format('select public.mensaje_evento_crear(%L, %L, %L, %L)', m, conv, datos || '{"titulo": "CHFI evento afuera"}', array[d]));
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'destinatarios' then raise exception 'un destinatario que no es miembro no dio 23514: %', r; end if;
  if exists (select 1 from public.eventos where titulo = 'CHFI evento afuera') or exists (select 1 from public.mensajes where id = m) then raise exception 'el rechazo dejó un evento o un mensaje'; end if;
end $$;
rollback;

-- @test chat: mencionar y mandar en ficha un lead en una conversación no lo vuelve visible en leads_vista para quien no lo tenía (F4, C6, C7)
begin;
do $$
declare a uuid := pg_temp.chfi_persona(array['chat.participar', 'leads.ver']); b uuid := pg_temp.chfi_persona(array['chat.participar']);
  conv uuid; v_lead uuid; r jsonb; q text;
begin
  conv := pg_temp.chfi_conversacion(array[a, b]);
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('CHFI lead', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), a) returning id into v_lead;
  q := format('select to_jsonb(count(*)) from public.leads_vista where id = %L', v_lead);
  if pg_temp.chfi_corre(b, q) <> '0' then raise exception 'la prueba necesita que B no vea el lead'; end if;
  r := pg_temp.chfi_enviar(a, gen_random_uuid(), conv, format('mira #[lead:%s]', v_lead), jsonb_build_array(jsonb_build_object('tipo', 'lead', 'id', v_lead)));
  if r ->> 'resultado' is distinct from 'enviado' then raise exception 'no mencionó el lead: %', r; end if;
  r := pg_temp.chfi_enviar(a, gen_random_uuid(), conv, null, '[]', null, jsonb_build_object('tipo', 'lead', 'id', v_lead));
  if r ->> 'resultado' is distinct from 'enviado' then raise exception 'no mandó la ficha del lead: %', r; end if;
  if pg_temp.chfi_corre(b, q) <> '0' then raise exception 'la mención o la ficha volvieron visible el lead'; end if;
  if pg_temp.chfi_corre(a, q) <> '1' then raise exception 'quien lo tiene dejó de verlo'; end if;
end $$;
rollback;
