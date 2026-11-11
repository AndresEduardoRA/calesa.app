-- La estructura de las tareas y su escritura sólo por RPC (paso 7.06-1, C1–C4). Partido de `tareas.sql` por largo.
-- No depende de otro archivo (`SOLO=areas/agenda/tareas-sin-escritura-directa.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   T0. `tareas.conversacion_id` con su FK (on delete set null) y su índice; la versión se mueve dos veces en una transacción.
--   T1. Nadie escribe `tareas` directo: insert, update (de tabla o de una columna) y delete como authenticated dan 42501.

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

-- @test agenda: tareas.conversacion_id con FK on delete set null e índice; la versión de la tarea se mueve dos veces en una transacción (T0)
begin;
do $$
declare yo uuid := pg_temp.ag_persona(); t uuid; v1 timestamptz; v2 timestamptz; v3 timestamptz;
begin
  if not exists (select 1 from pg_constraint c
      where c.contype = 'f' and c.confdeltype = 'n' and c.conrelid = 'public.tareas'::regclass and c.confrelid = 'public.conversaciones'::regclass
        and c.conkey = array[(select attnum from pg_attribute where attrelid = 'public.tareas'::regclass and attname = 'conversacion_id')]) then
    raise exception 'falta la FK on delete set null de tareas.conversacion_id';
  end if;
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'tareas_conversacion_id_idx' and indexdef like '%(conversacion_id)') then
    raise exception 'falta el índice de tareas.conversacion_id';
  end if;
  t := pg_temp.ag_tarea(yo, yo);
  select actualizado_en into v1 from public.tareas where id = t;
  update public.tareas set titulo = 'AG uno' where id = t returning actualizado_en into v2;
  update public.tareas set titulo = 'AG dos' where id = t returning actualizado_en into v3;
  if not (v1 < v2 and v2 < v3) then raise exception 'la versión de la tarea no se movió dos veces en la transacción: % % %', v1, v2, v3; end if;
end $$;
rollback;

-- @test agenda: nadie escribe tareas directo (T1)
begin;
do $$
declare yo uuid := pg_temp.ag_persona(array['agenda.tareas.asignar', 'agenda.tareas.recibir', 'agenda.ver_todo']); t uuid; r jsonb; s text; c text;
begin
  t := pg_temp.ag_tarea(yo, yo);
  foreach s in array array[
    format('insert into public.tareas (titulo, creado_por, responsable_id) values (%L, %L, %L)', 'x', yo, yo),
    format('update public.tareas set titulo = %L where id = %L', 'x', t),
    format('update public.tareas set responsable_id = %L where id = %L', yo, t),
    format('update public.tareas set estado = %L where id = %L', 'completado', t),
    format('delete from public.tareas where id = %L', t)
  ] loop
    r := pg_temp.ag_corre(yo, s);
    if r ->> 'error' is distinct from '42501' then raise exception 'una escritura directa de tareas no dio 42501 (%): %', s, r; end if;
  end loop;
  if has_table_privilege('authenticated', 'public.tareas', 'INSERT, UPDATE, DELETE') then raise exception 'authenticated conserva escritura de tabla en tareas'; end if;
  for c in select attname from pg_attribute where attrelid = 'public.tareas'::regclass and attnum > 0 and not attisdropped loop
    if has_column_privilege('authenticated', 'public.tareas', c, 'UPDATE') or has_column_privilege('authenticated', 'public.tareas', c, 'INSERT') then
      raise exception 'authenticated conserva escritura en la columna tareas.%', c;
    end if;
  end loop;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tareas' and cmd <> 'SELECT') then
    raise exception 'queda una policy de escritura en tareas';
  end if;
end $$;
rollback;
