-- Membresía del chat (paso 7.08-1, C3, C5, C12 y C13): sólo los miembros leen, nadie escribe directo, leer y silenciar por RPC.
-- No depende de otro archivo (`SOLO=areas/chat/membresia.sql`). Cada bloque abre su transacción y la revierte. Prefijo `chm_`.

-- Una persona activa con un rol propio y estas concesiones (alcance «todos»). La primera cuenta de una base vacía queda dueña: se la lleva una aparte.
create or replace function pg_temp.chm_persona(p_concesiones text[] default '{}') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'chm_duena-' || v_id || '@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('chm_' || substr(v_id::text, 1, 8), 'CHM ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.chm_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- Una conversación armada como dueño de la tabla (terreno de la prueba): grupo si trae nombre, si no directa.
create or replace function pg_temp.chm_conversacion(p_miembros uuid[], p_nombre text default 'CHM grupo') returns uuid language plpgsql as $f$
declare v uuid; u uuid;
begin
  insert into public.conversaciones (tipo, nombre, creado_por) values (case when p_nombre is null then 'directa' else 'grupo' end::public.tipo_conversacion, p_nombre, p_miembros[1])
  returning id into v;
  foreach u in array p_miembros loop insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (v, u); end loop;
  return v;
end $f$;

-- Cuántas filas de esa consulta ve la persona.
create or replace function pg_temp.chm_cuenta(p_quien uuid, p_sql text) returns jsonb language sql as $f$
  select pg_temp.chm_corre(p_quien, format('select to_jsonb(count(*)) from (%s) x', p_sql));
$f$;

-- @test chat: un mensaje insertado mueve la hora del último mensaje de su conversación y uno anterior no la retrocede (M4, C3)
begin;
do $$
declare a uuid := pg_temp.chm_persona(); b uuid := pg_temp.chm_persona(); conv uuid; otra uuid; t0 timestamptz; t1 timestamptz := now() + interval '1 minute';
begin
  conv := pg_temp.chm_conversacion(array[a, b]);
  otra := pg_temp.chm_conversacion(array[a, b]);
  select ultimo_mensaje_en into t0 from public.conversaciones where id = otra;
  insert into public.mensajes (conversacion_id, autor_id, cuerpo, creado_en) values (conv, a, 'hola', t1);
  if (select ultimo_mensaje_en from public.conversaciones where id = conv) is distinct from t1 then raise exception 'el mensaje no movió la hora de su conversación'; end if;
  if (select ultimo_mensaje_en from public.conversaciones where id = otra) is distinct from t0 then raise exception 'el mensaje movió la hora de otra conversación'; end if;
  insert into public.mensajes (conversacion_id, autor_id, cuerpo, creado_en) values (conv, b, 'viejo', now() - interval '1 hour');
  if (select ultimo_mensaje_en from public.conversaciones where id = conv) is distinct from t1 then raise exception 'un mensaje anterior retrocedió la hora'; end if;
end $$;
rollback;

-- @test chat: quien no es miembro (también la dueña, con todos los permisos del chat) no lee la conversación, sus miembros, sus mensajes ni sus menciones; un miembro sí (M1, C5)
begin;
do $$
declare a uuid := pg_temp.chm_persona(array['chat.participar']); b uuid := pg_temp.chm_persona(array['chat.participar']); afuera uuid := pg_temp.chm_persona(array['chat.participar', 'chat.global']);
  duena uuid; conv uuid; msj uuid; q text; quien uuid; esperado text;
begin
  select ur.usuario_id into duena from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id where r.clave = 'dueno' limit 1;
  if duena is null or not public.usuario_tiene_permiso(duena, 'chat.participar') or not public.usuario_tiene_permiso(duena, 'chat.global') then
    raise exception 'la prueba necesita una dueña con los permisos del chat';
  end if;
  conv := pg_temp.chm_conversacion(array[a, b]);
  insert into public.mensajes (conversacion_id, autor_id, cuerpo) values (conv, a, 'entre nosotras') returning id into msj;
  insert into public.mensajes_menciones (mensaje_id, tipo, referencia_id) values (msj, 'usuario', b);
  foreach q in array array[
    format('select 1 from public.conversaciones where id = %L', conv),
    format('select 1 from public.conversaciones_miembros where conversacion_id = %L', conv),
    format('select 1 from public.mensajes where id = %L', msj),
    format('select 1 from public.mensajes_menciones where mensaje_id = %L', msj)
  ] loop
    foreach quien in array array[duena, afuera] loop
      if pg_temp.chm_cuenta(quien, q) <> '0' then raise exception 'alguien que no es miembro leyó: %', q; end if;
    end loop;
    if pg_temp.chm_cuenta(b, q) = '0' then raise exception 'un miembro no leyó: %', q; end if;
  end loop;
end $$;
rollback;

-- @test chat: chat_leer avanza, no retrocede y se acota a la hora; chat_silenciar cambia sólo la fila propia; quien no es miembro (o perdió chat.global) 42501 (M3, C12)
begin;
do $$
declare a uuid := pg_temp.chm_persona(array['chat.participar', 'chat.global']); b uuid := pg_temp.chm_persona(array['chat.participar']); afuera uuid := pg_temp.chm_persona(array['chat.participar']);
  conv uuid; g uuid; r jsonb; t1 timestamptz := now() - interval '10 minutes';
begin
  conv := pg_temp.chm_conversacion(array[a, b]);
  r := pg_temp.chm_corre(a, format('select public.chat_leer(%L, %L)', conv, t1));
  if r ->> 'resultado' is distinct from 'leido' or (r ->> 'ultimo_leido_en')::timestamptz is distinct from t1 then raise exception 'leer no avanzó: %', r; end if;
  r := pg_temp.chm_corre(a, format('select public.chat_leer(%L, %L)', conv, t1 - interval '5 minutes'));
  if r ->> 'resultado' is distinct from 'sin_cambios' or (select ultimo_leido_en from public.conversaciones_miembros where conversacion_id = conv and usuario_id = a) is distinct from t1 then
    raise exception 'leer retrocedió: %', r;
  end if;
  r := pg_temp.chm_corre(a, format('select public.chat_leer(%L, %L)', conv, now() + interval '1 day'));
  if r ->> 'resultado' is distinct from 'leido' or (r ->> 'ultimo_leido_en')::timestamptz > clock_timestamp() then raise exception 'leer no se acotó a la hora: %', r; end if;
  if (select ultimo_leido_en from public.conversaciones_miembros where conversacion_id = conv and usuario_id = b) is not null then raise exception 'leer movió la fila de otra persona'; end if;
  r := pg_temp.chm_corre(a, format('select public.chat_leer(%L, null)', conv));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'hasta' then raise exception 'sin hasta no dio 22023: %', r; end if;

  r := pg_temp.chm_corre(a, format('select public.chat_silenciar(%L, true)', conv));
  if r ->> 'resultado' is distinct from 'guardado' then raise exception 'silenciar no guardó: %', r; end if;
  r := pg_temp.chm_corre(a, format('select public.chat_silenciar(%L, true)', conv));
  if r ->> 'resultado' is distinct from 'sin_cambios' then raise exception 'silenciar dos veces no dio sin_cambios: %', r; end if;
  if (select silenciada from public.conversaciones_miembros where conversacion_id = conv and usuario_id = b) then raise exception 'silenciar tocó la fila de otra persona'; end if;
  r := pg_temp.chm_corre(a, format('select public.chat_silenciar(%L, null)', conv));
  if r ->> 'error' is distinct from '22023' then raise exception 'silenciar con nulo no dio 22023: %', r; end if;

  r := pg_temp.chm_corre(afuera, format('select public.chat_leer(%L, now())', conv));
  if r ->> 'error' is distinct from '42501' then raise exception 'quien no es miembro marcó leída: %', r; end if;
  r := pg_temp.chm_corre(afuera, format('select public.chat_silenciar(%L, true)', conv));
  if r ->> 'error' is distinct from '42501' then raise exception 'quien no es miembro silenció: %', r; end if;

  select id into g from public.conversaciones where es_global;
  insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (g, a);
  r := pg_temp.chm_corre(a, format('select public.chat_leer(%L, now())', g));
  if r ->> 'resultado' is distinct from 'leido' then raise exception 'con chat.global no marcó leído el canal: %', r; end if;
  delete from public.roles_permisos rp using public.usuarios_roles ur where ur.usuario_id = a and rp.rol_id = ur.rol_id and rp.permiso_clave = 'chat.global';
  r := pg_temp.chm_corre(a, format('select public.chat_leer(%L, now())', g));
  if r ->> 'error' is distinct from '42501' then raise exception 'sin chat.global marcó leído el canal: %', r; end if;
end $$;
rollback;

-- @test chat: nadie escribe conversaciones ni miembros directo: insert, update y delete como authenticated dan 42501 (M2, C13)
begin;
do $$
declare a uuid := pg_temp.chm_persona(array['chat.participar', 'chat.global']); b uuid := pg_temp.chm_persona(array['chat.participar']); conv uuid; q text; r jsonb;
begin
  conv := pg_temp.chm_conversacion(array[a, b]);
  update public.conversaciones set creado_por = a where id = conv;
  foreach q in array array[
    format('insert into public.conversaciones (tipo, nombre, creado_por) values (%L, %L, %L) returning to_jsonb(id)', 'grupo', 'CHM directo', a),
    format('update public.conversaciones set nombre = %L where id = %L returning to_jsonb(id)', 'otro', conv),
    format('delete from public.conversaciones where id = %L returning to_jsonb(id)', conv),
    format('insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (%L, %L) returning to_jsonb(usuario_id)', conv, gen_random_uuid()),
    format('insert into public.conversaciones_miembros (conversacion_id, usuario_id) select id, %L from public.conversaciones where es_global returning to_jsonb(usuario_id)', b),
    format('update public.conversaciones_miembros set ultimo_leido_en = now() where conversacion_id = %L and usuario_id = %L returning to_jsonb(usuario_id)', conv, a),
    format('update public.conversaciones_miembros set silenciada = true where conversacion_id = %L and usuario_id = %L returning to_jsonb(usuario_id)', conv, a),
    format('delete from public.conversaciones_miembros where conversacion_id = %L and usuario_id = %L returning to_jsonb(usuario_id)', conv, b)
  ] loop
    r := pg_temp.chm_corre(a, q);
    if r ->> 'error' is distinct from '42501' then raise exception 'una escritura directa no dio 42501: % → %', q, r; end if;
  end loop;
  if pg_temp.chm_cuenta(a, format('select 1 from public.conversaciones_miembros where conversacion_id = %L', conv)) <> '2' then raise exception 'un miembro dejó de leer'; end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename in ('conversaciones', 'conversaciones_miembros') and cmd <> 'SELECT') then
    raise exception 'quedó una policy de escritura en conversaciones o miembros';
  end if;
end $$;
rollback;

-- @test chat: las RPC del chat son definer con search_path vacío, de authenticated y no de anon ni PUBLIC; los ayudantes no son de authenticated (M5)
begin;
do $$
declare f text; p oid;
begin
  foreach f in array array['chat_directa(uuid)', 'chat_global_entrar()', 'chat_grupo_crear(uuid,text,uuid[])', 'chat_grupo_miembros(uuid,uuid[],uuid[])',
                           'chat_salir(uuid)', 'chat_leer(uuid,timestamp with time zone)', 'chat_silenciar(uuid,boolean)'] loop
    p := ('public.' || f)::regprocedure;
    if not (select prosecdef and proconfig @> array['search_path=""'] from pg_proc where oid = p) then raise exception '% no es definer con search_path vacío', f; end if;
    if not has_function_privilege('authenticated', p, 'execute') then raise exception '% no es de authenticated', f; end if;
    if has_function_privilege('anon', p, 'execute') then raise exception '% es de anon', f; end if;
    if exists (select 1 from pg_proc, aclexplode(proacl) a where oid = p and a.grantee = 0) then raise exception '% es de PUBLIC', f; end if;
  end loop;
  foreach f in array array['_chat_puede_conversar(uuid)', '_chat_mover_ultimo_mensaje()'] loop
    p := ('public.' || f)::regprocedure;
    if has_function_privilege('authenticated', p, 'execute') or has_function_privilege('anon', p, 'execute') then raise exception '% es de authenticated o anon', f; end if;
  end loop;
  if not (select prosecdef and proconfig @> array['search_path=""'] from pg_proc where oid = 'public._chat_mover_ultimo_mensaje()'::regprocedure) then
    raise exception 'el trigger no es definer con search_path vacío';
  end if;
end $$;
rollback;
