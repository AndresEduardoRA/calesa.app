-- Las tareas de la agenda (paso 7.06-1): escritura sólo por RPC, dar y recibir, editar, completar, reasignar, versión, conversación y avisos.
-- No depende de otro archivo (`SOLO=areas/agenda/tareas.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   T0 y T1 (estructura y escritura directa) están en `tareas-sin-escritura-directa.sql`.
--   T2. Crear: para sí sin permisos; para otro con agenda.tareas.asignar y a quien recibe (activo, sin bloqueo); no vence en el pasado; avisa.
--   T3. Guardar: sólo el creador; PT409; el responsable no cambia aquí; bloqueado no escribe.
--   T4. Completar y reabrir: creador o responsable; acciona el aviso; PT409; un tercero no la encuentra.
--   T5. Reasignar: el creador con asignar, a quien recibe; PT409; avisa al nuevo y acciona al anterior; la firma vieja no existe.
--   T6 (la conversación de la tarea) está en `tareas-conversacion.sql`.
--   T7. Eliminar: sólo el creador, con versión; deja de leerse y acciona el aviso.
--   T8. Catálogo: definer, search_path vacío, execute de authenticated; los ayudantes, no.

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

-- Llama a una RPC de tareas como esa persona.
create or replace function pg_temp.ag_tcrear(p_quien uuid, p_id uuid, p_datos jsonb, p_conv uuid default null) returns jsonb language sql as $f$
  select pg_temp.ag_corre(p_quien, format('select public.tarea_crear(%L, %L, %L)', p_id, p_datos, p_conv));
$f$;
create or replace function pg_temp.ag_tguardar(p_quien uuid, p_t uuid, p_v timestamptz, p_datos jsonb) returns jsonb language sql as $f$
  select pg_temp.ag_corre(p_quien, format('select public.tarea_guardar(%L, %L, %L)', p_t, p_v, p_datos));
$f$;
create or replace function pg_temp.ag_tcompletar(p_quien uuid, p_t uuid, p_v timestamptz, p_c boolean) returns jsonb language sql as $f$
  select pg_temp.ag_corre(p_quien, format('select public.tarea_completar(%L, %L, %L)', p_t, p_v, p_c));
$f$;
create or replace function pg_temp.ag_teliminar(p_quien uuid, p_t uuid, p_v timestamptz) returns jsonb language sql as $f$
  select pg_temp.ag_corre(p_quien, format('select public.tarea_eliminar(%L, %L)', p_t, p_v));
$f$;
create or replace function pg_temp.ag_reasignar(p_quien uuid, p_t uuid, p_v timestamptz, p_resp uuid) returns jsonb language sql as $f$
  select pg_temp.ag_corre(p_quien, format('select public.reasignar_tarea(%L, %L, %L)', p_t, p_v, p_resp));
$f$;
-- La versión de una tarea.
create or replace function pg_temp.ag_v(p_t uuid) returns timestamptz language sql as $f$ select actualizado_en from public.tareas where id = p_t $f$;
-- Avisos tarea_asignada de esa persona por esa tarea: [abiertos, accionados].
create or replace function pg_temp.ag_avisos(p_t uuid, p_u uuid) returns jsonb language sql as $f$
  select jsonb_build_array(count(*) filter (where accionada_en is null), count(*) filter (where accionada_en is not null))
    from public.notificaciones where tipo = 'tarea_asignada' and referencia_id = p_t and usuario_id = p_u;
$f$;

-- @test agenda: crear una tarea: para sí sin permisos; para otro con asignar y a quien recibe (activo y sin bloqueo); no vence en el pasado; avisa (T2)
begin;
do $$
declare
  yo uuid := pg_temp.ag_persona(); jefe uuid := pg_temp.ag_persona(array['agenda.tareas.asignar']); otra uuid := pg_temp.ag_persona(array['agenda.tareas.recibir']);
  norec uuid := pg_temp.ag_persona(); baja uuid := pg_temp.ag_persona(array['agenda.tareas.recibir']); bloq uuid := pg_temp.ag_persona(array['agenda.tareas.recibir']);
  t1 uuid := gen_random_uuid(); t2 uuid := gen_random_uuid(); r jsonb;
begin
  update public.perfiles set activo = false where id = baja;
  update public.perfiles set bloqueado = true where id = bloq;
  r := pg_temp.ag_tcrear(yo, t1, '{"titulo": "Llamar"}');
  if r ->> 'resultado' is distinct from 'creado' or (select responsable_id from public.tareas where id = t1) is distinct from yo then raise exception 'una tarea propia no se creó: %', r; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from array['actualizado_en', 'id', 'resultado'] then raise exception 'la respuesta trae más que resultado, id y versión: %', r; end if;
  if exists (select 1 from public.notificaciones where referencia_id = t1) then raise exception 'una tarea propia avisó'; end if;
  r := pg_temp.ag_tcrear(yo, t1, '{"titulo": "Llamar"}');
  if r ->> 'resultado' is distinct from 'repetido' then raise exception 'el mismo id no dio repetido: %', r; end if;
  r := pg_temp.ag_tcrear(jefe, t1, '{"titulo": "Llamar"}');
  if r ->> 'error' is distinct from '22023' then raise exception 'un id ajeno no dio 22023: %', r; end if;
  r := pg_temp.ag_tcrear(yo, gen_random_uuid(), jsonb_build_object('titulo', 'Para otra', 'responsable_id', otra));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' not like '%agenda.tareas.asignar%' then raise exception 'dar una tarea sin asignar no dio 42501: %', r; end if;
  r := pg_temp.ag_tcrear(jefe, gen_random_uuid(), jsonb_build_object('titulo', 'Para otra', 'responsable_id', norec));
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'responsable_id' then raise exception 'dar a quien no recibe no dio 23514: %', r; end if;
  r := pg_temp.ag_tcrear(jefe, gen_random_uuid(), jsonb_build_object('titulo', 'Para otra', 'responsable_id', baja));
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'responsable_id' then raise exception 'dar a alguien de baja no dio 23514: %', r; end if;
  r := pg_temp.ag_tcrear(jefe, gen_random_uuid(), jsonb_build_object('titulo', 'Para otra', 'responsable_id', bloq));
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'responsable_id' then raise exception 'dar a alguien bloqueado no dio 23514: %', r; end if;
  r := pg_temp.ag_tcrear(yo, gen_random_uuid(), jsonb_build_object('titulo', 'Ayer', 'vence_en', now() - interval '1 hour'));
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'vence_en' then raise exception 'vencer en el pasado no dio 23514: %', r; end if;
  r := pg_temp.ag_tcrear(jefe, t2, jsonb_build_object('titulo', 'Para otra', 'responsable_id', otra, 'vence_en', now() + interval '1 day'));
  if r ->> 'resultado' is distinct from 'creado' then raise exception 'dar una tarea con asignar a quien recibe no se creó: %', r; end if;
  if pg_temp.ag_avisos(t2, otra) <> '[1, 0]'::jsonb
     or not (select requiere_accion from public.notificaciones where referencia_id = t2 and usuario_id = otra) then
    raise exception 'quien recibe no tiene una tarea_asignada abierta que pide acción: %', pg_temp.ag_avisos(t2, otra);
  end if;
end $$;
rollback;

-- @test agenda: guardar una tarea: sólo el creador; PT409; el responsable no cambia aquí; claves y fechas con su hint; bloqueado no escribe (T3)
begin;
do $$
declare
  jefe uuid := pg_temp.ag_persona(array['agenda.tareas.asignar']); otra uuid := pg_temp.ag_persona(array['agenda.tareas.recibir']);
  t uuid := gen_random_uuid(); v0 timestamptz; v1 timestamptz; r jsonb;
begin
  perform pg_temp.ag_tcrear(jefe, t, jsonb_build_object('titulo', 'Revisar', 'responsable_id', otra));
  v0 := pg_temp.ag_v(t);
  r := pg_temp.ag_tguardar(otra, t, v0, '{"titulo": "Otro"}');
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'Sólo quien creó la tarea puede editarla.' then raise exception 'el responsable editó la tarea: %', r; end if;
  r := pg_temp.ag_tguardar(jefe, t, v0, '{"titulo": "Revisar"}');
  if r ->> 'resultado' is distinct from 'sin_cambios' then raise exception 'guardar lo mismo no dio sin_cambios: %', r; end if;
  r := pg_temp.ag_tguardar(jefe, t, v0, '{"titulo": "Revisar hoy"}');
  v1 := (r ->> 'actualizado_en')::timestamptz;
  if r ->> 'resultado' is distinct from 'guardado' or v1 <= v0 then raise exception 'el creador no guardó o la versión no se movió: %', r; end if;
  r := pg_temp.ag_tguardar(jefe, t, v0, '{"titulo": "Otra vez"}');
  if r ->> 'error' is distinct from 'PT409' then raise exception 'la versión vieja no dio PT409: %', r; end if;
  r := pg_temp.ag_tguardar(jefe, t, v1, jsonb_build_object('responsable_id', jefe));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'responsable_id' then raise exception 'cambiar el responsable al guardar no dio 22023: %', r; end if;
  r := pg_temp.ag_tguardar(jefe, t, v1, '{"estado": "completado"}');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'estado' then raise exception 'una clave desconocida no dio 22023: %', r; end if;
  r := pg_temp.ag_tguardar(jefe, t, v1, jsonb_build_object('vence_en', now() - interval '1 day'));
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'vence_en' then raise exception 'vencer en el pasado al guardar no dio 23514: %', r; end if;
  update public.perfiles set bloqueado = true where id = jefe;
  r := pg_temp.ag_tguardar(jefe, t, v1, '{"titulo": "Bloqueado"}');
  if r ->> 'error' is distinct from '42501' then raise exception 'una persona bloqueada guardó una tarea: %', r; end if;
end $$;
rollback;

-- @test agenda: completar: creador o responsable; acciona el aviso; reabrir; PT409; un tercero no la encuentra; bloqueado no escribe (T4)
begin;
do $$
declare
  jefe uuid := pg_temp.ag_persona(array['agenda.tareas.asignar']); otra uuid := pg_temp.ag_persona(array['agenda.tareas.recibir']); tercero uuid := pg_temp.ag_persona();
  t uuid := gen_random_uuid(); v0 timestamptz; v1 timestamptz; r jsonb;
begin
  perform pg_temp.ag_tcrear(jefe, t, jsonb_build_object('titulo', 'Enviar', 'responsable_id', otra));
  v0 := pg_temp.ag_v(t);
  r := pg_temp.ag_tcompletar(tercero, t, v0, true);
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No encontramos esta tarea.' then raise exception 'un tercero completó o supo de la tarea: %', r; end if;
  r := pg_temp.ag_tcompletar(otra, t, v0, true);
  v1 := (r ->> 'actualizado_en')::timestamptz;
  if r ->> 'resultado' is distinct from 'completada' or (select estado::text || (completada_en is not null)::text from public.tareas where id = t) <> 'completadotrue' then
    raise exception 'el responsable no completó: %', r; end if;
  if pg_temp.ag_avisos(t, otra) <> '[0, 1]'::jsonb then raise exception 'completar no accionó la tarea_asignada: %', pg_temp.ag_avisos(t, otra); end if;
  r := pg_temp.ag_tcompletar(otra, t, v1, true);
  if r ->> 'resultado' is distinct from 'sin_cambios' then raise exception 'completar dos veces no dio sin_cambios: %', r; end if;
  r := pg_temp.ag_tcompletar(jefe, t, v0, false);
  if r ->> 'error' is distinct from 'PT409' then raise exception 'reabrir con la versión vieja no dio PT409: %', r; end if;
  r := pg_temp.ag_tcompletar(jefe, t, v1, false);
  if r ->> 'resultado' is distinct from 'reabierta' or (select completada_en from public.tareas where id = t) is not null then raise exception 'el creador no reabrió: %', r; end if;
  update public.perfiles set bloqueado = true where id = otra;
  r := pg_temp.ag_tcompletar(otra, t, (r ->> 'actualizado_en')::timestamptz, true);
  if r ->> 'error' is distinct from '42501' then raise exception 'una persona bloqueada completó una tarea: %', r; end if;
end $$;
rollback;

-- @test agenda: reasignar: el creador con asignar, a quien recibe (activo, sin bloqueo), con versión; avisa al nuevo y acciona el del anterior (T5)
begin;
do $$
declare
  jefe uuid := pg_temp.ag_persona(array['agenda.tareas.asignar']); otra uuid := pg_temp.ag_persona(array['agenda.tareas.recibir']);
  nueva uuid := pg_temp.ag_persona(array['agenda.tareas.recibir']); resp uuid := pg_temp.ag_persona(array['agenda.tareas.asignar', 'agenda.tareas.recibir']);
  norec uuid := pg_temp.ag_persona(); baja uuid := pg_temp.ag_persona(array['agenda.tareas.recibir']); bloq uuid := pg_temp.ag_persona(array['agenda.tareas.recibir']);
  sin uuid := pg_temp.ag_persona(); t uuid := gen_random_uuid(); t2 uuid := gen_random_uuid(); t3 uuid := gen_random_uuid(); v0 timestamptz; r jsonb;
begin
  update public.perfiles set activo = false where id = baja;
  update public.perfiles set bloqueado = true where id = bloq;
  perform pg_temp.ag_tcrear(sin, t3, '{"titulo": "Mía"}');
  r := pg_temp.ag_reasignar(sin, t3, pg_temp.ag_v(t3), otra);
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' not like '%agenda.tareas.asignar%' then raise exception 'reasignar sin asignar no dio 42501: %', r; end if;
  perform pg_temp.ag_tcrear(jefe, t2, jsonb_build_object('titulo', 'De resp', 'responsable_id', resp));
  r := pg_temp.ag_reasignar(resp, t2, pg_temp.ag_v(t2), otra);
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'Sólo quien creó la tarea puede reasignarla.' then raise exception 'el responsable reasignó (D2): %', r; end if;

  perform pg_temp.ag_tcrear(jefe, t, jsonb_build_object('titulo', 'Pasar', 'responsable_id', otra));
  v0 := pg_temp.ag_v(t);
  r := pg_temp.ag_reasignar(jefe, t, v0, norec);
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'responsable_id' then raise exception 'reasignar a quien no recibe no dio 23514: %', r; end if;
  r := pg_temp.ag_reasignar(jefe, t, v0, baja);
  if r ->> 'error' is distinct from '23514' then raise exception 'reasignar a alguien de baja no dio 23514: %', r; end if;
  r := pg_temp.ag_reasignar(jefe, t, v0, bloq);
  if r ->> 'error' is distinct from '23514' then raise exception 'reasignar a alguien bloqueado no dio 23514: %', r; end if;
  r := pg_temp.ag_reasignar(jefe, t, v0, otra);
  if r ->> 'resultado' is distinct from 'sin_cambios' then raise exception 'reasignar al mismo no dio sin_cambios: %', r; end if;
  perform pg_temp.ag_tguardar(jefe, t, v0, '{"titulo": "Pasar ya"}');
  r := pg_temp.ag_reasignar(jefe, t, v0, nueva);
  if r ->> 'error' is distinct from 'PT409' then raise exception 'reasignar con la versión vieja no dio PT409: %', r; end if;
  r := pg_temp.ag_reasignar(jefe, t, pg_temp.ag_v(t), nueva);
  if r ->> 'resultado' is distinct from 'reasignada' or (select responsable_id from public.tareas where id = t) is distinct from nueva then raise exception 'el creador no reasignó: %', r; end if;
  if pg_temp.ag_avisos(t, nueva) <> '[1, 0]'::jsonb or pg_temp.ag_avisos(t, otra) <> '[0, 1]'::jsonb then
    raise exception 'reasignar no avisó al nuevo o no accionó al anterior: % %', pg_temp.ag_avisos(t, nueva), pg_temp.ag_avisos(t, otra);
  end if;
  if to_regprocedure('public.reasignar_tarea(uuid, uuid)') is not null then raise exception 'la firma vieja de reasignar_tarea sigue existiendo'; end if;
end $$;
rollback;

-- @test agenda: eliminar: sólo el creador, con versión; deja de leerse y acciona el aviso del responsable (T7)
begin;
do $$
declare
  jefe uuid := pg_temp.ag_persona(array['agenda.tareas.asignar']); otra uuid := pg_temp.ag_persona(array['agenda.tareas.recibir']);
  t uuid := gen_random_uuid(); v0 timestamptz; r jsonb;
begin
  perform pg_temp.ag_tcrear(jefe, t, jsonb_build_object('titulo', 'Borrar', 'responsable_id', otra));
  v0 := pg_temp.ag_v(t);
  r := pg_temp.ag_teliminar(otra, t, v0);
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'Sólo quien creó la tarea puede eliminarla.' then raise exception 'el responsable eliminó la tarea: %', r; end if;
  perform pg_temp.ag_tguardar(jefe, t, v0, '{"titulo": "Borrar ya"}');
  r := pg_temp.ag_teliminar(jefe, t, v0);
  if r ->> 'error' is distinct from 'PT409' then raise exception 'eliminar con la versión vieja no dio PT409: %', r; end if;
  r := pg_temp.ag_teliminar(jefe, t, pg_temp.ag_v(t));
  if r ->> 'resultado' is distinct from 'eliminada' then raise exception 'el creador no eliminó: %', r; end if;
  r := pg_temp.ag_corre(otra, format('select to_jsonb(count(*)) from public.tareas where id = %L', t));
  if r <> '0'::jsonb then raise exception 'el responsable sigue leyendo una tarea eliminada: %', r; end if;
  if pg_temp.ag_avisos(t, otra) <> '[0, 1]'::jsonb then raise exception 'eliminar no accionó la tarea_asignada: %', pg_temp.ag_avisos(t, otra); end if;
end $$;
rollback;

-- @test agenda: las RPC de tareas son definer con search_path vacío, de authenticated y no de anon ni PUBLIC; los ayudantes no son de authenticated (T8)
begin;
do $$
declare r record; n int := 0;
begin
  for r in select f.oid, f.proname, f.prosecdef, f.proconfig from pg_proc f join pg_namespace s on s.oid = f.pronamespace
            where s.nspname = 'public' and f.proname in ('tarea_crear', 'tarea_guardar', 'tarea_completar', 'tarea_eliminar', 'reasignar_tarea') loop
    n := n + 1;
    if not r.prosecdef or r.proconfig is distinct from array['search_path=""'] then raise exception '% perdió prosecdef o el search_path vacío', r.proname; end if;
    if not has_function_privilege('authenticated', r.oid, 'execute') or has_function_privilege('anon', r.oid, 'execute') then
      raise exception '%: execute debía ser de authenticated y no de anon', r.proname; end if;
    if exists (select 1 from pg_proc f, aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) a where f.oid = r.oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'PUBLIC puede ejecutar %', r.proname; end if;
  end loop;
  if n <> 5 then raise exception 'se esperaban 5 RPC de tareas (sin sobrecargas) y hay %', n; end if;
  for r in select f.oid, f.proname, f.proconfig from pg_proc f join pg_namespace s on s.oid = f.pronamespace
            where s.nspname = 'public' and f.proname like '\_agenda\_%'
              -- `_agenda_soy_destinatario` la evalúa la policy `eventos: leer` como invocador: es de authenticated (7.06-2, E11 la cubre).
              and f.oid <> 'public._agenda_soy_destinatario(uuid)'::regprocedure loop
    if has_function_privilege('authenticated', r.oid, 'execute') or has_function_privilege('anon', r.oid, 'execute') then
      raise exception 'authenticated o anon pueden ejecutar el ayudante %', r.proname; end if;
    if r.proconfig is distinct from array['search_path=""'] then raise exception 'el ayudante % no tiene el search_path vacío', r.proname; end if;
  end loop;
end $$;
rollback;
