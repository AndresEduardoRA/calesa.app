-- El mensaje del portal por empresa (9.04-4): `portal_mensaje_guardar()` con `leads.configurar`, sus reglas (22023, hint `texto`), PT409 y su versión
-- propia, que no mueve la del embudo. El caso «sin {codigo}» del assert del PLAN está en `plantillas.sql`. Corre en PGlite (`pnpm db:probar`); cada
-- bloque arma su terreno y lo revierte.

-- @test portal: los ayudantes
reset role;
-- El error de un SQL corrido como esa persona: «sqlstate» o «sqlstate/hint», o «sin error».
create or replace function pg_temp.pmo_codigo(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v_hint text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute p_sql;
  reset role;
  return 'sin error';
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  reset role;
  return sqlstate || coalesce('/' || nullif(v_hint, ''), '');
end $f$;

-- Gala (…f) tiene `leads.configurar`; Cora (…c), sólo `leads.campos.gestionar` (la primera cuenta nace dueña: se le quita).
create or replace function pg_temp.pmo_preparar() returns void language plpgsql as $f$
declare p uuid; v_rol uuid; i int := 0;
begin
  foreach p in array array['00000000-0000-4000-8000-00000009950f', '00000000-0000-4000-8000-00000009950c']::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'PMO ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('pmo_rol_' || i, 'PMO rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
      values (v_rol, case when i = 1 then 'leads.configurar' else 'leads.campos.gestionar' end, null, 'todos');
  end loop;
end $f$;

create or replace function pg_temp.pmo_version() returns timestamptz language sql as $f$
  select portal_actualizado_en from public.ajustes_leads where id = 1
$f$;

create or replace function pg_temp.pmo_mensaje() returns text language sql as $f$
  select portal_mensaje from public.ajustes_leads where id = 1
$f$;

-- Guardar como esa persona, con la versión vigente.
create or replace function pg_temp.pmo_guardar(p_quien uuid, p_texto text) returns text language sql as $f$
  select pg_temp.pmo_codigo(p_quien, format('select public.portal_mensaje_guardar(%L, %L)', p_texto, pg_temp.pmo_version()))
$f$;

-- @test portal: portal_mensaje_guardar() es «definer», con search_path vacío; su validador no lo llama la app
do $$
declare r record; v_fallas text := '';
begin
  for r in select p.oid, p.proname, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('portal_mensaje_guardar', '_portal_mensaje_normalizar') loop
    if not ('search_path=""' = any (coalesce(r.proconfig, '{}'))) then v_fallas := v_fallas || E'\n  sin search_path vacío: ' || r.proname; end if;
    if has_function_privilege('anon', r.oid, 'execute') then v_fallas := v_fallas || E'\n  anon ejecuta: ' || r.proname; end if;
    if r.proname = 'portal_mensaje_guardar' then
      if not r.prosecdef then v_fallas := v_fallas || E'\n  no es definer: ' || r.proname; end if;
      if not has_function_privilege('authenticated', r.oid, 'execute') then v_fallas := v_fallas || E'\n  authenticated no la llama'; end if;
    elsif has_function_privilege('authenticated', r.oid, 'execute') then
      v_fallas := v_fallas || E'\n  la app llama un ayudante: ' || r.proname;
    end if;
  end loop;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname in ('portal_mensaje_guardar', '_portal_mensaje_normalizar')) <> 2 then
    v_fallas := v_fallas || E'\n  una firma de más o de menos';
  end if;
  if v_fallas <> '' then raise exception 'El mensaje del portal tiene un hueco:%', v_fallas; end if;
end $$;

-- @test portal: sin leads.configurar, 42501 (también con versión vieja); con ella, guarda
begin;
select pg_temp.pmo_preparar();
do $$
declare gala uuid := '00000000-0000-4000-8000-00000009950f'; cora uuid := '00000000-0000-4000-8000-00000009950c'; r text;
begin
  r := pg_temp.pmo_guardar(cora, 'Hola {cliente}: {codigo} / {clave}');
  if r <> '42501' then raise exception 'con sólo leads.campos.gestionar: %', r; end if;
  r := pg_temp.pmo_codigo(cora, format('select public.portal_mensaje_guardar(%L, %L)', 'Hola {codigo} {clave}', '2000-01-01'));
  if r <> '42501' then raise exception 'sin permiso y con versión vieja, el permiso va primero: %', r; end if;
  if pg_temp.pmo_mensaje() is not null then raise exception 'sin permiso se guardó algo'; end if;
  r := pg_temp.pmo_guardar(gala, 'Hola {cliente}: {codigo} / {clave}');
  if r <> 'sin error' or pg_temp.pmo_mensaje() is distinct from 'Hola {cliente}: {codigo} / {clave}' then raise exception 'Gala no guardó: %', r; end if;
end $$;
rollback;

-- @test portal: cada regla da 22023 con hint texto; en blanco es null, lo válido queda normalizado, repetirlo no mueve la versión y null restablece
begin;
select pg_temp.pmo_preparar();
do $$
declare gala uuid := '00000000-0000-4000-8000-00000009950f'; r text; v_caso text; v_texto text; v_antes timestamptz;
begin
  for v_caso, v_texto in select * from (values
    ('sin {clave}', 'Hola {cliente}, entra con {codigo}'),
    ('variable desconocida', 'Hola {telefono}: {codigo} / {clave}'),
    ('1001 caracteres', '{codigo}{clave}' || repeat('x', 986))
  ) t (caso, texto) loop
    r := pg_temp.pmo_guardar(gala, v_texto);
    if r <> '22023/texto' then raise exception '% dio %', v_caso, r; end if;
  end loop;
  r := pg_temp.pmo_guardar(gala, '{codigo}{clave}' || repeat('x', 985));
  if r <> 'sin error' or char_length(pg_temp.pmo_mensaje()) <> 1000 then raise exception '1000 caracteres: %', r; end if;
  r := pg_temp.pmo_guardar(gala, E'  Hola {cliente}\r\nCódigo {codigo}, clave {clave}\r\n{empresa} · {direccion}  \n');
  if r <> 'sin error' or pg_temp.pmo_mensaje() is distinct from E'Hola {cliente}\nCódigo {codigo}, clave {clave}\n{empresa} · {direccion}' then
    raise exception 'el válido no quedó normalizado: % / %', r, pg_temp.pmo_mensaje();
  end if;
  v_antes := pg_temp.pmo_version();
  r := pg_temp.pmo_guardar(gala, E'Hola {cliente}\nCódigo {codigo}, clave {clave}\n{empresa} · {direccion}');
  if r <> 'sin error' or pg_temp.pmo_version() <> v_antes then raise exception 'repetirlo movió la versión: %', r; end if;
  r := pg_temp.pmo_guardar(gala, E'  \r\n ');
  if r <> 'sin error' or pg_temp.pmo_mensaje() is not null or pg_temp.pmo_version() <= v_antes then raise exception 'en blanco no restableció: %', r; end if;
  r := pg_temp.pmo_guardar(gala, 'Hola {codigo} {clave}');
  r := pg_temp.pmo_guardar(gala, null);
  if r <> 'sin error' or pg_temp.pmo_mensaje() is not null then raise exception 'null no restableció: %', r; end if;
end $$;
rollback;

-- @test portal: con versión vieja, PT409; sin versión, P0001; guardar el mensaje no mueve la versión del embudo
begin;
select pg_temp.pmo_preparar();
do $$
declare gala uuid := '00000000-0000-4000-8000-00000009950f'; r text; v_vieja timestamptz := pg_temp.pmo_version();
        v_embudo timestamptz := (select embudo_actualizado_en from public.ajustes_leads where id = 1);
begin
  r := pg_temp.pmo_guardar(gala, 'Hola {codigo} {clave}');
  if r <> 'sin error' or pg_temp.pmo_version() <= v_vieja then raise exception 'guardar no movió la versión: %', r; end if;
  if (select embudo_actualizado_en from public.ajustes_leads where id = 1) <> v_embudo then raise exception 'guardar el mensaje movió la versión del embudo'; end if;
  r := pg_temp.pmo_codigo(gala, format('select public.portal_mensaje_guardar(%L, %L)', 'Otro {codigo} {clave}', v_vieja));
  if r <> 'PT409' then raise exception 'con versión vieja: %', r; end if;
  r := pg_temp.pmo_codigo(gala, format('select public.portal_mensaje_guardar(%L, null)', 'Otro {codigo} {clave}'));
  if r <> 'P0001' then raise exception 'sin versión: %', r; end if;
end $$;
rollback;
