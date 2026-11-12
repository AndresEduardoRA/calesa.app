-- El campo «principal» de un origen (6.13): uno por origen como mucho (índice único parcial), activo y nunca un monto (checks); se escribe
-- sólo por `origen_campo_crear` y `origen_campo_guardar` con `origenes.gestionar` (42501 antes que la versión); marcar otro desmarca el
-- anterior y mueve su versión; desactivar el principal lo desmarca; la versión vieja da PT409 sin desmarcar nada. La carrera de dos marcas
-- a la vez, en carreras.mjs. Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno y lo revierte.

-- @test campo principal: los ayudantes
reset role;
create or replace function pg_temp.pp_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- El error de un SQL corrido como esa persona: «sqlstate» o «sqlstate/hint», o «sin error».
create or replace function pg_temp.pp_codigo(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v_hint text;
begin
  perform pg_temp.pp_como(p_quien);
  set local role authenticated;
  execute p_sql;
  reset role;
  return 'sin error';
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  reset role;
  return sqlstate || coalesce('/' || nullif(v_hint, ''), '');
end $f$;

-- La respuesta jsonb de una RPC corrida como esa persona (un error sube).
create or replace function pg_temp.pp_json(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  perform pg_temp.pp_como(p_quien);
  set local role authenticated;
  execute p_sql into r;
  reset role;
  return r;
end $f$;

-- Un origen manual con cuatro campos propios (texto «a», texto «b», texto «c», moneda «m»), y dos personas con rol propio (la primera
-- cuenta nace dueña: se le quita): Pía gestiona los orígenes y Ana no tiene claves.
create or replace function pg_temp.pp_preparar() returns void language plpgsql as $f$
declare o uuid; p uuid; v_rol uuid; i int := 0;
begin
  insert into public.origenes (clave, nombre) values ('prueba_pp', 'Prueba pp') returning id into o;
  insert into public.origenes_campos (id, origen_id, clave, etiqueta, tipo, orden) values
    ('00000000-0000-4000-8000-0000000990a1', o, 'pp_a', 'PP A', 'texto', 1001),
    ('00000000-0000-4000-8000-0000000990b1', o, 'pp_b', 'PP B', 'texto', 1002),
    ('00000000-0000-4000-8000-0000000990c1', o, 'pp_c', 'PP C', 'texto', 1003),
    ('00000000-0000-4000-8000-0000000990d1', o, 'pp_m', 'PP M', 'moneda', 1004);
  -- Versiones de un minuto atrás (sin el trigger): dentro de la transacción del bloque `now()` no avanza y desmarcar no se notaría.
  set local session_replication_role = replica;
  update public.origenes_campos set actualizado_en = now() - interval '1 minute' where origen_id = o;
  set local session_replication_role = origin;
  foreach p in array array['00000000-0000-4000-8000-00000009900f', '00000000-0000-4000-8000-00000009900a']::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'PP ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('pp_rol_' || i, 'PP rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    if i = 1 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'origenes.gestionar', null, 'todos');
    end if;
  end loop;
end $f$;

create or replace function pg_temp.pp_origen() returns uuid language sql as $f$
  select id from public.origenes where clave = 'prueba_pp'
$f$;

create or replace function pg_temp.pp_version(p_id uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.origenes_campos where id = p_id
$f$;

-- Los principales del origen de prueba, en orden de clave.
create or replace function pg_temp.pp_principales() returns text language sql as $f$
  select coalesce(string_agg(clave, ',' order by clave), '') from public.origenes_campos
  where origen_id = pg_temp.pp_origen() and principal
$f$;

-- El sqlstate de un SQL corrido como postgres (por encima de la RLS), o «sin error».
create or replace function pg_temp.pp_sqlstate(p_sql text) returns text language plpgsql as $f$
begin
  execute p_sql;
  return 'sin error';
exception when others then
  return sqlstate;
end $f$;

-- @test campo principal: dos en un origen no caben; desactivado o monto no puede serlo (la base, por encima de las RPC)
begin;
select pg_temp.pp_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-0000000990a1'; b uuid := '00000000-0000-4000-8000-0000000990b1';
        m uuid := '00000000-0000-4000-8000-0000000990d1'; r text;
begin
  if pg_temp.pp_principales() <> '' then raise exception 'un campo nació principal'; end if;
  if (select count(*) from (select 1 from public.origenes_campos where principal limit 1) q) <> 0 then
    raise exception 'la migración dejó algún principal: no debía rellenar';
  end if;
  update public.origenes_campos set principal = true where id = a;
  r := pg_temp.pp_sqlstate(format('update public.origenes_campos set principal = true where id = %L', b));
  if r <> '23505' then raise exception 'dos principales en un origen: %', r; end if;
  r := pg_temp.pp_sqlstate(format('update public.origenes_campos set activo = false where id = %L', a));
  if r <> '23514' then raise exception 'un principal desactivado: %', r; end if;
  r := pg_temp.pp_sqlstate(format('update public.origenes_campos set principal = true where id = %L', m));
  if r not in ('23514', '23505') then raise exception 'un monto principal: %', r; end if;
  update public.origenes_campos set principal = false where id = a;
  r := pg_temp.pp_sqlstate(format('update public.origenes_campos set principal = true where id = %L', m));
  if r <> '23514' then raise exception 'un monto principal (sin otro): %', r; end if;
  r := pg_temp.pp_sqlstate(format('update public.origenes_campos set principal = null where id = %L', a));
  if r <> '23502' then raise exception 'principal nulo: %', r; end if;
end $$;
rollback;

-- @test campo principal: guardar marca uno y desmarca el anterior, que cambia de versión
begin;
select pg_temp.pp_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-00000009900f';
        a uuid := '00000000-0000-4000-8000-0000000990a1'; b uuid := '00000000-0000-4000-8000-0000000990b1';
        va timestamptz; vb timestamptz; r text;
begin
  r := pg_temp.pp_codigo(pia, format('select public.origen_campo_guardar(%L, %L, %L)', a, pg_temp.pp_version(a), '{"principal": true}'));
  if r <> 'sin error' or pg_temp.pp_principales() <> 'pp_a' then raise exception 'no marcó a: % / %', r, pg_temp.pp_principales(); end if;
  -- Su versión, otra vez un minuto atrás (guardar la dejó en el `now()` de esta transacción).
  set local session_replication_role = replica;
  update public.origenes_campos set actualizado_en = now() - interval '1 minute' where id = a;
  set local session_replication_role = origin;
  va := pg_temp.pp_version(a); vb := pg_temp.pp_version(b);
  r := pg_temp.pp_codigo(pia, format('select public.origen_campo_guardar(%L, %L, %L)', b, vb, '{"principal": true}'));
  if r <> 'sin error' or pg_temp.pp_principales() <> 'pp_b' then raise exception 'marcar b no desmarcó a: % / %', r, pg_temp.pp_principales(); end if;
  if pg_temp.pp_version(a) = va then raise exception 'desmarcar a no movió su versión'; end if;
  -- Quien tenía «a» abierto con la versión de antes recibe el PT409 de siempre.
  r := pg_temp.pp_codigo(pia, format('select public.origen_campo_guardar(%L, %L, %L)', a, va, '{"etiqueta": "PP A2"}'));
  if r <> 'PT409' then raise exception 'guardar a con la versión de antes de desmarcarlo dio %', r; end if;
  -- Guardar el principal sin tocar la bandera lo deja principal; marcarlo otra vez no desmarca nada.
  r := pg_temp.pp_codigo(pia, format('select public.origen_campo_guardar(%L, %L, %L)', b, pg_temp.pp_version(b), '{"etiqueta": "PP B2"}'));
  if r <> 'sin error' or pg_temp.pp_principales() <> 'pp_b' then raise exception 'guardar otra cosa cambió el principal: % / %', r, pg_temp.pp_principales(); end if;
  r := pg_temp.pp_codigo(pia, format('select public.origen_campo_guardar(%L, %L, %L)', b, pg_temp.pp_version(b), '{"principal": true}'));
  if r <> 'sin error' or pg_temp.pp_principales() <> 'pp_b' then raise exception 'marcar otra vez el principal: % / %', r, pg_temp.pp_principales(); end if;
  -- Desmarcarlo a mano deja el origen sin principal.
  r := pg_temp.pp_codigo(pia, format('select public.origen_campo_guardar(%L, %L, %L)', b, pg_temp.pp_version(b), '{"principal": false}'));
  if r <> 'sin error' or pg_temp.pp_principales() <> '' then raise exception 'desmarcar b: % / %', r, pg_temp.pp_principales(); end if;
  r := pg_temp.pp_codigo(pia, format('select public.origen_campo_guardar(%L, %L, %L)', b, pg_temp.pp_version(b), '{"principal": null}'));
  if r <> 'P0001' then raise exception 'principal nulo por guardar dio %', r; end if;
end $$;
rollback;

-- @test campo principal: crear con principal desmarca el anterior y lo devuelve; sin anterior, desmarcado nulo
begin;
select pg_temp.pp_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-00000009900f'; o uuid := pg_temp.pp_origen();
        b uuid := '00000000-0000-4000-8000-0000000990b1'; j jsonb;
begin
  j := pg_temp.pp_json(pia, format('select public.origen_campo_crear(%L, %L, %L, %L, p_principal => true)', o, 'pp_n1', 'PP N1', 'texto'));
  if (select array_agg(k order by k) from jsonb_object_keys(j) k) <> array['actualizado_en', 'desmarcado', 'id'] then
    raise exception 'claves de la respuesta: %', j;
  end if;
  if jsonb_path_query_first(j, '$.desmarcado') <> 'null'::jsonb or pg_temp.pp_principales() <> 'pp_n1' then
    raise exception 'crear el primer principal: % / %', j, pg_temp.pp_principales();
  end if;
  update public.origenes_campos set principal = false where clave = 'pp_n1';
  update public.origenes_campos set principal = true where id = b;
  j := pg_temp.pp_json(pia, format('select public.origen_campo_crear(%L, %L, %L, %L, p_principal => true)', o, 'pp_n2', 'PP N2', 'texto'));
  if jsonb_path_query_first(j, '$.desmarcado') <> to_jsonb(b::text) or pg_temp.pp_principales() <> 'pp_n2' then
    raise exception 'crear con b principal: % / %', j, pg_temp.pp_principales();
  end if;
  if (select principal from public.origenes_campos where id = (j ->> 'id')::uuid) is not true then raise exception 'el nuevo no quedó principal'; end if;
  -- Sin el parámetro (las llamadas de hoy) nace sin principal y no desmarca.
  j := pg_temp.pp_json(pia, format('select public.origen_campo_crear(%L, %L, %L, %L)', o, 'pp_n3', 'PP N3', 'texto'));
  if jsonb_path_query_first(j, '$.desmarcado') <> 'null'::jsonb or pg_temp.pp_principales() <> 'pp_n2' then
    raise exception 'crear sin principal: % / %', j, pg_temp.pp_principales();
  end if;
end $$;
rollback;

-- @test campo principal: sin origenes.gestionar, 42501 (antes de la versión) y nada cambia; la escritura directa, 42501
begin;
select pg_temp.pp_preparar();
do $$
declare ana uuid := '00000000-0000-4000-8000-00000009900a'; o uuid := pg_temp.pp_origen();
        a uuid := '00000000-0000-4000-8000-0000000990a1'; b uuid := '00000000-0000-4000-8000-0000000990b1'; r text;
begin
  update public.origenes_campos set principal = true where id = a;
  r := pg_temp.pp_codigo(ana, format('select public.origen_campo_guardar(%L, %L, %L)', b, pg_temp.pp_version(b), '{"principal": true}'));
  if r <> '42501' then raise exception 'Ana marcó b: %', r; end if;
  r := pg_temp.pp_codigo(ana, format('select public.origen_campo_guardar(%L, %L, %L)', b, '2000-01-01', '{"principal": true}'));
  if r <> '42501' then raise exception 'Ana con versión vieja no recibió 42501: %', r; end if;
  r := pg_temp.pp_codigo(ana, format('select public.origen_campo_crear(%L, %L, %L, %L, p_principal => true)', o, 'pp_ana', 'PP Ana', 'texto'));
  if r <> '42501' then raise exception 'Ana creó un principal: %', r; end if;
  r := pg_temp.pp_codigo(ana, format('update public.origenes_campos set principal = true where id = %L', b));
  if r <> '42501' then raise exception 'Ana escribió principal directo: %', r; end if;
  r := pg_temp.pp_codigo('00000000-0000-4000-8000-00000009900f', format('update public.origenes_campos set principal = false where id = %L', a));
  if r <> '42501' then raise exception 'Pía escribió principal directo: %', r; end if;
  if pg_temp.pp_principales() <> 'pp_a' then raise exception 'algo cambió el principal: %', pg_temp.pp_principales(); end if;
end $$;
rollback;

-- @test campo principal: versión vieja da PT409 sin desmarcar el otro
begin;
select pg_temp.pp_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-00000009900f';
        a uuid := '00000000-0000-4000-8000-0000000990a1'; b uuid := '00000000-0000-4000-8000-0000000990b1';
        va timestamptz; r text;
begin
  update public.origenes_campos set principal = true where id = a;
  va := pg_temp.pp_version(a);
  r := pg_temp.pp_codigo(pia, format('select public.origen_campo_guardar(%L, %L, %L)', b, pg_temp.pp_version(b) - interval '1 second', '{"principal": true}'));
  if r <> 'PT409' then raise exception 'versión vieja dio %', r; end if;
  if pg_temp.pp_principales() <> 'pp_a' or pg_temp.pp_version(a) <> va then raise exception 'el PT409 desmarcó a'; end if;
end $$;
rollback;

-- @test campo principal: desactivado o monto no puede serlo (validación con hint); desactivar el principal lo desmarca
begin;
select pg_temp.pp_preparar();
do $$
declare pia uuid := '00000000-0000-4000-8000-00000009900f'; o uuid := pg_temp.pp_origen();
        a uuid := '00000000-0000-4000-8000-0000000990a1'; b uuid := '00000000-0000-4000-8000-0000000990b1';
        c uuid := '00000000-0000-4000-8000-0000000990c1'; m uuid := '00000000-0000-4000-8000-0000000990d1'; r text;
begin
  update public.origenes_campos set principal = true where id = a;
  update public.origenes_campos set activo = false where id = c;
  r := pg_temp.pp_codigo(pia, format('select public.origen_campo_guardar(%L, %L, %L)', c, pg_temp.pp_version(c), '{"principal": true}'));
  if r <> 'P0001/principal' then raise exception 'marcar un desactivado: %', r; end if;
  r := pg_temp.pp_codigo(pia, format('select public.origen_campo_guardar(%L, %L, %L)', b, pg_temp.pp_version(b), '{"activo": false, "principal": true}'));
  if r <> 'P0001/principal' then raise exception 'desactivar y marcar a la vez: %', r; end if;
  r := pg_temp.pp_codigo(pia, format('select public.origen_campo_guardar(%L, %L, %L)', m, pg_temp.pp_version(m), '{"principal": true}'));
  if r <> 'P0001/principal' then raise exception 'marcar un monto: %', r; end if;
  r := pg_temp.pp_codigo(pia, format('select public.origen_campo_guardar(%L, %L, %L)', a, pg_temp.pp_version(a), '{"tipo": "moneda"}'));
  if r <> 'P0001/principal' then raise exception 'volver monto el principal: %', r; end if;
  r := pg_temp.pp_codigo(pia, format('select public.origen_campo_crear(%L, %L, %L, %L, p_principal => true)', o, 'pp_mm', 'PP MM', 'moneda'));
  if r <> 'P0001/principal' then raise exception 'crear un monto principal: %', r; end if;
  if pg_temp.pp_principales() <> 'pp_a' then raise exception 'una validación cambió el principal: %', pg_temp.pp_principales(); end if;
  -- Reactivar y marcar a la vez sí vale; desactivar el principal lo desmarca.
  r := pg_temp.pp_codigo(pia, format('select public.origen_campo_guardar(%L, %L, %L)', c, pg_temp.pp_version(c), '{"activo": true, "principal": true}'));
  if r <> 'sin error' or pg_temp.pp_principales() <> 'pp_c' then raise exception 'reactivar y marcar: % / %', r, pg_temp.pp_principales(); end if;
  r := pg_temp.pp_codigo(pia, format('select public.origen_campo_guardar(%L, %L, %L)', c, pg_temp.pp_version(c), '{"activo": false}'));
  if r <> 'sin error' or pg_temp.pp_principales() <> '' then raise exception 'desactivar el principal: % / %', r, pg_temp.pp_principales(); end if;
  if (select activo from public.origenes_campos where id = c) then raise exception 'no quedó desactivado'; end if;
end $$;
rollback;
