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
