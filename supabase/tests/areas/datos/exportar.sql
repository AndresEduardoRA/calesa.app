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

-- @test exportar: con dos cuentas y la consulta del route handler, de un lead ajeno sale el teléfono enmascarado y ningún campo de sólo cartera
begin;
select pg_temp.dex_preparar();
-- Un campo de sólo cartera y uno público, como los crearía quien configura leads.
insert into public.leads_campos (clave, etiqueta, tipo, solo_cartera) values ('dex_privado', 'DEX privado', 'texto', true), ('dex_publico', 'DEX público', 'texto', false);
do $$
declare ada uuid := '00000000-0000-4000-8000-00000009905a'; bea uuid := '00000000-0000-4000-8000-00000009905b';
        v_la uuid := gen_random_uuid(); v_lb uuid := gen_random_uuid(); v_web uuid := (select id from public.origenes_lead where clave = 'web');
        v_filas jsonb; v_fila jsonb; v_tel_la text; v_tel_lb text; v_n int;
        -- La consulta del route handler: la de PostgREST, una página por cursor (creado_en, id) con el tope de max_rows.
        v_consulta constant text := 'select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from (select * from public.datos_exportar_leads() order by creado_en desc, id desc limit 1000) t';
begin
  perform pg_temp.dex_como(bea, format('select public.crear_lead(%L, %L::jsonb)', v_lb, jsonb_build_object('nombre', 'DEX de Bea', 'telefono_principal', '79195002',
    'origen_lead_id', v_web, 'atributos', jsonb_build_object('dex_privado', 'secreto de Bea', 'dex_publico', 'abierto'))));
  perform pg_temp.dex_como(ada, format('select public.crear_lead(%L, %L::jsonb)', v_la, jsonb_build_object('nombre', 'DEX de Ada', 'telefono_principal', '79195001',
    'origen_lead_id', v_web)));
  select telefono_principal into v_tel_la from public.leads where id = v_la;
  select telefono_principal into v_tel_lb from public.leads where id = v_lb;
  if v_tel_la is null or v_tel_lb is null then raise exception 'el terreno no creó los dos leads'; end if;
  if (select atributos ->> 'dex_privado' from public.leads where id = v_lb) is distinct from 'secreto de Bea' then raise exception 'el lead de Bea no guardó el campo privado'; end if;

  -- Ada (exporta todo, ve «todos»): el lead de Bea con el teléfono enmascarado, sin el campo privado y con el público.
  v_filas := pg_temp.dex_como(ada, v_consulta);
  v_fila := (select f from jsonb_array_elements(v_filas) f where f ->> 'id' = v_lb::text);
  if v_fila is null then raise exception 'Ada no recibe el lead de Bea'; end if;
  if v_fila ->> 'telefono_principal' is distinct from public.enmascarar_telefono(v_tel_lb) or v_fila ->> 'telefono_principal' = v_tel_lb then
    raise exception 'el teléfono del lead ajeno no va enmascarado: %', v_fila ->> 'telefono_principal';
  end if;
  if (v_fila -> 'telefono_visible') <> 'false'::jsonb or (v_fila -> 'en_cartera') <> 'false'::jsonb then raise exception 'el lead ajeno figura en la cartera de Ada: %', v_fila; end if;
  if (v_fila -> 'atributos') ? 'dex_privado' then raise exception 'el campo de sólo cartera sale del lead ajeno: %', v_fila -> 'atributos'; end if;
  if (v_fila -> 'atributos' ->> 'dex_publico') is distinct from 'abierto' then raise exception 'el campo público no sale: %', v_fila -> 'atributos'; end if;
  -- Ninguna fila fuera de su cartera trae el teléfono guardado ni un campo de sólo cartera, y sin leads.numero_global.ver no hay número global.
  select count(*) into v_n from jsonb_array_elements(v_filas) f join public.leads l on l.id = (f ->> 'id')::uuid
   where (f -> 'en_cartera') = 'false'::jsonb
     and (f ->> 'telefono_principal' = l.telefono_principal
          or exists (select 1 from public.leads_campos c where c.solo_cartera and (f -> 'atributos') ? c.clave));
  if v_n <> 0 then raise exception '% filas ajenas con el teléfono o un campo privado', v_n; end if;
  if exists (select 1 from jsonb_array_elements(v_filas) f where f ->> 'numero' is not null) then raise exception 'sin leads.numero_global.ver salió un número global'; end if;
  -- Las columnas son las del archivo: ninguna marca de quien mira ni el nombre de quien numeró.
  if (select array_agg(k order by k) from jsonb_object_keys(v_fila) k) <> array['actualizado_en', 'atributos', 'creado_en', 'dueno_id', 'en_cartera', 'id', 'nombre',
       'numero', 'origen_lead_id', 'telefono_cc', 'telefono_principal', 'telefono_visible', 'tipo_lead_id', 'ultimo_seguimiento_en'] then
    raise exception 'las columnas no son las del archivo: %', (select array_agg(k order by k) from jsonb_object_keys(v_fila) k);
  end if;
  -- El control: el lead propio de Ada sale completo.
  v_fila := (select f from jsonb_array_elements(v_filas) f where f ->> 'id' = v_la::text);
  if v_fila is null or v_fila ->> 'telefono_principal' is distinct from v_tel_la or (v_fila -> 'en_cartera') <> 'true'::jsonb then
    raise exception 'el lead propio de Ada no sale completo: %', v_fila;
  end if;

  -- Bea (ve «propios»): sólo su cartera, con su lead completo y el campo privado (lo recorta la cartera, no la función).
  v_filas := pg_temp.dex_como(bea, v_consulta);
  if exists (select 1 from jsonb_array_elements(v_filas) f where (f -> 'en_cartera') <> 'true'::jsonb) then raise exception 'Bea recibe leads fuera de su cartera'; end if;
  if exists (select 1 from jsonb_array_elements(v_filas) f where f ->> 'id' = v_la::text) then raise exception 'Bea recibe el lead de Ada'; end if;
  v_fila := (select f from jsonb_array_elements(v_filas) f where f ->> 'id' = v_lb::text);
  if v_fila is null or v_fila ->> 'telefono_principal' is distinct from v_tel_lb or (v_fila -> 'atributos' ->> 'dex_privado') is distinct from 'secreto de Bea' then
    raise exception 'Bea no recibe su lead completo: %', v_fila;
  end if;
end $$;
rollback;

-- @test exportar: la lectura es invocadora y se inlinea (sin Function Scan): el cursor y el límite llegan al índice del listado
begin;
select pg_temp.dex_preparar();
do $$
declare r record; v_plan text := ''; v_fn regprocedure := 'public.datos_exportar_leads()'::regprocedure;
begin
  -- Si pierde una de estas cosas, Postgres deja de inlinearla y calcula las columnas caras de todos los leads antes de cortar la página.
  select p.prosecdef, p.provolatile, p.proisstrict, p.proconfig, l.lanname, p.prosqlbody into r
    from pg_proc p join pg_language l on l.oid = p.prolang where p.oid = v_fn;
  if r.prosecdef then raise exception 'datos_exportar_leads es security definer: ni se inlinea ni respeta la sesión'; end if;
  if r.provolatile <> 's' then raise exception 'datos_exportar_leads no es stable (%)', r.provolatile; end if;
  if r.proisstrict then raise exception 'datos_exportar_leads es strict'; end if;
  if r.proconfig is not null then raise exception 'datos_exportar_leads tiene SET (%)', r.proconfig; end if;
  if r.lanname <> 'sql' then raise exception 'datos_exportar_leads no es SQL'; end if;
  if r.prosqlbody is not null then raise exception 'datos_exportar_leads es begin atomic: depende de leads_vista y rompe _leads_vista_crear()'; end if;
  if has_function_privilege('anon', v_fn, 'execute') then raise exception 'anon puede llamar datos_exportar_leads'; end if;
  if not has_function_privilege('authenticated', v_fn, 'execute') then raise exception 'authenticated no puede llamar datos_exportar_leads'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000009905a', true);
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000009905a","role":"authenticated"}', true);
  set local role authenticated;
  for r in execute 'explain select id, creado_en from public.datos_exportar_leads() where creado_en < now() order by creado_en desc, id desc limit 1001' loop
    v_plan := v_plan || E'\n' || r."QUERY PLAN";
  end loop;
  reset role;
  if v_plan ~* 'Function Scan' then raise exception E'datos_exportar_leads aparece como un Function Scan (no se inlinea):%', v_plan; end if;
end $$;
rollback;
