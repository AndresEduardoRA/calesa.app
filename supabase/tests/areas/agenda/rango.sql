-- La agenda por rango (paso 7.06-2, C2–C6): `agenda_rango(p_desde, p_hasta, p_de_todos)`, de invocador, con la RLS de cada tabla y «mi agenda» encima.
-- No depende de otro archivo (`SOLO=areas/agenda/rango.sql`). Cada bloque abre su transacción y la revierte. El rango cae a 400 días de hoy: ahí no
-- hay nada sembrado. El tope (R5) está en `rango-tope.sql`.
--
-- Qué asegura:
--   R1. Eventos: el tercero no recibe el privado ni el «seleccionados» ajeno; el destinatario recibe el suyo; `agenda.ver_todo` sólo con `p_de_todos`;
--       sin ese permiso, `p_de_todos` da 42501.
--   R2. Recordatorios: el propio pendiente sí; el ajeno nunca (ni con `ver_todo` y `p_de_todos`); el completado no.
--   R3. Subastas bajo la RLS de vehículos: sin `vehiculos.ver` ninguna; con «propios» la del vehículo que creó; con «todos» las dos; papelera y terminada no.
--   R4. Tareas: la mía sí; con `ver_todo` y sin `p_de_todos` no la ajena (prueba el filtro, no la RLS); el creador no recibe la que dio; eliminada no.
--   R6. El rango: nulo, al revés o de 46 días → 22023 hint `rango`; 45 días sí; lo que empieza justo en `p_hasta` no entra; bloqueado → 42501.
--   R7. Catálogo: de invocador, `search_path` vacío, de authenticated y no de anon ni PUBLIC; `tareas_vence_idx` existe.

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

-- @test agenda: el rango entrega los eventos que la persona ve y ver_todo sólo con p_de_todos (R1)
begin;
do $$
declare
  c uuid := pg_temp.ar_persona(); d uuid := pg_temp.ar_persona(); t uuid := pg_temp.ar_persona(); vt uuid := pg_temp.ar_persona(array['agenda.ver_todo']);
  priv uuid; pub uuid; sel uuid; r jsonb;
begin
  priv := pg_temp.ar_evento(c);
  pub := pg_temp.ar_evento(c, 'publico');
  sel := pg_temp.ar_evento(c, 'seleccionados', array[d]);
  r := pg_temp.ar_rango(t);
  if pg_temp.ar_tiene(r, 'eventos', priv) or pg_temp.ar_tiene(r, 'eventos', sel) or not pg_temp.ar_tiene(r, 'eventos', pub) then
    raise exception 'el tercero recibió %', r -> 'eventos'; end if;
  r := pg_temp.ar_rango(d);
  if pg_temp.ar_tiene(r, 'eventos', priv) or not pg_temp.ar_tiene(r, 'eventos', sel) or not pg_temp.ar_tiene(r, 'eventos', pub) then
    raise exception 'el destinatario recibió %', r -> 'eventos'; end if;
  r := pg_temp.ar_rango(c);
  if not (pg_temp.ar_tiene(r, 'eventos', priv) and pg_temp.ar_tiene(r, 'eventos', sel) and pg_temp.ar_tiene(r, 'eventos', pub))
     or exists (select 1 from jsonb_array_elements(r -> 'eventos') e where e ->> 'id' = priv::text and (e -> 'mio') is distinct from 'true'::jsonb) then
    raise exception 'el creador recibió %', r -> 'eventos'; end if;
  r := pg_temp.ar_rango(vt);
  if pg_temp.ar_tiene(r, 'eventos', priv) or pg_temp.ar_tiene(r, 'eventos', sel) or not pg_temp.ar_tiene(r, 'eventos', pub) then
    raise exception 'ver_todo sin p_de_todos recibió %', r -> 'eventos'; end if;
  r := pg_temp.ar_rango(vt, true);
  if not (pg_temp.ar_tiene(r, 'eventos', priv) and pg_temp.ar_tiene(r, 'eventos', sel)) then
    raise exception 'ver_todo con p_de_todos no recibió el privado ni el seleccionados: %', r -> 'eventos'; end if;
  r := pg_temp.ar_rango(t, true);
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' not like '%agenda.ver_todo%' then raise exception 'p_de_todos sin ver_todo dio %', r; end if;
end $$;
rollback;

-- @test agenda: el rango entrega sólo mis recordatorios pendientes, ni con ver_todo los ajenos (R2)
begin;
do $$
declare
  u uuid := pg_temp.ar_persona(); vt uuid := pg_temp.ar_persona(array['agenda.ver_todo']); mio uuid; hecho uuid; ajeno uuid; r jsonb;
begin
  mio := pg_temp.ar_recordatorio(vt);
  hecho := pg_temp.ar_recordatorio(vt);
  update public.recordatorios set completado_en = now() where id = hecho;
  ajeno := pg_temp.ar_recordatorio(u);
  r := pg_temp.ar_rango(vt, true);
  if not pg_temp.ar_tiene(r, 'recordatorios', mio) or pg_temp.ar_tiene(r, 'recordatorios', hecho) or pg_temp.ar_tiene(r, 'recordatorios', ajeno) then
    raise exception 'ver_todo con p_de_todos recibió los recordatorios %', r -> 'recordatorios'; end if;
  r := pg_temp.ar_rango(u);
  if not pg_temp.ar_tiene(r, 'recordatorios', ajeno) or pg_temp.ar_tiene(r, 'recordatorios', mio) then
    raise exception 'la dueña del recordatorio recibió %', r -> 'recordatorios'; end if;
end $$;
rollback;

-- @test agenda: las subastas del rango son las de los vehículos que la RLS deja ver (R3)
begin;
do $$
declare
  sin uuid := pg_temp.ar_persona(); pr uuid := pg_temp.ar_persona(array['vehiculos.ver:propios']); to_ uuid := pg_temp.ar_persona(array['vehiculos.ver']);
  o uuid; suyo uuid; ajeno uuid; papelera uuid; terminada uuid; r jsonb;
begin
  insert into public.origenes (clave, nombre) values ('ag_' || substr(gen_random_uuid()::text, 1, 8), 'AG origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  suyo := pg_temp.ar_vehiculo(o, pr);
  ajeno := pg_temp.ar_vehiculo(o, to_);
  papelera := pg_temp.ar_vehiculo(o, pr);
  update public.vehiculos set eliminado_en = now() where id = papelera;
  terminada := pg_temp.ar_vehiculo(o, pr, 'terminada');
  r := pg_temp.ar_rango(sin);
  if pg_temp.ar_tiene(r, 'subastas', suyo) or pg_temp.ar_tiene(r, 'subastas', ajeno) then raise exception 'sin vehiculos.ver recibió %', r -> 'subastas'; end if;
  r := pg_temp.ar_rango(pr);
  if not pg_temp.ar_tiene(r, 'subastas', suyo) or pg_temp.ar_tiene(r, 'subastas', ajeno) then raise exception 'con «propios» recibió %', r -> 'subastas'; end if;
  r := pg_temp.ar_rango(to_);
  if not (pg_temp.ar_tiene(r, 'subastas', suyo) and pg_temp.ar_tiene(r, 'subastas', ajeno))
     or pg_temp.ar_tiene(r, 'subastas', papelera) or pg_temp.ar_tiene(r, 'subastas', terminada) then
    raise exception 'con «todos» recibió %', r -> 'subastas'; end if;
end $$;
rollback;

-- @test agenda: el rango entrega mis tareas; ni ver_todo sin p_de_todos ni el creador reciben la ajena (R4)
begin;
do $$
declare
  c uuid := pg_temp.ar_persona(); rs uuid := pg_temp.ar_persona(array['agenda.tareas.recibir']);
  vt uuid := pg_temp.ar_persona(array['agenda.ver_todo', 'agenda.tareas.recibir']); mia uuid; ajena uuid; borrada uuid; r jsonb;
begin
  mia := pg_temp.ar_tarea(vt, vt);
  ajena := pg_temp.ar_tarea(c, rs);
  borrada := pg_temp.ar_tarea(vt, vt);
  update public.tareas set eliminado_en = now() where id = borrada;
  r := pg_temp.ar_rango(vt);
  if not pg_temp.ar_tiene(r, 'tareas', mia) or pg_temp.ar_tiene(r, 'tareas', ajena) or pg_temp.ar_tiene(r, 'tareas', borrada) then
    raise exception 'ver_todo sin p_de_todos recibió las tareas %', r -> 'tareas'; end if;
  r := pg_temp.ar_rango(vt, true);
  if not (pg_temp.ar_tiene(r, 'tareas', mia) and pg_temp.ar_tiene(r, 'tareas', ajena)) or pg_temp.ar_tiene(r, 'tareas', borrada) then
    raise exception 'ver_todo con p_de_todos recibió las tareas %', r -> 'tareas'; end if;
  r := pg_temp.ar_rango(c);
  if pg_temp.ar_tiene(r, 'tareas', ajena) then raise exception 'el creador recibió la tarea que dio: %', r -> 'tareas'; end if;
  r := pg_temp.ar_rango(rs);
  if not pg_temp.ar_tiene(r, 'tareas', ajena)
     or exists (select 1 from jsonb_array_elements(r -> 'tareas') e where e ->> 'id' = ajena::text and (e -> 'mia') is distinct from 'false'::jsonb) then
    raise exception 'el responsable recibió %', r -> 'tareas'; end if;
end $$;
rollback;

-- @test agenda: el rango es obligatorio, en orden y de hasta 45 días; el borde de arriba no entra; una persona bloqueada no lee (R6)
begin;
do $$
declare u uuid := pg_temp.ar_persona(); borde uuid; adentro uuid; r jsonb; q text;
begin
  foreach q in array array[
    'select public.agenda_rango(null, now())',
    'select public.agenda_rango(now(), null)',
    'select public.agenda_rango(now(), now())',
    'select public.agenda_rango(now(), now() - interval ''1 day'')',
    'select public.agenda_rango(now(), now() + interval ''46 days'')'] loop
    r := pg_temp.ar_corre(u, q);
    if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'rango' then raise exception '% dio %', q, r; end if;
  end loop;
  r := pg_temp.ar_corre(u, 'select public.agenda_rango(now(), now() + interval ''45 days'')');
  if r ? 'error' or not (r ?& array['eventos', 'tareas', 'recordatorios', 'subastas', 'hay_mas', 'tope']) then raise exception '45 días dio %', r; end if;
  borde := pg_temp.ar_evento(u, 'privado', '{}', interval '7 days');
  adentro := pg_temp.ar_evento(u, 'privado', '{}', interval '7 days' - interval '1 microsecond');
  r := pg_temp.ar_rango(u);
  if pg_temp.ar_tiene(r, 'eventos', borde) or not pg_temp.ar_tiene(r, 'eventos', adentro) then raise exception 'el borde del rango: %', r -> 'eventos'; end if;
  update public.perfiles set bloqueado = true where id = u;
  r := pg_temp.ar_rango(u);
  if r ->> 'error' is distinct from '42501' then raise exception 'una persona bloqueada leyó %', r; end if;
end $$;
rollback;

-- @test agenda: agenda_rango es de invocador, con search_path vacío, de authenticated y no de anon ni PUBLIC; tareas_vence_idx existe (R7)
begin;
do $$
declare f record; v_oid oid := 'public.agenda_rango(timestamptz, timestamptz, boolean)'::regprocedure;
begin
  select p.prosecdef, p.proconfig into f from pg_proc p where p.oid = v_oid;
  if f.prosecdef or f.proconfig is distinct from array['search_path=""'] then raise exception 'agenda_rango: definer % y config %', f.prosecdef, f.proconfig; end if;
  if not has_function_privilege('authenticated', v_oid, 'execute') or has_function_privilege('anon', v_oid, 'execute')
     or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.oid = v_oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
    raise exception 'agenda_rango: execute de authenticated sí, de anon y PUBLIC no'; end if;
  if (select count(*) from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = 'agenda_rango') <> 1 then
    raise exception 'agenda_rango tiene sobrecargas'; end if;
  if to_regclass('public.tareas_vence_idx') is null then raise exception 'falta tareas_vence_idx'; end if;
end $$;
rollback;
