-- Tareas en el canal global: la fila de `conversaciones_miembros` no basta, el responsable tiene que conservar `chat.global`
-- (`_chat_miembro_vigente`), como en `mensaje_tarea_crear`. No depende de otro archivo (`SOLO=areas/agenda/tareas-canal-global.sql`).
-- Cada bloque abre su transacción y la revierte. Prefijo `agcg_`; los nombres llevan «Qgxv», que no está en lo sembrado.
--
-- Qué asegura:
--   G1. `tarea_crear` en el canal global con un responsable que perdió `chat.global` da 23514 hint `responsable_id`; con el permiso, crea.
--   G2. `agenda_quienes_reciben` con el canal global no ofrece a quien perdió `chat.global`.
--   G3. `reasignar_tarea` de una tarea del canal global a quien perdió `chat.global` da 23514 hint `responsable_id`; con el permiso, reasigna.

-- Una persona activa con un rol propio y estas concesiones (alcance «todos»). La primera cuenta de una base vacía queda dueña: se la lleva una aparte.
create or replace function pg_temp.agcg_persona(p_nombre text, p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'agcg-duena-' || v_id || '@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('agcg_' || substr(v_id::text, 1, 8), 'AGCG ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  update public.perfiles set nombre = p_nombre where id = v_id;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.agcg_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- Quita `chat.global` a esa persona y deja su fila en el canal.
create or replace function pg_temp.agcg_sin_global(p_quien uuid) returns void language sql as $f$
  delete from public.roles_permisos rp using public.usuarios_roles ur
   where ur.usuario_id = p_quien and rp.rol_id = ur.rol_id and rp.permiso_clave = 'chat.global';
$f$;

-- @test agenda: tarea en el canal global: un responsable sin chat.global da 23514 aunque siga su fila (G1)
begin;
do $$
declare
  jefe uuid := pg_temp.agcg_persona('Qgxv Jefe', array['chat.participar', 'chat.global', 'agenda.tareas.asignar', 'agenda.tareas.recibir']);
  sigue uuid := pg_temp.agcg_persona('Qgxv Sigue', array['chat.participar', 'chat.global', 'agenda.tareas.recibir']);
  perdio uuid := pg_temp.agcg_persona('Qgxv Perdio', array['chat.participar', 'chat.global', 'agenda.tareas.recibir']);
  g uuid; t uuid := gen_random_uuid(); r jsonb;
begin
  select id into g from public.conversaciones where es_global;
  insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (g, jefe), (g, sigue), (g, perdio);
  perform pg_temp.agcg_sin_global(perdio);
  r := pg_temp.agcg_corre(jefe, format('select public.tarea_crear(%L, %L, %L)', gen_random_uuid(), jsonb_build_object('titulo', 'Canal', 'responsable_id', perdio), g));
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'responsable_id' then
    raise exception 'un responsable sin chat.global en el canal global no dio 23514: %', r; end if;
  r := pg_temp.agcg_corre(jefe, format('select public.tarea_crear(%L, %L, %L)', t, jsonb_build_object('titulo', 'Canal', 'responsable_id', sigue), g));
  if r ->> 'resultado' is distinct from 'creado' or (select conversacion_id from public.tareas where id = t) is distinct from g then
    raise exception 'con chat.global no creó la tarea del canal: %', r; end if;
end $$;
rollback;

-- @test agenda: quién recibe en el canal global no ofrece a quien perdió chat.global (G2)
begin;
do $$
declare
  jefe uuid := pg_temp.agcg_persona('Qgxv Jefe', array['chat.participar', 'chat.global', 'agenda.tareas.asignar']);
  sigue uuid := pg_temp.agcg_persona('Qgxv Sigue', array['chat.participar', 'chat.global', 'agenda.tareas.recibir']);
  perdio uuid := pg_temp.agcg_persona('Qgxv Perdio', array['chat.participar', 'chat.global', 'agenda.tareas.recibir']);
  g uuid; r jsonb;
begin
  select id into g from public.conversaciones where es_global;
  insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (g, jefe), (g, sigue), (g, perdio);
  perform pg_temp.agcg_sin_global(perdio);
  r := pg_temp.agcg_corre(jefe, format('select public.agenda_quienes_reciben(%L, %L::uuid)', 'qgxv', g));
  if (select coalesce(array_agg((e ->> 'id')::uuid), '{}') from jsonb_array_elements(r -> 'personas') e) is distinct from array[sigue] then
    raise exception 'quién recibe en el canal global dio %', r; end if;
end $$;
rollback;

-- @test agenda: reasignar una tarea del canal global a quien perdió chat.global da 23514 (G3)
begin;
do $$
declare
  jefe uuid := pg_temp.agcg_persona('Qgxv Jefe', array['chat.participar', 'chat.global', 'agenda.tareas.asignar', 'agenda.tareas.recibir']);
  sigue uuid := pg_temp.agcg_persona('Qgxv Sigue', array['chat.participar', 'chat.global', 'agenda.tareas.recibir']);
  perdio uuid := pg_temp.agcg_persona('Qgxv Perdio', array['chat.participar', 'chat.global', 'agenda.tareas.recibir']);
  g uuid; t uuid; r jsonb;
begin
  select id into g from public.conversaciones where es_global;
  insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (g, jefe), (g, sigue), (g, perdio);
  insert into public.tareas (titulo, creado_por, responsable_id, conversacion_id) values ('Qgxv tarea', jefe, jefe, g) returning id into t;
  perform pg_temp.agcg_sin_global(perdio);
  r := pg_temp.agcg_corre(jefe, format('select public.reasignar_tarea(%L, %L, %L)', t, (select actualizado_en from public.tareas where id = t), perdio));
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'responsable_id' then
    raise exception 'reasignar a quien perdió chat.global en el canal global no dio 23514: %', r; end if;
  r := pg_temp.agcg_corre(jefe, format('select public.reasignar_tarea(%L, %L, %L)', t, (select actualizado_en from public.tareas where id = t), sigue));
  if r ->> 'resultado' is distinct from 'reasignada' or (select responsable_id from public.tareas where id = t) is distinct from sigue then
    raise exception 'con chat.global no reasignó la tarea del canal: %', r; end if;
end $$;
rollback;
