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

-- @test chat: mensaje_enviar pide chat.participar y ser miembro vigente, es idempotente por id y valida el cuerpo y la respuesta (E1, C5, C7)
begin;
do $$
declare a uuid := pg_temp.chms_persona(array['chat.participar']); b uuid := pg_temp.chms_persona(array['chat.participar']);
  mudo uuid := pg_temp.chms_persona(); afuera uuid := pg_temp.chms_persona(array['chat.participar', 'chat.global']);
  conv uuid; otra uuid; g uuid; m1 uuid := gen_random_uuid(); m2 uuid := gen_random_uuid(); r jsonb;
begin
  conv := pg_temp.chms_conversacion(array[a, b, mudo]);
  otra := pg_temp.chms_conversacion(array[a, b]);
  r := pg_temp.chms_enviar(a, m1, conv, '  hola  ');
  if r ->> 'resultado' is distinct from 'enviado' or (r ->> 'id')::uuid is distinct from m1 then raise exception 'no envió: %', r; end if;
  if (select autor_id from public.mensajes where id = m1) is distinct from a or (select cuerpo from public.mensajes where id = m1) is distinct from 'hola' then
    raise exception 'el mensaje no quedó con su autor y el cuerpo sin blancos';
  end if;
  r := pg_temp.chms_enviar(a, m1, conv, 'hola');
  if r ->> 'resultado' is distinct from 'repetido' then raise exception 'repetir no dio repetido: %', r; end if;
  if (select count(*) from public.mensajes where id = m1) <> 1 then raise exception 'repetir duplicó el mensaje'; end if;
  r := pg_temp.chms_enviar(b, m1, conv, 'hola');
  if r ->> 'error' is distinct from '22023' then raise exception 'el id de otra persona no dio 22023: %', r; end if;
  r := pg_temp.chms_enviar(mudo, gen_random_uuid(), conv, 'hola');
  if r ->> 'error' is distinct from '42501' then raise exception 'sin chat.participar envió: %', r; end if;
  r := pg_temp.chms_enviar(afuera, gen_random_uuid(), conv, 'hola');
  if r ->> 'error' is distinct from '42501' then raise exception 'quien no es miembro envió: %', r; end if;
  r := pg_temp.chms_enviar(a, null, conv, 'hola');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'id' then raise exception 'sin id no dio 22023: %', r; end if;
  foreach r in array array[pg_temp.chms_enviar(a, gen_random_uuid(), conv, '   '), pg_temp.chms_enviar(a, gen_random_uuid(), conv, repeat('x', 4001))] loop
    if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'cuerpo' then raise exception 'un cuerpo vacío o largo no dio 22023: %', r; end if;
  end loop;
  r := pg_temp.chms_enviar(a, gen_random_uuid(), conv, repeat('x', 4000));
  if r ->> 'resultado' is distinct from 'enviado' then raise exception '4.000 caracteres no entraron: %', r; end if;
  r := pg_temp.chms_enviar(b, m2, otra, 'respondo', '[]', m1);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'responde_a' then raise exception 'responder a otra conversación no dio 22023: %', r; end if;
  r := pg_temp.chms_enviar(b, m2, conv, 'respondo', '[]', m1);
  if r ->> 'resultado' is distinct from 'enviado' or (select responde_a_id from public.mensajes where id = m2) is distinct from m1 then raise exception 'no respondió: %', r; end if;

  select id into g from public.conversaciones where es_global;
  insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (g, a);
  r := pg_temp.chms_enviar(a, gen_random_uuid(), g, 'al canal');
  if r ->> 'error' is distinct from '42501' then raise exception 'sin chat.global escribió en el canal: %', r; end if;
end $$;
rollback;

-- @test chat: una ficha de lead, vehículo o cotización exige que quien envía la vea; la que ve queda con su tipo y su FK; una tarea no va por aquí (E2, C7)
begin;
do $$
declare a uuid := pg_temp.chms_persona(array['chat.participar', 'leads.ver', 'vehiculos.ver']); b uuid := pg_temp.chms_persona(array['chat.participar']);
  conv uuid; o uuid; v_lead uuid; v_veh uuid; r jsonb; m uuid; f jsonb;
begin
  conv := pg_temp.chms_conversacion(array[a, b]);
  insert into public.origenes (clave, nombre) values ('chms_' || substr(gen_random_uuid()::text, 1, 8), 'CHMS origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'CHMS vehículo', 'toyota') returning id into v_veh;
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('CHMS lead', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), a) returning id into v_lead;
  foreach f in array array[jsonb_build_object('tipo', 'lead', 'id', v_lead), jsonb_build_object('tipo', 'vehiculo', 'id', v_veh),
                           jsonb_build_object('tipo', 'cotizacion', 'id', gen_random_uuid())] loop
    m := gen_random_uuid();
    r := pg_temp.chms_enviar(b, m, conv, null, '[]', null, f);
    if r ->> 'error' is distinct from '42501' or r ->> 'hint' is distinct from 'ficha' then raise exception 'una ficha que no ve no dio 42501: % → %', f, r; end if;
    if exists (select 1 from public.mensajes where id = m) then raise exception 'la ficha rechazada dejó un mensaje'; end if;
  end loop;
  m := gen_random_uuid();
  r := pg_temp.chms_enviar(a, m, conv, null, '[]', null, jsonb_build_object('tipo', 'lead', 'id', v_lead));
  if r ->> 'resultado' is distinct from 'enviado' or (select tipo::text || lead_id::text from public.mensajes where id = m) is distinct from 'lead' || v_lead then
    raise exception 'la ficha de lead no quedó: %', r;
  end if;
  m := gen_random_uuid();
  r := pg_temp.chms_enviar(a, m, conv, 'mira este', '[]', null, jsonb_build_object('tipo', 'vehiculo', 'id', v_veh));
  if r ->> 'resultado' is distinct from 'enviado' or (select tipo::text || vehiculo_id::text || cuerpo from public.mensajes where id = m) is distinct from 'vehiculo' || v_veh || 'mira este' then
    raise exception 'la ficha de vehículo con comentario no quedó: %', r;
  end if;
  r := pg_temp.chms_enviar(a, gen_random_uuid(), conv, null, '[]', null, jsonb_build_object('tipo', 'tarea', 'id', gen_random_uuid()));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'ficha' then raise exception 'una ficha de tarea no dio 22023: %', r; end if;
end $$;
rollback;
