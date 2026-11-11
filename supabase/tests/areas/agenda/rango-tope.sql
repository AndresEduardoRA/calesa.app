-- El tope de la agenda por rango (paso 7.06-2, C5–C6): 200 por clase, se pide uno de más y la respuesta dice `hay_mas`. Partido de `rango.sql` por largo.
-- No depende de otro archivo (`SOLO=areas/agenda/rango-tope.sql`). Cada bloque abre su transacción y la revierte. El rango cae a 400 días de hoy.
--
-- Qué asegura:
--   R5. Con 201 eventos, tareas, recordatorios o subastas en el rango: 200 y `hay_mas`; con 200, `false`; `tope = 200`. Las subastas de dos orígenes
--       (120 y 120) también cortan en 200: prueba el `limit` de afuera, no sólo el de cada origen.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (alcance «todos») o 'clave:propios'.
create or replace function pg_temp.ar_persona(p_concesiones text[] default '{}') returns uuid language plpgsql as $f$
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
create or replace function pg_temp.ar_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- El comienzo del rango de prueba: lejos de lo sembrado.
create or replace function pg_temp.ar_t0() returns timestamptz language sql as $f$ select date_trunc('day', now()) + interval '400 days' $f$;

-- `agenda_rango` como esa persona, sobre [t0, t0 + p_dias).
create or replace function pg_temp.ar_rango(p_quien uuid, p_de_todos boolean default false, p_dias int default 7) returns jsonb language sql as $f$
  select pg_temp.ar_corre(p_quien, format('select public.agenda_rango(%L::timestamptz, %L::timestamptz, %L)',
                                          pg_temp.ar_t0(), pg_temp.ar_t0() + make_interval(days => p_dias), p_de_todos))
$f$;

-- Si la clase de la respuesta trae ese id (`vehiculo_id` en las subastas).
create or replace function pg_temp.ar_tiene(p_r jsonb, p_clase text, p_id uuid) returns boolean language sql as $f$
  select exists (select 1 from jsonb_array_elements(coalesce(p_r -> p_clase, '[]')) e where coalesce(e ->> 'id', e ->> 'vehiculo_id') = p_id::text)
$f$;

-- Un evento armado como dueño de la tabla, que empieza en t0 + p_desfase.
create or replace function pg_temp.ar_evento(p_quien uuid, p_vis text default 'privado', p_dest uuid[] default '{}',
                                             p_desfase interval default interval '1 hour') returns uuid language plpgsql as $f$
declare v uuid; u uuid;
begin
  insert into public.eventos (titulo, inicia_en, visibilidad, creado_por)
  values ('AG evento', pg_temp.ar_t0() + p_desfase, p_vis::public.visibilidad_evento, p_quien) returning id into v;
  foreach u in array p_dest loop insert into public.eventos_destinatarios (evento_id, usuario_id) values (v, u); end loop;
  return v;
end $f$;

-- Una tarea armada como dueño de la tabla, que vence en t0 + 2 horas.
create or replace function pg_temp.ar_tarea(p_creador uuid, p_responsable uuid) returns uuid language sql as $f$
  insert into public.tareas (titulo, vence_en, responsable_id, creado_por) values ('AG tarea', pg_temp.ar_t0() + interval '2 hours', p_responsable, p_creador)
  returning id
$f$;

-- Un recordatorio armado como dueño de la tabla, en t0 + 3 horas.
create or replace function pg_temp.ar_recordatorio(p_usuario uuid) returns uuid language sql as $f$
  insert into public.recordatorios (usuario_id, titulo, recordar_en) values (p_usuario, 'AG recordatorio', pg_temp.ar_t0() + interval '3 hours') returning id
$f$;

-- Un vehículo con una subasta abierta que cierra en t0 + 4 horas.
create or replace function pg_temp.ar_vehiculo(p_origen uuid, p_creado_por uuid, p_estado text default 'abierta') returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, creado_por, estado_subasta, subasta_en)
  values (p_origen, 'AG vehículo', p_creado_por, p_estado::public.estado_subasta, pg_temp.ar_t0() + interval '4 hours') returning id
$f$;

-- @test agenda: cada clase del rango corta en 200 y dice si había más (R5)
begin;
do $$
declare
  c uuid := pg_temp.ar_persona(); rs uuid := pg_temp.ar_persona(array['agenda.tareas.recibir', 'vehiculos.ver']); o uuid; r jsonb; k text;
begin
  insert into public.origenes (clave, nombre) values ('ag_' || substr(gen_random_uuid()::text, 1, 8), 'AG origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  perform pg_temp.ar_evento(c, 'publico', '{}', make_interval(mins => g)) from generate_series(1, 201) g;
  perform pg_temp.ar_tarea(c, rs) from generate_series(1, 201);
  perform pg_temp.ar_recordatorio(rs) from generate_series(1, 201);
  perform pg_temp.ar_vehiculo(o, c) from generate_series(1, 201);
  r := pg_temp.ar_rango(rs);
  if r -> 'tope' is distinct from '200'::jsonb then raise exception 'el tope: %', r -> 'tope'; end if;
  foreach k in array array['eventos', 'tareas', 'recordatorios', 'subastas'] loop
    if jsonb_array_length(r -> k) <> 200 or r -> 'hay_mas' -> k is distinct from 'true'::jsonb then
      raise exception 'con 201 %: % y hay_mas %', k, jsonb_array_length(r -> k), r -> 'hay_mas' -> k; end if;
  end loop;
  -- Con uno menos de cada clase quedan 200 justos.
  update public.eventos set eliminado_en = now() where id = (select (r -> 'eventos' -> 0 ->> 'id')::uuid);
  update public.tareas set eliminado_en = now() where id = (select (r -> 'tareas' -> 0 ->> 'id')::uuid);
  update public.recordatorios set eliminado_en = now() where id = (select (r -> 'recordatorios' -> 0 ->> 'id')::uuid);
  update public.vehiculos set eliminado_en = now() where id = (select (r -> 'subastas' -> 0 ->> 'vehiculo_id')::uuid);
  r := pg_temp.ar_rango(rs);
  foreach k in array array['eventos', 'tareas', 'recordatorios', 'subastas'] loop
    if jsonb_array_length(r -> k) <> 200 or r -> 'hay_mas' -> k is distinct from 'false'::jsonb then
      raise exception 'con 200 %: % y hay_mas %', k, jsonb_array_length(r -> k), r -> 'hay_mas' -> k; end if;
  end loop;
  -- El orden: los eventos por inicio.
  if (r -> 'eventos' -> 0 ->> 'inicia_en')::timestamptz > (r -> 'eventos' -> 199 ->> 'inicia_en')::timestamptz then
    raise exception 'los eventos no vienen por inicio'; end if;
end $$;
rollback;

-- @test agenda: las subastas de dos orígenes también cortan en 200 (R5, el limit de afuera)
begin;
do $$
declare u uuid := pg_temp.ar_persona(array['vehiculos.ver']); c uuid := pg_temp.ar_persona(); o1 uuid; o2 uuid; r jsonb;
begin
  insert into public.origenes (clave, nombre) values ('ag_' || substr(gen_random_uuid()::text, 1, 8), 'AG origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o1;
  insert into public.origenes (clave, nombre) values ('ag_' || substr(gen_random_uuid()::text, 1, 8), 'AG origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o2;
  perform pg_temp.ar_vehiculo(o1, c) from generate_series(1, 120);
  perform pg_temp.ar_vehiculo(o2, c) from generate_series(1, 120);
  r := pg_temp.ar_rango(u);
  if jsonb_array_length(r -> 'subastas') <> 200 or r -> 'hay_mas' -> 'subastas' is distinct from 'true'::jsonb then
    raise exception 'dos orígenes de 120: % y hay_mas %', jsonb_array_length(r -> 'subastas'), r -> 'hay_mas' -> 'subastas'; end if;
end $$;
rollback;
