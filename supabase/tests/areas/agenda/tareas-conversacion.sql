-- La conversación de una tarea (paso 7.06-1, D3 y D4): la leen sus miembros; crear y reasignar sólo entre miembros. Partido de `tareas.sql` por largo.
-- No depende de otro archivo (`SOLO=areas/agenda/tareas-conversacion.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   T6. Sus miembros la leen y quien no es miembro, no; crear en una ajena da 42501; responsable y reasignado, miembros.

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

-- Una tarea armada como dueño de la tabla (terreno de la prueba), sin sesión.
create or replace function pg_temp.ag_tarea(p_creador uuid, p_responsable uuid, p_conversacion uuid default null) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.tareas (titulo, creado_por, responsable_id, conversacion_id) values ('AG tarea', p_creador, p_responsable, p_conversacion) returning id into v;
  return v;
end $f$;

-- Una conversación de grupo con estos miembros.
create or replace function pg_temp.ag_conversacion(p_miembros uuid[]) returns uuid language plpgsql as $f$
declare v uuid; u uuid;
begin
  insert into public.conversaciones (tipo, nombre, creado_por) values ('grupo', 'AG grupo', p_miembros[1]) returning id into v;
  foreach u in array p_miembros loop insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (v, u); end loop;
  return v;
end $f$;

-- Llama a una RPC de tareas como esa persona.
create or replace function pg_temp.ag_tcrear(p_quien uuid, p_id uuid, p_datos jsonb, p_conv uuid default null) returns jsonb language sql as $f$
  select pg_temp.ag_corre(p_quien, format('select public.tarea_crear(%L, %L, %L)', p_id, p_datos, p_conv));
$f$;
create or replace function pg_temp.ag_reasignar(p_quien uuid, p_t uuid, p_v timestamptz, p_resp uuid) returns jsonb language sql as $f$
  select pg_temp.ag_corre(p_quien, format('select public.reasignar_tarea(%L, %L, %L)', p_t, p_v, p_resp));
$f$;
-- La versión de una tarea.
create or replace function pg_temp.ag_v(p_t uuid) returns timestamptz language sql as $f$ select actualizado_en from public.tareas where id = p_t $f$;
-- Avisos tarea_asignada de esa persona por esa tarea: [abiertos, accionados].

-- @test agenda: la tarea nacida en una conversación la leen sus miembros y no quien está afuera (T6, lectura)
begin;
do $$
declare
  creador uuid := pg_temp.ag_persona(array['agenda.tareas.asignar', 'agenda.tareas.recibir']);
  resp uuid := pg_temp.ag_persona(array['agenda.tareas.recibir']);
  miembro uuid := pg_temp.ag_persona(); afuera uuid := pg_temp.ag_persona(); conv uuid; t uuid; t_suelta uuid; r jsonb;
  leer constant text := 'select to_jsonb(count(*)) from public.tareas where id = %L';
begin
  conv := pg_temp.ag_conversacion(array[creador, resp, miembro]);
  t := pg_temp.ag_tarea(creador, resp, conv);
  t_suelta := pg_temp.ag_tarea(creador, resp);
  r := pg_temp.ag_corre(miembro, format(leer, t));
  if r <> '1'::jsonb then raise exception 'un miembro de la conversación no leyó su tarea: %', r; end if;
  r := pg_temp.ag_corre(afuera, format(leer, t));
  if r <> '0'::jsonb then raise exception 'alguien fuera de la conversación leyó la tarea: %', r; end if;
  r := pg_temp.ag_corre(miembro, format(leer, t_suelta));
  if r <> '0'::jsonb then raise exception 'un miembro leyó una tarea suelta que no es suya: %', r; end if;
  r := pg_temp.ag_corre(resp, format(leer, t));
  if r <> '1'::jsonb then raise exception 'el responsable no leyó su tarea: %', r; end if;
end $$;
rollback;

-- @test agenda: la conversación de la tarea: crear con una ajena da 42501; el responsable y el reasignado tienen que ser miembros (T6, escritura)
begin;
do $$
declare
  jefe uuid := pg_temp.ag_persona(array['agenda.tareas.asignar']); otra uuid := pg_temp.ag_persona(array['agenda.tareas.recibir']);
  fuera uuid := pg_temp.ag_persona(array['agenda.tareas.recibir']); miembro uuid := pg_temp.ag_persona(); conv uuid; ajena uuid; t uuid := gen_random_uuid(); r jsonb;
begin
  conv := pg_temp.ag_conversacion(array[jefe, otra, miembro]);
  ajena := pg_temp.ag_conversacion(array[otra, fuera]);
  r := pg_temp.ag_tcrear(jefe, gen_random_uuid(), jsonb_build_object('titulo', 'Chat', 'responsable_id', otra), ajena);
  if r ->> 'error' is distinct from '42501' or r ->> 'hint' is distinct from 'conversacion_id' then raise exception 'crear en una conversación ajena no dio 42501: %', r; end if;
  r := pg_temp.ag_tcrear(jefe, gen_random_uuid(), jsonb_build_object('titulo', 'Chat', 'responsable_id', fuera), conv);
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'responsable_id' then raise exception 'un responsable fuera de la conversación no dio 23514: %', r; end if;
  r := pg_temp.ag_tcrear(jefe, t, jsonb_build_object('titulo', 'Chat', 'responsable_id', otra), conv);
  if r ->> 'resultado' is distinct from 'creado' or (select conversacion_id from public.tareas where id = t) is distinct from conv then raise exception 'la tarea del chat no guardó su conversación: %', r; end if;
  r := pg_temp.ag_corre(miembro, format('select to_jsonb(count(*)) from public.tareas where id = %L', t));
  if r <> '1'::jsonb then raise exception 'un miembro no leyó la tarea creada en su conversación: %', r; end if;
  r := pg_temp.ag_reasignar(jefe, t, pg_temp.ag_v(t), fuera);
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'responsable_id' then raise exception 'reasignar fuera de la conversación no dio 23514: %', r; end if;
end $$;
rollback;
