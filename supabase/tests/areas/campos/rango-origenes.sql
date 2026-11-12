-- El rango en las RPC de campos de orígenes (9.04-2): `origen_campo_guardar` y `origen_campo_crear` lo aceptan como en leads,
-- `origen_campo_impacto(p_campo, p_cambios)` cuenta sólo los vehículos del origen del campo (acotado a 51), todo con `origenes.gestionar`.
-- El estático fija una sola versión de cada RPC, con sus grants, y que las ayudas del rango no se llaman desde afuera. Corre en PGlite
-- (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno y lo revierte.

-- @test rango en orígenes: los ayudantes
reset role;
create or replace function pg_temp.cmo_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

create or replace function pg_temp.cmo_codigo(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v_hint text;
begin
  perform pg_temp.cmo_como(p_quien);
  set local role authenticated;
  execute p_sql;
  reset role;
  return 'sin error';
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  reset role;
  return sqlstate || coalesce('/' || nullif(v_hint, ''), '');
end $f$;

create or replace function pg_temp.cmo_json(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  perform pg_temp.cmo_como(p_quien);
  set local role authenticated;
  execute p_sql into r;
  reset role;
  return r;
end $f$;

-- Dos orígenes manuales, cada uno con su campo «RO Año» (número), y dos personas con rol propio (la primera cuenta nace dueña: se le
-- quita): Pía gestiona los orígenes y Ana no tiene claves.
create or replace function pg_temp.cmo_preparar() returns void language plpgsql as $f$
declare o1 uuid; o2 uuid; p uuid; v_rol uuid; i int := 0;
begin
  insert into public.origenes (clave, nombre) values ('prueba_ro1', 'Prueba ro 1') returning id into o1;
  insert into public.origenes (clave, nombre) values ('prueba_ro2', 'Prueba ro 2') returning id into o2;
  insert into public.origenes_campos (id, origen_id, clave, etiqueta, tipo, orden) values
    ('00000000-0000-4000-8000-0000000992a1', o1, 'ro_anio', 'RO Año', 'numero', 1001),
    ('00000000-0000-4000-8000-0000000992b1', o1, 'ro_nota', 'RO Nota', 'texto', 1002),
    ('00000000-0000-4000-8000-0000000992a2', o2, 'ro_anio', 'RO Año', 'numero', 1001);
  foreach p in array array['00000000-0000-4000-8000-00000009920f', '00000000-0000-4000-8000-00000009920a']::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'RO ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('ro_rol_' || i, 'RO rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    if i = 1 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'origenes.gestionar', null, 'todos');
    end if;
  end loop;
end $f$;

create or replace function pg_temp.cmo_origen(p_clave text) returns uuid language sql as $f$
  select id from public.origenes where clave = p_clave
$f$;

create or replace function pg_temp.cmo_version(p_id uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.origenes_campos where id = p_id
$f$;

create or replace function pg_temp.cmo_rango(p_id uuid) returns text language sql as $f$
  select coalesce(minimo::text, '-') || '..' || coalesce(maximo::text, '-') from public.origenes_campos where id = p_id
$f$;

create or replace function pg_temp.cmo_guardar(p_quien uuid, p_id uuid, p_cambios jsonb) returns text language sql as $f$
  select pg_temp.cmo_codigo(p_quien, format('select public.origen_campo_guardar(%L, %L, %L)', p_id, pg_temp.cmo_version(p_id), p_cambios))
$f$;

-- @test rango en orígenes: guardar y crear aceptan y rechazan el rango como en leads
begin;
select pg_temp.cmo_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-00000009920f'; a uuid := '00000000-0000-4000-8000-0000000992a1';
        t uuid := '00000000-0000-4000-8000-0000000992b1'; j jsonb; r text;
begin
  r := pg_temp.cmo_guardar(pia, a, '{"minimo": 18, "maximo": 99}');
  if r <> 'sin error' or pg_temp.cmo_rango(a) <> '18..99' then raise exception 'poner 18–99: % / %', r, pg_temp.cmo_rango(a); end if;
  r := pg_temp.cmo_guardar(pia, a, '{"maximo": null}');
  if r <> 'sin error' or pg_temp.cmo_rango(a) <> '18..-' then raise exception 'quitar el máximo: % / %', r, pg_temp.cmo_rango(a); end if;
  r := pg_temp.cmo_guardar(pia, a, '{"minimo": 100, "maximo": 5}');
  if r <> '22023/maximo' then raise exception 'mínimo > máximo: %', r; end if;
  r := pg_temp.cmo_guardar(pia, a, '{"maximo": "x"}');
  if r <> '22023/maximo' then raise exception 'máximo que no es número: %', r; end if;
  r := pg_temp.cmo_guardar(pia, t, '{"maximo": 1}');
  if r <> '22023/minimo' then raise exception 'máximo en un texto: %', r; end if;
  r := pg_temp.cmo_guardar(pia, a, '{"valor_defecto": 5}');
  if r <> '22023/valor_defecto' then raise exception 'defecto fuera del rango: %', r; end if;
  j := pg_temp.cmo_json(pia, format('select public.origen_campo_crear(%L, %L, %L, %L, p_minimo => 18, p_maximo => 99)',
                                   pg_temp.cmo_origen('prueba_ro1'), 'ro_km', 'RO Km', 'numero'));
  if pg_temp.cmo_rango((j ->> 'id')::uuid) <> '18..99' then raise exception 'crear con rango: %', pg_temp.cmo_rango((j ->> 'id')::uuid); end if;
  r := pg_temp.cmo_codigo(pia, format('select public.origen_campo_crear(%L, %L, %L, %L, p_minimo => 1)',
                                     pg_temp.cmo_origen('prueba_ro1'), 'ro_txt', 'RO Txt', 'texto'));
  if r <> '22023/minimo' then raise exception 'crear un texto con mínimo: %', r; end if;
end $$;
rollback;

-- @test rango en orígenes: el impacto cuenta sólo los vehículos de su origen
begin;
select pg_temp.cmo_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-00000009920f'; a uuid := '00000000-0000-4000-8000-0000000992a1';
        t uuid := '00000000-0000-4000-8000-0000000992b1'; o1 uuid := pg_temp.cmo_origen('prueba_ro1');
        o2 uuid := pg_temp.cmo_origen('prueba_ro2'); quien uuid := (select id from public.perfiles order by id limit 1); j jsonb;
begin
  insert into public.vehiculos (origen_id, titulo, creado_por, atributos) values
    (o1, 'RO 1', quien, '{"ro_anio": 10}'), (o1, 'RO 2', quien, '{"ro_anio": 50}'), (o1, 'RO 3', quien, '{"ro_anio": 120}'),
    (o1, 'RO 4', quien, '{}'), (o2, 'RO 5', quien, '{"ro_anio": 120}');
  j := pg_temp.cmo_json(pia, format('select public.origen_campo_impacto(%L, %L)', a, '{"minimo": 18, "maximo": 99}'));
  if jsonb_path_query_first(j, '$.fuera_de_rango') <> '2'::jsonb then raise exception 'propuesto 18–99: %', j; end if;
  if jsonb_path_query_first(j, '$.total') <> '4'::jsonb then raise exception 'el total dejó de ser del origen: %', j; end if;
  j := pg_temp.cmo_json(pia, format('select public.origen_campo_impacto(%L)', a));
  if jsonb_path_query_first(j, '$.fuera_de_rango') <> 'null'::jsonb then raise exception 'sin rango vigente: %', j; end if;
  update public.origenes_campos set maximo = 100 where id = a;
  j := pg_temp.cmo_json(pia, format('select public.origen_campo_impacto(%L)', a));
  if jsonb_path_query_first(j, '$.fuera_de_rango') <> '1'::jsonb then raise exception 'vigente hasta 100: %', j; end if;
  j := pg_temp.cmo_json(pia, format('select public.origen_campo_impacto(%L, %L)', t, '{"minimo": 1}'));
  if jsonb_path_query_first(j, '$.fuera_de_rango') <> 'null'::jsonb then raise exception 'en un texto: %', j; end if;
end $$;
rollback;

-- @test rango en orígenes: sin origenes.gestionar, 42501
begin;
select pg_temp.cmo_preparar();
do $$
declare ana uuid := '00000000-0000-4000-8000-00000009920a'; a uuid := '00000000-0000-4000-8000-0000000992a1'; r text;
begin
  r := pg_temp.cmo_codigo(ana, format('select public.origen_campo_impacto(%L, %L)', a, '{}'));
  if r <> '42501' then raise exception 'impacto sin la clave: %', r; end if;
  r := pg_temp.cmo_guardar(ana, a, '{"minimo": 1}');
  if r <> '42501' then raise exception 'guardar sin la clave: %', r; end if;
  r := pg_temp.cmo_codigo(ana, format('select public.origen_campo_crear(%L, %L, %L, %L, p_minimo => 1)',
                                     pg_temp.cmo_origen('prueba_ro1'), 'ro_x', 'RO X', 'numero'));
  if r <> '42501' then raise exception 'crear sin la clave: %', r; end if;
end $$;
rollback;

-- @test rango en orígenes: una sola versión de cada RPC, con sus grants; las ayudas del rango no se llaman desde afuera
do $$
declare v_nombre text; v_n int; p record;
begin
  foreach v_nombre in array array['origen_campo_crear', 'origen_campo_guardar', 'origen_campo_impacto'] loop
    select count(*)::int into v_n from pg_proc x join pg_namespace n on n.oid = x.pronamespace where n.nspname = 'public' and x.proname = v_nombre;
    if v_n <> 1 then raise exception '% tiene % versiones (¿falta un drop de la firma vieja?)', v_nombre, v_n; end if;
    select x.oid, x.prosecdef, x.proconfig, x.prosrc into p
      from pg_proc x join pg_namespace n on n.oid = x.pronamespace where n.nspname = 'public' and x.proname = v_nombre;
    if not p.prosecdef or not ('search_path=""' = any (coalesce(p.proconfig, '{}'))) then raise exception '% sin definer o search_path', v_nombre; end if;
    if position('''origenes.gestionar''' in p.prosrc) = 0 then raise exception '% no pide origenes.gestionar', v_nombre; end if;
    if has_function_privilege('anon', p.oid, 'execute') then raise exception '% ejecutable por anon', v_nombre; end if;
    if exists (select 1 from aclexplode((select proacl from pg_proc where oid = p.oid)) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception '% ejecutable por PUBLIC', v_nombre;
    end if;
    if not has_function_privilege('authenticated', p.oid, 'execute') then raise exception '% sin execute para authenticated', v_nombre; end if;
  end loop;
  foreach v_nombre in array array['_valor_fuera_de_rango', '_atributos_rango', '_campo_limite', '_campo_rango'] loop
    select x.oid, x.proconfig into p from pg_proc x join pg_namespace n on n.oid = x.pronamespace where n.nspname = 'public' and x.proname = v_nombre;
    if p.oid is null then raise exception 'falta la ayuda %', v_nombre; end if;
    if has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute') then
      raise exception 'la ayuda % se llama desde afuera', v_nombre;
    end if;
    if not ('search_path=""' = any (coalesce(p.proconfig, '{}'))) then raise exception 'la ayuda % sin search_path', v_nombre; end if;
  end loop;
end $$;
