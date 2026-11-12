-- Las plantillas de leads por empresa (9.04-4): `ajustes_leads` (fila única), `ajustes_leads_leer()`, `embudo_plantilla_guardar()` con
-- `leads.configurar` y PT409, y `_embudo_defecto_de()`, que hace nacer el embudo con la plantilla sin tocar los que ya existen. El mensaje del portal
-- tiene su archivo (`portal.sql`); aquí queda su caso del assert del PLAN (sin {codigo}). Corre en PGlite (`pnpm db:probar`, después de la lista fija);
-- cada bloque arma su terreno y lo revierte.

-- @test plantillas: los ayudantes
reset role;
create or replace function pg_temp.pla_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- El error de un SQL corrido como esa persona: «sqlstate» o «sqlstate/hint», o «sin error».
create or replace function pg_temp.pla_codigo(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v_hint text;
begin
  perform pg_temp.pla_como(p_quien);
  set local role authenticated;
  execute p_sql;
  reset role;
  return 'sin error';
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  reset role;
  return sqlstate || coalesce('/' || nullif(v_hint, ''), '');
end $f$;

-- La respuesta jsonb de un SQL corrido como esa persona (un error sube).
create or replace function pg_temp.pla_json(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  perform pg_temp.pla_como(p_quien);
  set local role authenticated;
  execute p_sql into r;
  reset role;
  return r;
end $f$;

-- Personas con rol propio (la primera cuenta nace dueña: se le quita). Gala (…f) tiene `leads.configurar`; Cora (…c), sólo `leads.campos.gestionar`;
-- A, B y C (…a1, …b1, …c1) ven leads («todos»), que es lo que pide `embudo_por_defecto()`.
create or replace function pg_temp.pla_preparar() returns void language plpgsql as $f$
declare p uuid; v_rol uuid; i int := 0;
begin
  foreach p in array array['00000000-0000-4000-8000-00000009940f', '00000000-0000-4000-8000-00000009940c', '00000000-0000-4000-8000-0000000994a1',
                           '00000000-0000-4000-8000-0000000994b1', '00000000-0000-4000-8000-0000000994c1']::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'PLA ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('pla_rol_' || i, 'PLA rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
      values (v_rol, case i when 1 then 'leads.configurar' when 2 then 'leads.campos.gestionar' else 'leads.ver' end, null, 'todos');
  end loop;
end $f$;

create or replace function pg_temp.pla_version_embudo() returns timestamptz language sql as $f$
  select embudo_actualizado_en from public.ajustes_leads where id = 1
$f$;

create or replace function pg_temp.pla_version_portal() returns timestamptz language sql as $f$
  select portal_actualizado_en from public.ajustes_leads where id = 1
$f$;

-- Las etapas del embudo por defecto de esa persona, sin ids, en su orden.
create or replace function pg_temp.pla_etapas(p_quien uuid) returns jsonb language sql as $f$
  select coalesce(jsonb_agg(e.x - 'id' order by e.o), '[]'::jsonb)
    from jsonb_array_elements(pg_temp.pla_json(p_quien, 'select public.embudo_por_defecto()') -> 'embudo' -> 'etapas') with ordinality e (x, o)
$f$;

-- Una plantilla válida de 4 etapas, como la normaliza la base.
create or replace function pg_temp.pla_cuatro() returns jsonb language sql as $f$
  select '[{"nombre": "Entra", "color": "azul", "es_inicial": true, "es_ganada": false, "es_perdida": false},
           {"nombre": "Prueba", "color": "naranja", "es_inicial": false, "es_ganada": false, "es_perdida": false},
           {"nombre": "Compra", "color": "verde", "es_inicial": false, "es_ganada": true, "es_perdida": false},
           {"nombre": "Se fue", "color": "rojo", "es_inicial": false, "es_ganada": false, "es_perdida": true}]'::jsonb
$f$;

-- Guardar la plantilla como esa persona, con la versión vigente: el error o «sin error».
create or replace function pg_temp.pla_guardar(p_quien uuid, p_etapas jsonb) returns text language sql as $f$
  select pg_temp.pla_codigo(p_quien, format('select public.embudo_plantilla_guardar(%L, %L)', p_etapas, pg_temp.pla_version_embudo()))
$f$;

-- @test plantillas: un embudo nuevo nace con la plantilla y uno que ya existía no cambia
begin;
select pg_temp.pla_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-0000000994a1'; b uuid := '00000000-0000-4000-8000-0000000994b1';
        c uuid := '00000000-0000-4000-8000-0000000994c1'; v_fabrica jsonb; v_x uuid := gen_random_uuid(); v jsonb;
begin
  select jsonb_agg(jsonb_build_object('nombre', e ->> 'nombre', 'color', e ->> 'color',
           'es_inicial', coalesce((e ->> 'es_inicial')::boolean, false), 'es_ganada', coalesce((e ->> 'es_ganada')::boolean, false),
           'es_perdida', coalesce((e ->> 'es_perdida')::boolean, false)) order by o)
    into v_fabrica from jsonb_array_elements(public._embudo_etapas_de_fabrica()) with ordinality t (e, o);
  if jsonb_array_length(v_fabrica) <> 6 or v_fabrica -> 0 ->> 'nombre' <> 'Nuevo' then raise exception 'las de fábrica: %', v_fabrica; end if;
  if pg_temp.pla_etapas(a) <> v_fabrica then raise exception 'sin plantilla, A no nació con las de fábrica: %', pg_temp.pla_etapas(a); end if;
  update public.ajustes_leads set embudo_etapas = pg_temp.pla_cuatro() where id = 1;
  if pg_temp.pla_etapas(b) <> pg_temp.pla_cuatro() then raise exception 'B no nació con la plantilla: %', pg_temp.pla_etapas(b); end if;
  if pg_temp.pla_etapas(a) <> v_fabrica then raise exception 'el embudo de A cambió con la plantilla: %', pg_temp.pla_etapas(a); end if;
  -- Por el ayudante, como postgres: alguien sin embudo nace con la plantilla.
  insert into auth.users (id, email, raw_app_meta_data) values (v_x, v_x || '@ejemplo.com', '{"invitado": true}');
  select jsonb_agg(x - 'id' order by o) into v
    from jsonb_array_elements(public._embudo_json(public._embudo_defecto_de(v_x)) -> 'etapas') with ordinality t (x, o);
  if v <> pg_temp.pla_cuatro() then raise exception '_embudo_defecto_de no tomó la plantilla: %', v; end if;
  update public.ajustes_leads set embudo_etapas = null where id = 1;
  if pg_temp.pla_etapas(c) <> v_fabrica then raise exception 'con la plantilla en null, C no nació con las de fábrica: %', pg_temp.pla_etapas(c); end if;
  if pg_temp.pla_etapas(b) <> pg_temp.pla_cuatro() then raise exception 'el embudo de B cambió al restablecer: %', pg_temp.pla_etapas(b); end if;
end $$;
rollback;

-- @test plantillas: ajustes_leads_leer() da las etapas (de fábrica o de la plantilla) y el mensaje, con sus claves exactas
begin;
select pg_temp.pla_preparar();
do $$
declare cora uuid := '00000000-0000-4000-8000-00000009940c'; j jsonb;
begin
  j := pg_temp.pla_json(cora, 'select public.ajustes_leads_leer()');
  if (select array_agg(k order by k) from jsonb_object_keys(j) k) <> array['embudo', 'portal']
     or (select array_agg(k order by k) from jsonb_object_keys(j -> 'embudo') k) <> array['actualizado_en', 'de_fabrica', 'etapas']
     or (select array_agg(k order by k) from jsonb_object_keys(j -> 'portal') k) <> array['actualizado_en', 'mensaje'] then
    raise exception 'las claves de la lectura: %', j;
  end if;
  if jsonb_path_query_first(j, '$.embudo.de_fabrica') <> 'true'::jsonb or j -> 'embudo' -> 'etapas' <> public._embudo_etapas_de_fabrica()
     or jsonb_path_query_first(j, '$.portal.mensaje') <> 'null'::jsonb then
    raise exception 'sin plantillas: %', j;
  end if;
  if (j -> 'embudo' ->> 'actualizado_en')::timestamptz <> pg_temp.pla_version_embudo()
     or (j -> 'portal' ->> 'actualizado_en')::timestamptz <> pg_temp.pla_version_portal() then
    raise exception 'las versiones de la lectura: %', j;
  end if;
  update public.ajustes_leads set embudo_etapas = pg_temp.pla_cuatro(), portal_mensaje = 'Hola {cliente}: {codigo} / {clave}' where id = 1;
  j := pg_temp.pla_json(cora, 'select public.ajustes_leads_leer()');
  if jsonb_path_query_first(j, '$.embudo.de_fabrica') <> 'false'::jsonb or j -> 'embudo' -> 'etapas' <> pg_temp.pla_cuatro()
     or jsonb_path_query_first(j, '$.portal.mensaje') <> to_jsonb('Hola {cliente}: {codigo} / {clave}'::text) then
    raise exception 'con plantillas: %', j;
  end if;
end $$;
rollback;

-- @test plantillas: la lectura y los ayudantes, «definer» con search_path vacío y execute justo
do $$
declare r record; v_fallas text := '';
begin
  for r in select p.oid, p.proname, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('ajustes_leads_leer', '_embudo_etapas_de_fabrica', '_embudo_defecto_de') loop
    if not ('search_path=""' = any (coalesce(r.proconfig, '{}'))) then v_fallas := v_fallas || E'\n  sin search_path vacío: ' || r.proname; end if;
    if has_function_privilege('anon', r.oid, 'execute') then v_fallas := v_fallas || E'\n  anon ejecuta: ' || r.proname; end if;
    if r.proname = 'ajustes_leads_leer' then
      if not r.prosecdef then v_fallas := v_fallas || E'\n  no es definer: ' || r.proname; end if;
      if not has_function_privilege('authenticated', r.oid, 'execute') then v_fallas := v_fallas || E'\n  authenticated no la lee'; end if;
    elsif has_function_privilege('authenticated', r.oid, 'execute') then
      v_fallas := v_fallas || E'\n  la app llama un ayudante: ' || r.proname;
    end if;
  end loop;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname in ('ajustes_leads_leer', '_embudo_etapas_de_fabrica', '_embudo_defecto_de')) <> 3 then
    v_fallas := v_fallas || E'\n  una firma de más o de menos';
  end if;
  if v_fallas <> '' then raise exception 'Las funciones de las plantillas tienen un hueco:%', v_fallas; end if;
end $$;
