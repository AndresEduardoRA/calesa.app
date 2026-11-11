-- Push web, el disparo y el pase (paso 7.03-1): una notificación que entra dispara la función `push` con un pase de un uso; la función lo
-- canjea con push_abrir() y anota con push_resultado(). No depende de otro archivo (`SOLO=areas/push/disparo.sql`): cada bloque abre su
-- transacción y la revierte. Los pedidos de pg_net quedan en `net.pedidos` (el doble de PGlite).
--
-- Qué asegura:
--   D1. Con todo en regla, un aviso deja exactamente un pedido a /functions/v1/push con un pase de esa notificación.
--   D2. No dispara (y la notificación entra igual): push_web apagada, tipo apagado (otro tipo sí), sin suscripción, sin permiso, sin
--       url_proyecto, la repetida que descarta el antispam, la persona de baja.
--   D3. Si pg_net falla, el aviso no falla.
--   D4. El pase vale una vez y 10 minutos; push_abrir devuelve sólo {titulo, cuerpo, ruta, suscripciones} y sólo las válidas del destinatario.
--   D5. push_resultado: enviada, fallo y caducada; un id ajeno no cambia; una vez por pase; un pase sin abrir no vale.
--   D6. Privilegios de push_pases y de las funciones; la preferencia es un objeto; borrar la notificación propia se lleva su pase.

create or replace function pg_temp.pd_persona(p_rol text default null) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  if p_rol is not null then
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select v_id, id, true from public.roles where clave = p_rol;
  end if;
  return v_id;
end $f$;

-- Una suscripción sembrada como la base (el endpoint de prueba no es de un servicio de push real).
create or replace function pg_temp.pd_suscripcion(p_quien uuid, p_endpoint text) returns uuid language sql as $f$
  insert into public.suscripciones_push (usuario_id, endpoint, claves) values (p_quien, p_endpoint, '{"p256dh": "x", "auth": "y"}') returning id;
$f$;

create or replace function pg_temp.pd_avisar(p_quien uuid, p_tipo text default 'pd_prueba', p_ref uuid default null) returns void language sql as $f$
  select public.notificar(p_quien, p_tipo, 'Aviso de prueba', 'El cuerpo', 'pd', coalesce(p_ref, gen_random_uuid()), '/inicio', false);
$f$;

create or replace function pg_temp.pd_pedidos() returns bigint language sql as $f$ select count(*) from net.pedidos $f$;

-- Push encendido y la URL del proyecto conocida.
create or replace function pg_temp.pd_encender() returns void language plpgsql as $f$
begin
  update public.integraciones set activa = true where clave = 'push_web';
  delete from vault.secrets where name = 'url_proyecto';
  perform vault.create_secret('https://abc.supabase.co/', 'url_proyecto', 'prueba');
end $f$;

-- Canjea o anota como service_role (la función push).
create or replace function pg_temp.pd_abrir(p_pase uuid) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  set local role service_role;
  v := public.push_abrir(p_pase);
  reset role;
  return v;
end $f$;

create or replace function pg_temp.pd_resultado(p_pase uuid, p_resultados jsonb) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  set local role service_role;
  v := public.push_resultado(p_pase, p_resultados);
  reset role;
  return v;
end $f$;

create or replace function pg_temp.pd_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e);
  end;
  reset role;
  return v;
end $f$;

-- @test push: con push_web activa, el permiso, una suscripción y la URL, un aviso deja un pedido a la función push con su pase (D1)
begin;
do $$
declare a uuid := pg_temp.pd_persona('asesor'); n0 bigint; p record;
begin
  perform pg_temp.pd_encender();
  perform pg_temp.pd_suscripcion(a, 'https://fcm.googleapis.com/fcm/send/d1');
  n0 := pg_temp.pd_pedidos();
  perform pg_temp.pd_avisar(a);
  if pg_temp.pd_pedidos() <> n0 + 1 then raise exception 'no dejó exactamente un pedido: %', pg_temp.pd_pedidos() - n0; end if;
  select * into p from net.pedidos order by id desc limit 1;
  if p.url is distinct from 'https://abc.supabase.co/functions/v1/push' then raise exception 'el pedido fue a %', p.url; end if;
  if (select array_agg(k) from jsonb_object_keys(p.body) k) <> array['pase'] then raise exception 'el cuerpo lleva de más: %', p.body; end if;
  if not exists (select 1 from public.push_pases pp join public.notificaciones x on x.id = pp.notificacion_id
                  where pp.pase = (p.body ->> 'pase')::uuid and x.usuario_id = a and pp.usado_en is null) then
    raise exception 'el pase del pedido no es de la notificación'; end if;
end $$;
rollback;

-- @test push: no dispara con push_web apagada, el tipo apagado, sin suscripción, sin permiso, sin URL, el antispam ni de baja (D2)
begin;
do $$
declare
  primera uuid := pg_temp.pd_persona(); -- con SOLO=, la primera cuenta del bloque nace dueña
  a uuid := pg_temp.pd_persona('asesor'); sin_sus uuid := pg_temp.pd_persona('asesor'); sin_permiso uuid := pg_temp.pd_persona();
  baja uuid := pg_temp.pd_persona('asesor'); n0 bigint; v_ref uuid := gen_random_uuid(); v_notis int;
begin
  perform pg_temp.pd_suscripcion(a, 'https://fcm.googleapis.com/fcm/send/d2a');
  perform pg_temp.pd_suscripcion(sin_permiso, 'https://fcm.googleapis.com/fcm/send/d2s');
  perform pg_temp.pd_suscripcion(baja, 'https://fcm.googleapis.com/fcm/send/d2b');

  -- Apagada (la del seed).
  delete from vault.secrets where name = 'url_proyecto';
  perform vault.create_secret('https://abc.supabase.co/', 'url_proyecto', 'prueba');
  n0 := pg_temp.pd_pedidos();
  perform pg_temp.pd_avisar(a);
  if pg_temp.pd_pedidos() <> n0 then raise exception 'disparó con push_web apagada'; end if;
  if (select count(*) from public.notificaciones where usuario_id = a) <> 1 then raise exception 'la notificación no entró con push apagado'; end if;

  perform pg_temp.pd_encender();
  -- El tipo apagado no dispara; otro tipo de la misma persona sí.
  insert into public.preferencias_usuario (usuario_id, clave, valor) values (a, 'notificaciones.push', '{"pd_callado": false, "pd_prueba": true}');
  n0 := pg_temp.pd_pedidos();
  perform pg_temp.pd_avisar(a, 'pd_callado');
  if pg_temp.pd_pedidos() <> n0 then raise exception 'disparó con el tipo apagado'; end if;
  perform pg_temp.pd_avisar(a, 'pd_prueba');
  if pg_temp.pd_pedidos() <> n0 + 1 then raise exception 'no disparó el tipo encendido'; end if;

  -- El antispam descarta la repetida: no hay segundo pedido.
  perform pg_temp.pd_avisar(a, 'pd_otro', v_ref);
  n0 := pg_temp.pd_pedidos();
  perform pg_temp.pd_avisar(a, 'pd_otro', v_ref);
  if pg_temp.pd_pedidos() <> n0 then raise exception 'disparó la repetida del antispam'; end if;

  -- Sin suscripción, sin permiso, de baja.
  perform pg_temp.pd_avisar(sin_sus);
  perform pg_temp.pd_avisar(sin_permiso);
  update public.perfiles set activo = false, baja_en = now() where id = baja;
  perform pg_temp.pd_avisar(baja);
  if pg_temp.pd_pedidos() <> n0 then raise exception 'disparó sin suscripción, sin permiso o de baja'; end if;
  if (select count(*) from public.notificaciones where usuario_id in (sin_sus, sin_permiso)) <> 2 then raise exception 'las notificaciones no entraron'; end if;

  -- Sin la URL del proyecto.
  delete from vault.secrets where name = 'url_proyecto';
  v_notis := (select count(*) from public.notificaciones where usuario_id = a);
  perform pg_temp.pd_avisar(a, 'pd_prueba');
  if pg_temp.pd_pedidos() <> n0 then raise exception 'disparó sin url_proyecto'; end if;
  if (select count(*) from public.notificaciones where usuario_id = a) <> v_notis + 1 then raise exception 'sin URL la notificación no entró'; end if;
end $$;
rollback;

-- @test push: si pg_net falla, el aviso entra igual y no hay error (D3)
begin;
create or replace function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb, headers jsonb default '{}'::jsonb, timeout_milliseconds int default 5000)
  returns bigint language plpgsql as $f$ begin raise exception 'pg_net caído'; end $f$;
do $$
declare a uuid := pg_temp.pd_persona('asesor');
begin
  perform pg_temp.pd_encender();
  perform pg_temp.pd_suscripcion(a, 'https://fcm.googleapis.com/fcm/send/d3');
  perform pg_temp.pd_avisar(a);
  if (select count(*) from public.notificaciones where usuario_id = a) <> 1 then raise exception 'el aviso no entró con pg_net caído'; end if;
  if exists (select 1 from public.push_pases) then raise exception 'quedó un pase sin pedido'; end if;
end $$;
rollback;

-- @test push: el pase vale una vez y 10 minutos, y push_abrir devuelve sólo lo de la notificación y las suscripciones del destinatario (D4)
begin;
do $$
declare a uuid := pg_temp.pd_persona('asesor'); b uuid := pg_temp.pd_persona('asesor'); v_pase uuid; v jsonb; v_sa uuid; v_viejo uuid;
begin
  perform pg_temp.pd_encender();
  v_sa := pg_temp.pd_suscripcion(a, 'https://fcm.googleapis.com/fcm/send/d4a');
  perform pg_temp.pd_suscripcion(b, 'https://fcm.googleapis.com/fcm/send/d4b');
  -- Una fila de antes de push_suscribir con un endpoint libre: push_abrir no la devuelve.
  perform pg_temp.pd_suscripcion(a, 'https://ejemplo.com/x');
  perform pg_temp.pd_avisar(a);
  select pp.pase into v_pase from public.push_pases pp join public.notificaciones x on x.id = pp.notificacion_id where x.usuario_id = a;
  v := pg_temp.pd_abrir(v_pase);
  if v is null then raise exception 'el pase no abrió'; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(v) k) <> array['cuerpo', 'ruta', 'suscripciones', 'titulo'] then raise exception 'push_abrir devuelve otras claves: %', v; end if;
  if v ->> 'titulo' <> 'Aviso de prueba' or v ->> 'cuerpo' <> 'El cuerpo' or v ->> 'ruta' <> '/inicio' then raise exception 'la carga no es la de la notificación: %', v; end if;
  if jsonb_array_length(v -> 'suscripciones') <> 1 or (v #>> '{suscripciones,0,id}')::uuid <> v_sa
     or v #>> '{suscripciones,0,endpoint}' <> 'https://fcm.googleapis.com/fcm/send/d4a' or v #> '{suscripciones,0,claves}' <> '{"p256dh": "x", "auth": "y"}'::jsonb then
    raise exception 'las suscripciones no son sólo las válidas de A: %', v -> 'suscripciones'; end if;
  if pg_temp.pd_abrir(v_pase) is not null then raise exception 'el pase abrió dos veces'; end if;
  if pg_temp.pd_abrir(gen_random_uuid()) is not null then raise exception 'un pase inventado abrió'; end if;

  -- Un pase de hace 11 minutos ya no vale.
  perform pg_temp.pd_avisar(a);
  select pp.pase into v_viejo from public.push_pases pp where pp.usado_en is null;
  update public.push_pases set creado_en = now() - interval '11 minutes' where pase = v_viejo;
  if pg_temp.pd_abrir(v_viejo) is not null then raise exception 'un pase de hace 11 minutos abrió'; end if;
end $$;
rollback;

-- @test push: push_resultado anota enviada, fallo y caducada, ignora lo ajeno y vale una vez por pase (D5)
begin;
do $$
declare a uuid := pg_temp.pd_persona('asesor'); b uuid := pg_temp.pd_persona('asesor');
  s1 uuid; s2 uuid; s3 uuid; sb uuid; v_pase uuid; v_otro uuid; v jsonb;
begin
  perform pg_temp.pd_encender();
  s1 := pg_temp.pd_suscripcion(a, 'https://fcm.googleapis.com/fcm/send/d5-1');
  s2 := pg_temp.pd_suscripcion(a, 'https://fcm.googleapis.com/fcm/send/d5-2');
  s3 := pg_temp.pd_suscripcion(a, 'https://fcm.googleapis.com/fcm/send/d5-3');
  sb := pg_temp.pd_suscripcion(b, 'https://fcm.googleapis.com/fcm/send/d5-b');
  update public.suscripciones_push set fallos = 2 where id in (s1, s2, sb);
  perform pg_temp.pd_avisar(a);
  select pp.pase into v_pase from public.push_pases pp where pp.usado_en is null;

  -- Sin abrir no vale.
  if pg_temp.pd_resultado(v_pase, jsonb_build_array(jsonb_build_object('id', s1, 'estado', 'enviada'))) is not null then raise exception 'un pase sin abrir anotó'; end if;
  perform pg_temp.pd_abrir(v_pase);
  v := pg_temp.pd_resultado(v_pase, jsonb_build_array(
    jsonb_build_object('id', s1, 'estado', 'enviada'), jsonb_build_object('id', s2, 'estado', 'fallo'),
    jsonb_build_object('id', s3, 'estado', 'caducada'), jsonb_build_object('id', sb, 'estado', 'caducada')));
  if v <> '{"enviadas": 1, "fallos": 1, "caducadas": 1}'::jsonb then raise exception 'el resultado no cuenta bien: %', v; end if;
  if not exists (select 1 from public.suscripciones_push where id = s1 and fallos = 0 and ultimo_envio_en is not null) then raise exception 'enviada no anotó'; end if;
  if (select fallos from public.suscripciones_push where id = s2) <> 3 then raise exception 'fallo no sumó'; end if;
  if exists (select 1 from public.suscripciones_push where id = s3) then raise exception 'caducada no borró'; end if;
  if not exists (select 1 from public.suscripciones_push where id = sb and fallos = 2) then raise exception 'tocó la suscripción de B'; end if;
  if pg_temp.pd_resultado(v_pase, jsonb_build_array(jsonb_build_object('id', s2, 'estado', 'fallo'))) is not null then raise exception 'el resultado valió dos veces'; end if;
  if (select fallos from public.suscripciones_push where id = s2) <> 3 then raise exception 'la segunda llamada sumó'; end if;

  -- Forma: un estado desconocido da 22023.
  perform pg_temp.pd_avisar(a);
  select pp.pase into v_otro from public.push_pases pp where pp.usado_en is null;
  perform pg_temp.pd_abrir(v_otro);
  begin
    perform pg_temp.pd_resultado(v_otro, jsonb_build_array(jsonb_build_object('id', s1, 'estado', 'otra')));
    raise exception 'un estado desconocido no dio error';
  exception when invalid_parameter_value then null;
  end;
end $$;
rollback;

-- @test push: privilegios del pase y de las funciones, la preferencia es un objeto y borrar la notificación se lleva su pase (D6)
begin;
do $$
declare a uuid := pg_temp.pd_persona('asesor'); r jsonb; f text; v_id bigint;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.push_pases'::regclass) then raise exception 'push_pases sin RLS'; end if;
  if has_table_privilege('authenticated', 'public.push_pases', 'select,insert,update,delete') or has_table_privilege('anon', 'public.push_pases', 'select,insert,update,delete') then
    raise exception 'authenticated o anon tocan push_pases'; end if;
  foreach f in array array['public.push_abrir(uuid)', 'public.push_resultado(uuid, jsonb)', 'public.push_disparar()'] loop
    if has_function_privilege('authenticated', f, 'execute') or has_function_privilege('anon', f, 'execute') then raise exception '% lo ejecuta authenticated o anon', f; end if;
  end loop;
  foreach f in array array['public.push_disparar()', 'public._push_host_permitido(text)', 'public._push_endpoint_valido(text)', 'public._push_tope_por_persona()'] loop
    if has_function_privilege('service_role', f, 'execute') then raise exception '% lo ejecuta service_role', f; end if;
  end loop;
  if not has_function_privilege('service_role', 'public.push_abrir(uuid)', 'execute') then raise exception 'service_role no abre el pase'; end if;

  begin
    insert into public.preferencias_usuario (usuario_id, clave, valor) values (a, 'notificaciones.push', 'false');
    raise exception 'la preferencia de push aceptó algo que no es un objeto';
  exception when check_violation then null;
  end;

  perform pg_temp.pd_encender();
  perform pg_temp.pd_suscripcion(a, 'https://fcm.googleapis.com/fcm/send/d6');
  perform pg_temp.pd_avisar(a);
  select id into v_id from public.notificaciones where usuario_id = a;
  if not exists (select 1 from public.push_pases where notificacion_id = v_id) then raise exception 'no hubo pase'; end if;
  r := pg_temp.pd_corre(a, format('with d as (delete from public.notificaciones where id = %s returning 1) select to_jsonb(count(*)) from d', v_id));
  if r <> '1'::jsonb then raise exception 'A no borró su notificación con pase: %', r; end if;
  if exists (select 1 from public.push_pases where notificacion_id = v_id) then raise exception 'el pase quedó'; end if;
end $$;
rollback;
