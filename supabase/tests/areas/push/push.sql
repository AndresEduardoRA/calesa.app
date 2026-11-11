-- Push web, suscribir (paso 7.03-1): las suscripciones se escriben sólo por push_suscribir / push_desuscribir, con el permiso
-- `notificaciones.push` y un endpoint de un servicio de push. No depende de otro archivo (`SOLO=areas/push/push.sql`): cada bloque abre su
-- transacción y la revierte.
--
-- Qué asegura:
--   S1. Sin el permiso no suscribe (42501, sin fila); con el rol asesor sí, y las claves guardadas son sólo {p256dh, auth}.
--   S2. B no ve ni borra las de A (ni directo ni por push_desuscribir); A desuscribe la suya; sin el permiso se desuscribe igual.
--   S3. Endpoints fuera de la lista (http, usuario, puerto, `\`, `;`, espacios, sufijo falso, muy largo) y claves malas dan 22023 con su hint.
--       (`\`, `;` y espacios pegados al host ya los corta la expresión del host; la guarda de esos caracteres es la segunda defensa.)
--   S4. Escritura directa: insert y update como authenticated dan 42501; ni authenticated ni anon tienen esos privilegios.
--   S5. Un endpoint de A suscrito por B pasa a B (una fila, fallos en 0); once suscripciones de A dejan 10 y se va la más vieja.

create or replace function pg_temp.ps_persona(p_rol text default null) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  if p_rol is not null then
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select v_id, id, true from public.roles where clave = p_rol;
  end if;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.ps_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', v_h);
  end;
  reset role;
  return v;
end $f$;

create or replace function pg_temp.ps_claves() returns jsonb language sql as $f$
  select jsonb_build_object('p256dh', repeat('B', 86) || 'A', 'auth', 'abcdefghijklmnopqrstuv');
$f$;

-- El SQL que suscribe ese endpoint (con las claves de prueba, o las dadas).
create or replace function pg_temp.ps_suscribir(p_endpoint text, p_claves jsonb default null) returns text language sql as $f$
  select format('select to_jsonb(public.push_suscribir(%L, %L::jsonb, %L))', p_endpoint, coalesce(p_claves, pg_temp.ps_claves()), 'Prueba/1.0');
$f$;

-- @test push: sin notificaciones.push no suscribe; con el rol asesor sí, y sólo se guardan p256dh y auth (S1)
begin;
do $$
declare primera uuid := pg_temp.ps_persona(); -- con SOLO=, la primera cuenta del bloque nace dueña
  sin uuid := pg_temp.ps_persona(); a uuid := pg_temp.ps_persona('asesor'); r jsonb; v_c jsonb;
begin
  r := pg_temp.ps_corre(sin, pg_temp.ps_suscribir('https://fcm.googleapis.com/fcm/send/sin'));
  if r ->> 'error' is distinct from '42501' then raise exception 'sin el permiso no da 42501: %', r; end if;
  if exists (select 1 from public.suscripciones_push where usuario_id = sin) then raise exception 'sin el permiso quedó una fila'; end if;

  r := pg_temp.ps_corre(a, pg_temp.ps_suscribir('https://fcm.googleapis.com/fcm/send/a1', pg_temp.ps_claves() || '{"extra": "x"}'));
  if r ? 'error' or jsonb_typeof(r) <> 'string' then raise exception 'con el permiso no suscribe: %', r; end if;
  select claves into v_c from public.suscripciones_push where id = (r #>> '{}')::uuid and usuario_id = a;
  if v_c is null then raise exception 'la fila no es de A'; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(v_c) k) <> array['auth', 'p256dh'] then raise exception 'claves guardadas de más: %', v_c; end if;
  if (select user_agent from public.suscripciones_push where usuario_id = a) is distinct from 'Prueba/1.0' then raise exception 'no guardó el user agent'; end if;
end $$;
rollback;

-- @test push: B no ve ni borra las de A; A desuscribe la suya; sin el permiso también se desuscribe (S2)
begin;
do $$
declare a uuid := pg_temp.ps_persona('asesor'); b uuid := pg_temp.ps_persona('asesor'); c uuid := pg_temp.ps_persona('asesor'); r jsonb;
  v_ea constant text := 'https://fcm.googleapis.com/fcm/send/de-a';
  v_ec constant text := 'https://web.push.apple.com/de-c';
begin
  perform pg_temp.ps_corre(a, pg_temp.ps_suscribir(v_ea));
  r := pg_temp.ps_corre(b, 'select to_jsonb(count(*)) from public.suscripciones_push');
  if r <> '0'::jsonb then raise exception 'B ve las de A: %', r; end if;
  r := pg_temp.ps_corre(b, 'with d as (delete from public.suscripciones_push returning 1) select to_jsonb(count(*)) from d');
  if r <> '0'::jsonb then raise exception 'B borró directo las de A: %', r; end if;
  r := pg_temp.ps_corre(b, format('select to_jsonb(public.push_desuscribir(%L))', v_ea));
  if r <> 'false'::jsonb then raise exception 'push_desuscribir de B sobre la de A no da false: %', r; end if;
  if not exists (select 1 from public.suscripciones_push where endpoint = v_ea and usuario_id = a) then raise exception 'la de A desapareció'; end if;
  r := pg_temp.ps_corre(a, 'select to_jsonb(count(*)) from public.suscripciones_push');
  if r <> '1'::jsonb then raise exception 'A no ve la suya: %', r; end if;
  r := pg_temp.ps_corre(a, format('select to_jsonb(public.push_desuscribir(%L))', v_ea));
  if r <> 'true'::jsonb then raise exception 'A no desuscribe la suya: %', r; end if;
  if exists (select 1 from public.suscripciones_push where endpoint = v_ea) then raise exception 'la de A sigue'; end if;

  -- C pierde el rol: igual quita la suya.
  perform pg_temp.ps_corre(c, pg_temp.ps_suscribir(v_ec));
  delete from public.usuarios_roles where usuario_id = c;
  r := pg_temp.ps_corre(c, format('select to_jsonb(public.push_desuscribir(%L))', v_ec));
  if r <> 'true'::jsonb then raise exception 'sin el permiso no desuscribe la suya: %', r; end if;
end $$;
rollback;

-- @test push: endpoints fuera de la lista y claves malas dan 22023 con su hint; los servicios conocidos pasan (S3)
begin;
do $$
declare a uuid := pg_temp.ps_persona('asesor'); r jsonb; e text; v_k jsonb;
begin
  foreach e in array array[
    'http://fcm.googleapis.com/x', 'https://ejemplo.com/x', 'https://fcm.googleapis.com.ejemplo.com/x', 'https://u@fcm.googleapis.com/x',
    'https://fcm.googleapis.com:8443/x', 'https://xnotify.windows.com/x', 'https://evil.com\.push.apple.com/x', 'https://evil.com;.push.apple.com/x',
    'https://evil.com' || chr(9) || '.push.apple.com/x', 'https://fcm.googleapis.com /x', 'https://' || chr(10) || 'fcm.googleapis.com/x',
    'https://fcm.googleapis.com/' || repeat('x', 2049 - length('https://fcm.googleapis.com/')), 'https://notify.windows.com/x'] loop
    r := pg_temp.ps_corre(a, pg_temp.ps_suscribir(e));
    if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'endpoint' then raise exception 'el endpoint «%» no da 22023 endpoint: %', e, r; end if;
  end loop;
  r := pg_temp.ps_corre(a, format('select to_jsonb(public.push_suscribir(null, %L::jsonb))', pg_temp.ps_claves()));
  if r ->> 'hint' is distinct from 'endpoint' then raise exception 'un endpoint nulo no da hint endpoint: %', r; end if;

  foreach v_k in array array[
    jsonb_build_object('p256dh', repeat('B', 87)), jsonb_build_object('p256dh', repeat('B', 87), 'auth', 12345678901234567890),
    jsonb_build_object('p256dh', repeat('B', 87), 'auth', 'abc+/defghijklmnopqrs'), jsonb_build_object('p256dh', 'corta', 'auth', 'abcdefghijklmnopqrstuv'),
    '[]'::jsonb, '"x"'::jsonb] loop
    r := pg_temp.ps_corre(a, pg_temp.ps_suscribir('https://fcm.googleapis.com/fcm/send/k', v_k));
    if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'claves' then raise exception 'las claves % no dan 22023 claves: %', v_k, r; end if;
  end loop;
  if exists (select 1 from public.suscripciones_push where usuario_id = a) then raise exception 'algo malo entró'; end if;

  foreach e in array array['https://fcm.googleapis.com/fcm/send/ok', 'https://web.push.apple.com/ok', 'https://updates.push.services.mozilla.com/wpush/v2/ok',
    'https://wns2-x.notify.windows.com/w/?token=ok', 'https://api.push.apple.com/ok', 'https://FCM.googleapis.com/fcm/send/mayus'] loop
    r := pg_temp.ps_corre(a, pg_temp.ps_suscribir(e));
    if r ? 'error' then raise exception 'el endpoint «%» de un servicio de push no pasa: %', e, r; end if;
  end loop;
end $$;
rollback;

-- @test push: sin escritura directa en suscripciones_push: insert y update dan 42501 (S4)
begin;
do $$
declare a uuid := pg_temp.ps_persona('asesor'); r jsonb;
begin
  if has_table_privilege('authenticated', 'public.suscripciones_push', 'insert') then raise exception 'authenticated puede insertar'; end if;
  if has_table_privilege('authenticated', 'public.suscripciones_push', 'update') then raise exception 'authenticated puede editar'; end if;
  if has_table_privilege('anon', 'public.suscripciones_push', 'select,insert,update,delete') then raise exception 'anon tiene algo'; end if;
  if has_function_privilege('anon', 'public.push_suscribir(text, jsonb, text)', 'execute') then raise exception 'anon ejecuta push_suscribir'; end if;
  if has_function_privilege('authenticated', 'public._push_host_permitido(text)', 'execute') then raise exception 'authenticated ejecuta _push_host_permitido'; end if;
  r := pg_temp.ps_corre(a, format($s$insert into public.suscripciones_push (usuario_id, endpoint, claves) values (%L, 'https://ejemplo.com/x', '{}') returning to_jsonb(id)$s$, a));
  if r ->> 'error' is distinct from '42501' then raise exception 'el insert directo no da 42501: %', r; end if;
  perform pg_temp.ps_corre(a, pg_temp.ps_suscribir('https://fcm.googleapis.com/fcm/send/directo'));
  r := pg_temp.ps_corre(a, $s$update public.suscripciones_push set endpoint = 'https://ejemplo.com/x' returning to_jsonb(id)$s$);
  if r ->> 'error' is distinct from '42501' then raise exception 'el update directo no da 42501: %', r; end if;
  if exists (select 1 from public.suscripciones_push where endpoint = 'https://ejemplo.com/x') then raise exception 'entró un endpoint libre'; end if;
end $$;
rollback;

-- @test push: un endpoint pasa a quien suscribe; el tope de 10 por persona borra la más vieja (S5)
begin;
do $$
declare a uuid := pg_temp.ps_persona('asesor'); b uuid := pg_temp.ps_persona('asesor'); r jsonb; i int;
  v_e constant text := 'https://fcm.googleapis.com/fcm/send/compartido';
begin
  perform pg_temp.ps_corre(a, pg_temp.ps_suscribir(v_e));
  update public.suscripciones_push set fallos = 3, ultimo_envio_en = now() where endpoint = v_e;
  r := pg_temp.ps_corre(b, pg_temp.ps_suscribir(v_e));
  if r ? 'error' then raise exception 'B no suscribe el endpoint de A: %', r; end if;
  if (select count(*) from public.suscripciones_push where endpoint = v_e) <> 1 then raise exception 'el endpoint quedó repetido'; end if;
  if not exists (select 1 from public.suscripciones_push where endpoint = v_e and usuario_id = b and fallos = 0 and ultimo_envio_en is null) then
    raise exception 'el endpoint no pasó a B limpio'; end if;

  for i in 1..11 loop
    r := pg_temp.ps_corre(a, pg_temp.ps_suscribir('https://fcm.googleapis.com/fcm/send/a' || i));
    if r ? 'error' then raise exception 'la suscripción % falló: %', i, r; end if;
  end loop;
  if (select count(*) from public.suscripciones_push where usuario_id = a) <> 10 then raise exception 'el tope no dejó 10'; end if;
  if exists (select 1 from public.suscripciones_push where endpoint = 'https://fcm.googleapis.com/fcm/send/a1') then raise exception 'no se fue la más vieja'; end if;
  if not exists (select 1 from public.suscripciones_push where endpoint = 'https://fcm.googleapis.com/fcm/send/a11') then raise exception 'se fue la nueva'; end if;
  if (select count(*) from public.suscripciones_push where usuario_id = b) <> 1 then raise exception 'el tope de A tocó las de B'; end if;
end $$;
rollback;
