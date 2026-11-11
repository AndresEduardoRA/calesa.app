-- El canal global (paso 7.08-1, C4, C5 y C11): existe uno, entrar pide chat.global y perderlo corta la lectura.
-- No depende de otro archivo (`SOLO=areas/chat/global.sql`). Cada bloque abre su transacción y la revierte. Prefijo `chgl_`.

-- Una persona activa con un rol propio y estas concesiones (alcance «todos»). La primera cuenta de una base vacía queda dueña: se la lleva una aparte.
create or replace function pg_temp.chgl_persona(p_concesiones text[] default '{}') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'chgl_duena-' || v_id || '@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('chgl_' || substr(v_id::text, 1, 8), 'CHGL ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.chgl_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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
create or replace function pg_temp.chgl_conversacion(p_miembros uuid[], p_nombre text default 'CHGL grupo') returns uuid language plpgsql as $f$
declare v uuid; u uuid;
begin
  insert into public.conversaciones (tipo, nombre, creado_por) values (case when p_nombre is null then 'directa' else 'grupo' end::public.tipo_conversacion, p_nombre, p_miembros[1])
  returning id into v;
  foreach u in array p_miembros loop insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (v, u); end loop;
  return v;
end $f$;

-- Cuántas filas de esa consulta ve la persona.
create or replace function pg_temp.chgl_cuenta(p_quien uuid, p_sql text) returns jsonb language sql as $f$
  select pg_temp.chgl_corre(p_quien, format('select to_jsonb(count(*)) from (%s) x', p_sql));
$f$;

-- @test chat: hay exactamente un canal global después de las migraciones y el seed (G1, C4)
begin;
do $$
declare n int;
begin
  select count(*) into n from public.conversaciones where es_global;
  if n <> 1 then raise exception 'hay % canales globales', n; end if;
  if (select tipo from public.conversaciones where es_global) <> 'grupo' then raise exception 'el canal global no es un grupo'; end if;
end $$;
rollback;

-- @test chat: sin chat.global no se lee el canal, sus miembros, sus mensajes, sus menciones ni sus tareas, y no se escribe (G3, C5)
begin;
do $$
declare
  yo uuid := pg_temp.chgl_persona(array['chat.participar', 'chat.global', 'agenda.tareas.recibir']);
  otra uuid := pg_temp.chgl_persona(array['chat.participar', 'chat.global', 'agenda.tareas.asignar', 'agenda.tareas.recibir']);
  resp uuid := pg_temp.chgl_persona(array['chat.participar', 'chat.global', 'agenda.tareas.recibir']);
  g uuid; msj uuid; t uuid; r jsonb; v timestamptz;
begin
  select id into g from public.conversaciones where es_global;
  insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (g, yo), (g, otra), (g, resp);
  insert into public.mensajes (conversacion_id, autor_id, cuerpo) values (g, otra, 'hola equipo') returning id into msj;
  insert into public.mensajes_menciones (mensaje_id, tipo, referencia_id) values (msj, 'usuario', yo);
  insert into public.tareas (titulo, creado_por, responsable_id, conversacion_id) values ('CHGL tarea', otra, resp, g) returning id, actualizado_en into t, v;

  if pg_temp.chgl_cuenta(yo, format('select 1 from public.conversaciones where id = %L', g)) <> '1' then raise exception 'con chat.global no leyó el canal'; end if;
  if pg_temp.chgl_cuenta(yo, format('select 1 from public.conversaciones_miembros where conversacion_id = %L', g))::int < 3 then raise exception 'con chat.global no leyó los miembros'; end if;
  if pg_temp.chgl_cuenta(yo, format('select 1 from public.mensajes where id = %L', msj)) <> '1' then raise exception 'con chat.global no leyó el mensaje'; end if;
  if pg_temp.chgl_cuenta(yo, format('select 1 from public.mensajes_menciones where mensaje_id = %L', msj)) <> '1' then raise exception 'con chat.global no leyó la mención'; end if;
  if pg_temp.chgl_cuenta(yo, format('select 1 from public.tareas where id = %L', t)) <> '1' then raise exception 'con chat.global no leyó la tarea del canal'; end if;

  delete from public.roles_permisos rp using public.usuarios_roles ur where ur.usuario_id = yo and rp.rol_id = ur.rol_id and rp.permiso_clave = 'chat.global';

  if pg_temp.chgl_cuenta(yo, format('select 1 from public.conversaciones where id = %L', g)) <> '0' then raise exception 'sin chat.global leyó el canal'; end if;
  if pg_temp.chgl_cuenta(yo, format('select 1 from public.conversaciones_miembros where conversacion_id = %L', g)) <> '0' then raise exception 'sin chat.global leyó los miembros'; end if;
  if pg_temp.chgl_cuenta(yo, format('select 1 from public.mensajes where id = %L', msj)) <> '0' then raise exception 'sin chat.global leyó el mensaje'; end if;
  if pg_temp.chgl_cuenta(yo, format('select 1 from public.mensajes_menciones where mensaje_id = %L', msj)) <> '0' then raise exception 'sin chat.global leyó la mención'; end if;
  if pg_temp.chgl_cuenta(yo, format('select 1 from public.tareas where id = %L', t)) <> '0' then raise exception 'sin chat.global leyó la tarea del canal'; end if;
  r := pg_temp.chgl_corre(yo, format('select public.tarea_guardar(%L, %L, %L)', t, v, '{"titulo": "otra"}'));
  if r ->> 'error' is distinct from '42501' then raise exception 'sin chat.global tocó la tarea del canal: %', r; end if;
  r := pg_temp.chgl_corre(yo, format('insert into public.mensajes (conversacion_id, autor_id, cuerpo) values (%L, %L, %L) returning to_jsonb(id)', g, yo, 'sigo aquí'));
  if r ->> 'error' is distinct from '42501' then raise exception 'sin chat.global escribió en el canal: %', r; end if;
  -- La otra persona, que conserva el permiso, sigue leyendo.
  if pg_temp.chgl_cuenta(otra, format('select 1 from public.mensajes where id = %L', msj)) <> '1' then raise exception 'quien tiene chat.global dejó de leer'; end if;
end $$;
rollback;
