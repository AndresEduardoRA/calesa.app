-- Exportar todo (9.05-1): `datos_exportacion_registrar()` es el enforcement de `datos.exportar.todo` (42501 sin él, 3 por hora y por entidad
-- con `libre_en`, la constancia sin datos de nadie) y `datos_exportar_leads()` es la lectura del route handler, con la sesión de quien exporta: de un
-- lead ajeno, el teléfono enmascarado y ningún campo de sólo cartera. Corre en PGlite (`pnpm db:probar`); cada bloque arma su terreno y lo revierte.

-- @test exportar: los ayudantes
reset role;
-- Lo que devuelve un SQL corrido como esa persona (una fila jsonb), o el error.
create or replace function pg_temp.dex_como(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute p_sql into v;
  reset role;
  return v;
end $f$;

-- Ada (…a): datos.exportar.todo, leads.ver «todos» y leads.crear. Bea (…b): leads.ver «propios» y leads.crear. Ceci (…c): leads.ver «todos», sin
-- datos.exportar.todo. La primera cuenta nace dueña: se le quita.
create or replace function pg_temp.dex_preparar() returns void language plpgsql as $f$
declare p uuid; v_rol uuid; i int := 0;
begin
  foreach p in array array['00000000-0000-4000-8000-00000009905a', '00000000-0000-4000-8000-00000009905b', '00000000-0000-4000-8000-00000009905c']::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'DEX ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('dex_rol_' || i, 'DEX rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    if i = 1 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values
        (v_rol, 'datos.exportar.todo', null, 'todos'), (v_rol, 'leads.ver', null, 'todos'), (v_rol, 'leads.crear', null, 'todos');
    elsif i = 2 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values
        (v_rol, 'leads.ver', null, 'propios'), (v_rol, 'leads.crear', null, 'todos');
    else
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'leads.ver', null, 'todos');
    end if;
  end loop;
end $f$;

-- Registrar como esa persona, una sola llamada: si pasa, la respuesta; si no, «sqlstate» o «sqlstate/hint».
create or replace function pg_temp.dex_registrar(p_quien uuid, p_entidad text, p_filas int, p_filtros jsonb) returns text language plpgsql as $f$
declare v jsonb; v_hint text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v := public.datos_exportacion_registrar(p_entidad, p_filas, p_filtros);
  reset role;
  return v::text;
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  reset role;
  return sqlstate || coalesce('/' || nullif(v_hint, ''), '');
end $f$;

create or replace function pg_temp.dex_constancias(p_quien uuid) returns int language sql as $f$
  select count(*)::int from public.actividad where actor_id = p_quien and accion = 'datos.exportado'
$f$;

-- @test exportar: sin datos.exportar.todo, 42501; el registrar es definer con search_path vacío y toma el candado antes de leer actividad
begin;
select pg_temp.dex_preparar();
do $$
declare bea uuid := '00000000-0000-4000-8000-00000009905b'; ceci uuid := '00000000-0000-4000-8000-00000009905c'; r text;
        v_reg regprocedure := 'public.datos_exportacion_registrar(text, integer, jsonb)'::regprocedure; v_src text; v_candado int; v_lee int;
begin
  foreach r in array array[pg_temp.dex_registrar(ceci, 'leads', 10, '{}'), pg_temp.dex_registrar(bea, 'leads', 10, '{}'),
                           pg_temp.dex_registrar(ceci, 'seguimientos', 10, '{}')] loop
    if r <> '42501' then raise exception 'sin datos.exportar.todo debía dar 42501 (el permiso primero): %', r; end if;
  end loop;
  if pg_temp.dex_constancias(ceci) + pg_temp.dex_constancias(bea) <> 0 then raise exception 'sin permiso quedó una constancia'; end if;
  if not (select prosecdef from pg_proc where oid = v_reg) then raise exception 'el registrar no es definer'; end if;
  if not ('search_path=""' = any (coalesce((select proconfig from pg_proc where oid = v_reg), '{}'))) then raise exception 'el registrar sin search_path vacío'; end if;
  if has_function_privilege('anon', v_reg, 'execute') then raise exception 'anon ejecuta el registrar'; end if;
  if not has_function_privilege('authenticated', v_reg, 'execute') then raise exception 'authenticated no ejecuta el registrar'; end if;
  -- El candado por persona va antes de leer las constancias: si falta o queda después, dos exportaciones a la vez se cuelan por debajo del tope.
  v_src := (select prosrc from pg_proc where oid = v_reg);
  v_candado := strpos(v_src, 'pg_advisory_xact_lock(hashtext(''datos_exportacion''), hashtext(v_yo::text))');
  v_lee := strpos(v_src, 'from public.actividad');
  if v_candado = 0 or v_lee = 0 or v_candado > v_lee then raise exception 'el candado por persona no va antes de leer actividad (% / %)', v_candado, v_lee; end if;
  if (select aplicado_en from public.permisos where clave = 'datos.exportar.todo') <> 'datos_exportacion_registrar' then raise exception 'el permiso no nombra su enforcement'; end if;
end $$;
rollback;

-- @test exportar: la cuarta en una hora devuelve libre_en (la más vieja de las tres más una hora) y no deja constancia; el tope es por entidad
begin;
select pg_temp.dex_preparar();
do $$
declare ada uuid := '00000000-0000-4000-8000-00000009905a'; r jsonb; v_antes int; v_origen uuid := (select id from public.origenes order by id limit 1);
begin
  -- Tres constancias sembradas: una de hace 61 minutos (ya no cuenta), dos dentro de la hora.
  insert into public.actividad (accion, actor_id, tabla, detalle, creado_en) values
    ('datos.exportado', ada, 'leads', '{}', now() - interval '61 minutes'),
    ('datos.exportado', ada, 'leads', '{}', now() - interval '50 minutes'),
    ('datos.exportado', ada, 'leads', '{}', now() - interval '20 minutes');
  r := pg_temp.dex_registrar(ada, 'leads', 10, '{}')::jsonb;
  if r <> '{"ok": true, "restantes": 0}'::jsonb then raise exception 'la tercera en la hora debía pasar con 0 restantes: %', r; end if;
  v_antes := pg_temp.dex_constancias(ada);
  r := pg_temp.dex_registrar(ada, 'leads', 10, '{}')::jsonb;
  if (r -> 'ok') <> 'false'::jsonb or (r ->> 'libre_en')::timestamptz <> now() - interval '50 minutes' + interval '1 hour' then
    raise exception 'la cuarta debía devolver libre_en = la de hace 50 minutos + 1 hora: %', r;
  end if;
  if (select count(*) from jsonb_object_keys(r)) <> 2 then raise exception 'la respuesta del límite trae de más: %', r; end if;
  if pg_temp.dex_constancias(ada) <> v_antes then raise exception 'la cuarta dejó constancia'; end if;
  -- Otra entidad tiene su propio tope.
  r := pg_temp.dex_registrar(ada, 'vehiculos', 10, jsonb_build_object('origen', v_origen))::jsonb;
  if r <> '{"ok": true, "restantes": 2}'::jsonb then raise exception 'vehículos tiene su propio tope: %', r; end if;
  r := pg_temp.dex_registrar(ada, 'cotizaciones', 0, '{}')::jsonb;
  if r <> '{"ok": true, "restantes": 2}'::jsonb then raise exception 'cotizaciones tiene su propio tope: %', r; end if;
end $$;
rollback;

-- @test exportar: la constancia guarda sólo entidad, filas y filtros normalizados; cada rechazo da 22023 con su hint y no deja constancia
begin;
select pg_temp.dex_preparar();
do $$
declare ada uuid := '00000000-0000-4000-8000-00000009905a'; r text; a record; v_caso text; v_entidad text; v_filas int; v_filtros jsonb; v_hint text;
        v_origen uuid := (select id from public.origenes order by id limit 1);
begin
  r := pg_temp.dex_registrar(ada, 'leads', 1234, '{"desde": "2026-01-01", "hasta": "2026-06-30"}');
  if r::jsonb <> '{"ok": true, "restantes": 2}'::jsonb then raise exception 'con un rango debía pasar: %', r; end if;
  select * into a from public.actividad where actor_id = ada and accion = 'datos.exportado';
  if a.tabla <> 'leads' or a.registro_id is not null or a.antes is not null or a.despues is not null then
    raise exception 'la constancia guarda de más: tabla %, registro %, antes %, después %', a.tabla, a.registro_id, a.antes, a.despues;
  end if;
  if a.detalle <> '{"entidad": "leads", "filas": 1234, "filtros": {"desde": "2026-01-01", "hasta": "2026-06-30"}}'::jsonb then
    raise exception 'la constancia no es exactamente entidad, filas y filtros: %', a.detalle;
  end if;
  -- El origen se guarda normalizado (minúsculas), y nada más.
  r := pg_temp.dex_registrar(ada, 'cotizaciones', 5, jsonb_build_object('origen', upper(v_origen::text)));
  if r::jsonb -> 'ok' <> 'true'::jsonb then raise exception 'cotizaciones con origen debía pasar: %', r; end if;
  if (select detalle from public.actividad where actor_id = ada and accion = 'datos.exportado' and tabla = 'cotizaciones')
     <> jsonb_build_object('entidad', 'cotizaciones', 'filas', 5, 'filtros', jsonb_build_object('origen', v_origen::text)) then
    raise exception 'el origen no quedó normalizado';
  end if;

  for v_caso, v_entidad, v_filas, v_filtros, v_hint in select * from (values
    ('entidad que no se exporta', 'seguimientos', 10, '{}'::jsonb, 'p_entidad'),
    ('entidad nula', null, 10, '{}'::jsonb, 'p_entidad'),
    ('más de 250.000 filas', 'leads', 250001, '{}'::jsonb, 'p_filas'),
    ('filas negativas', 'leads', -1, '{}'::jsonb, 'p_filas'),
    ('filas nulas', 'leads', null, '{}'::jsonb, 'p_filas'),
    ('una clave que no es filtro', 'leads', 10, '{"telefono": "79195001"}'::jsonb, 'p_filtros'),
    ('un mes imposible', 'leads', 10, '{"desde": "2026-13-01"}'::jsonb, 'p_filtros'),
    ('un día imposible', 'leads', 10, '{"hasta": "2026-02-30"}'::jsonb, 'p_filtros'),
    ('una fecha con hora', 'leads', 10, '{"desde": "2026-01-01T00:00:00Z"}'::jsonb, 'p_filtros'),
    ('una fecha que no es texto', 'leads', 10, '{"desde": 20260101}'::jsonb, 'p_filtros'),
    ('desde después de hasta', 'leads', 10, '{"desde": "2026-06-30", "hasta": "2026-01-01"}'::jsonb, 'p_filtros'),
    ('vehículos sin origen', 'vehiculos', 10, '{}'::jsonb, 'p_filtros'),
    ('leads con origen', 'leads', 10, jsonb_build_object('origen', v_origen), 'p_filtros'),
    ('un origen que no es uuid', 'vehiculos', 10, '{"origen": "x"}'::jsonb, 'p_filtros'),
    ('un origen que no existe', 'vehiculos', 10, jsonb_build_object('origen', gen_random_uuid()), 'p_filtros'),
    ('filtros que no son objeto', 'leads', 10, '[]'::jsonb, 'p_filtros')
  ) t (caso, entidad, filas, filtros, hint) loop
    r := pg_temp.dex_registrar(ada, v_entidad, v_filas, v_filtros);
    if r <> '22023/' || v_hint then raise exception '%: debía dar 22023/% y dio %', v_caso, v_hint, r; end if;
  end loop;
  if pg_temp.dex_constancias(ada) <> 2 then raise exception 'un rechazo dejó constancia (%)', pg_temp.dex_constancias(ada); end if;
end $$;
rollback;
