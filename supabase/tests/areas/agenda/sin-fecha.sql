-- Las tareas sin fecha (paso 7.06-2, C7, D26): `agenda_tareas_sin_fecha(p_tamano, p_antes_en, p_antes_id)`, de invocador, por cursor `(creado_en, id)`.
-- No depende de otro archivo (`SOLO=areas/agenda/sin-fecha.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   S1. Sólo mis tareas (responsable) vivas, sin fecha y no canceladas, la más nueva primero: no la que creé y le di a otra persona (la RLS me la deja
--       ver: prueba el filtro), ni una con fecha, eliminada o cancelada; la completada sí. Página de 2 con 3 → 2 y `hay_mas`; el cursor trae la
--       tercera; cursor a medias → 22023 hint `cursor`; bloqueado → 42501.
--   S2. `p_tamano` lo acota `_acotar_pagina`: 999 da 50 como mucho.
--   S3. Catálogo: de invocador, `search_path` vacío, de authenticated y no de anon ni PUBLIC; `tareas_sin_fecha_idx` existe.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (alcance «todos») o 'clave:propios'.
create or replace function pg_temp.sf_persona(p_concesiones text[] default '{}') returns uuid language plpgsql as $f$
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
create or replace function pg_temp.sf_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- Una tarea sin fecha armada como dueño de la tabla, creada hace p_hace.
create or replace function pg_temp.sf_tarea(p_creador uuid, p_responsable uuid, p_hace interval, p_estado text default 'pendiente') returns uuid language sql as $f$
  insert into public.tareas (titulo, responsable_id, creado_por, estado, creado_en)
  values ('SF tarea', p_responsable, p_creador, p_estado::public.estado_agenda, date_trunc('second', now()) - p_hace) returning id
$f$;

-- La página como esa persona.
create or replace function pg_temp.sf_pagina(p_quien uuid, p_tamano int default null, p_antes_en text default null, p_antes_id text default null) returns jsonb language sql as $f$
  select pg_temp.sf_corre(p_quien, format('select public.agenda_tareas_sin_fecha(%s, %L::timestamptz, %L::uuid)', coalesce(p_tamano::text, 'null'), p_antes_en, p_antes_id))
$f$;

-- Los ids de la página, en orden.
create or replace function pg_temp.sf_ids(p_r jsonb) returns uuid[] language sql as $f$
  select coalesce(array_agg((e ->> 'id')::uuid order by n), '{}') from jsonb_array_elements(p_r -> 'tareas') with ordinality a(e, n)
$f$;

-- @test agenda: sin fecha entrega sólo mis tareas vivas, sin fecha y no canceladas, la más nueva primero, por cursor (S1)
begin;
do $$
declare
  yo uuid := pg_temp.sf_persona(array['agenda.tareas.recibir']); otra uuid := pg_temp.sf_persona(array['agenda.tareas.recibir']);
  t1 uuid; t2 uuid; t3 uuid; dada uuid; con_fecha uuid; borrada uuid; cancelada uuid; r jsonb;
begin
  t1 := pg_temp.sf_tarea(yo, yo, interval '1 minute');
  t2 := pg_temp.sf_tarea(yo, yo, interval '2 minutes');
  t3 := pg_temp.sf_tarea(yo, yo, interval '3 minutes', 'completado');
  dada := pg_temp.sf_tarea(yo, otra, interval '30 seconds');
  con_fecha := pg_temp.sf_tarea(yo, yo, interval '40 seconds');
  update public.tareas set vence_en = now() + interval '1 day' where id = con_fecha;
  borrada := pg_temp.sf_tarea(yo, yo, interval '50 seconds');
  update public.tareas set eliminado_en = now() where id = borrada;
  cancelada := pg_temp.sf_tarea(yo, yo, interval '55 seconds', 'cancelado');
  -- La RLS sí me deja ver la que di: si sale, falta el filtro.
  if pg_temp.sf_corre(yo, format('select to_jsonb(count(*)) from public.tareas where id = %L', dada)) <> '1'::jsonb then
    raise exception 'el creador debía ver la tarea que dio'; end if;
  r := pg_temp.sf_pagina(yo);
  if pg_temp.sf_ids(r) is distinct from array[t1, t2, t3] or r -> 'hay_mas' is distinct from 'false'::jsonb then
    raise exception 'la página entera: %', r; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from array['hay_mas', 'tareas'] then raise exception 'las claves: %', r; end if;
  r := pg_temp.sf_pagina(yo, 2);
  if pg_temp.sf_ids(r) is distinct from array[t1, t2] or r -> 'hay_mas' is distinct from 'true'::jsonb then raise exception 'la página de 2: %', r; end if;
  r := pg_temp.sf_pagina(yo, 2, r -> 'tareas' -> 1 ->> 'creado_en', r -> 'tareas' -> 1 ->> 'id');
  if pg_temp.sf_ids(r) is distinct from array[t3] or r -> 'hay_mas' is distinct from 'false'::jsonb then raise exception 'la página del cursor: %', r; end if;
  r := pg_temp.sf_pagina(yo, 2, now()::text, null);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'cursor' then raise exception 'el cursor a medias dio %', r; end if;
  r := pg_temp.sf_pagina(otra);
  if pg_temp.sf_ids(r) is distinct from array[dada] then raise exception 'la responsable de la que di recibió %', r; end if;
  update public.perfiles set bloqueado = true where id = yo;
  r := pg_temp.sf_pagina(yo);
  if r ->> 'error' is distinct from '42501' then raise exception 'una persona bloqueada leyó %', r; end if;
end $$;
rollback;

-- @test agenda: el tamaño de la página de sin fecha lo acota _acotar_pagina: 999 da 50 (S2)
begin;
do $$
declare yo uuid := pg_temp.sf_persona(array['agenda.tareas.recibir']); r jsonb;
begin
  perform pg_temp.sf_tarea(yo, yo, make_interval(secs => g)) from generate_series(1, 52) g;
  r := pg_temp.sf_pagina(yo, 999);
  if jsonb_array_length(r -> 'tareas') <> 50 or r -> 'hay_mas' is distinct from 'true'::jsonb then
    raise exception 'con 999: % y hay_mas %', jsonb_array_length(r -> 'tareas'), r -> 'hay_mas'; end if;
  r := pg_temp.sf_pagina(yo);
  if jsonb_array_length(r -> 'tareas') <> 20 then raise exception 'por defecto: %', jsonb_array_length(r -> 'tareas'); end if;
end $$;
rollback;

-- @test agenda: agenda_tareas_sin_fecha es de invocador, con search_path vacío, de authenticated y no de anon ni PUBLIC; tareas_sin_fecha_idx existe (S3)
begin;
do $$
declare f record; v_oid oid := 'public.agenda_tareas_sin_fecha(integer, timestamptz, uuid)'::regprocedure;
begin
  select p.prosecdef, p.proconfig into f from pg_proc p where p.oid = v_oid;
  if f.prosecdef or f.proconfig is distinct from array['search_path=""'] then raise exception 'definer % y config %', f.prosecdef, f.proconfig; end if;
  if not has_function_privilege('authenticated', v_oid, 'execute') or has_function_privilege('anon', v_oid, 'execute')
     or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.oid = v_oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
    raise exception 'execute de authenticated sí, de anon y PUBLIC no'; end if;
  if (select count(*) from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = 'agenda_tareas_sin_fecha') <> 1 then
    raise exception 'agenda_tareas_sin_fecha tiene sobrecargas'; end if;
  if to_regclass('public.tareas_sin_fecha_idx') is null then raise exception 'falta tareas_sin_fecha_idx'; end if;
end $$;
rollback;
