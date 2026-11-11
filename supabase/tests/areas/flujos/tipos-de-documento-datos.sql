-- Los datos de un tipo de documento (5.03, C3–C5): crear es idempotente por su id y ordena al final; el nombre es único en su grupo sin distinguir
-- mayúsculas (y uno de un flujo activo no repite el de un global activo); el vencimiento y los formatos se validan con su hint. Los permisos, la
-- versión, el uso y la escritura directa están en tipos-de-documento.sql. Corre en PGlite (`pnpm db:probar`); cada bloque arma su terreno y lo revierte.

-- @test datos de tipos de documento: los ayudantes
reset role;
create or replace function pg_temp.td_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- El error de un SQL corrido como esa persona: «sqlstate» o «sqlstate/hint», o «sin error».
create or replace function pg_temp.td_codigo(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v_hint text;
begin
  perform pg_temp.td_como(p_quien);
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
create or replace function pg_temp.td_json(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  perform pg_temp.td_como(p_quien);
  set local role authenticated;
  execute p_sql into r;
  reset role;
  return r;
end $f$;

-- Dos orígenes (sus flujos nacen solos), una fase en el de A, un tipo global y uno de A, y tres personas con rol propio (la primera cuenta nace
-- dueña): Flor configura el flujo de A, Cata gestiona los catálogos de logística y Ana no tiene claves.
create or replace function pg_temp.td_preparar() returns void language plpgsql as $f$
declare a uuid; b uuid; p uuid; v_rol uuid; i int := 0;
begin
  insert into public.origenes (clave, nombre) values ('prueba_td_a', 'Prueba td A') returning id into a;
  insert into public.origenes (clave, nombre) values ('prueba_td_b', 'Prueba td B') returning id into b;
  insert into public.fases (flujo_id, nombre) select f.id, 'TD fase' from public.flujos f where f.origen_id = a;
  insert into public.tipos_documento (id, flujo_id, nombre) values ('00000000-0000-4000-8000-000000007d01', null, 'TD global');
  insert into public.tipos_documento (id, flujo_id, nombre)
  select '00000000-0000-4000-8000-000000007d02', f.id, 'TD de A' from public.flujos f where f.origen_id = a;
  foreach p in array array['00000000-0000-4000-8000-000000007d0f', '00000000-0000-4000-8000-000000007d0c',
                           '00000000-0000-4000-8000-000000007d0a']::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'TD ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('td_rol_' || i, 'TD rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    if i = 1 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'flujos.configurar', a, 'todos');
    elsif i = 2 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'logistica.catalogos.gestionar', null, 'todos');
    end if;
  end loop;
end $f$;

create or replace function pg_temp.td_flujo(p_clave text) returns uuid language sql as $f$
  select f.id from public.flujos f join public.origenes o on o.id = f.origen_id where o.clave = p_clave
$f$;

create or replace function pg_temp.td_version(p_id uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.tipos_documento where id = p_id
$f$;

-- @test datos de tipos de documento: crear es idempotente, ordena al final y valida nombre y vencimiento
begin;
select pg_temp.td_preparar();
do $$
declare flor uuid := '00000000-0000-4000-8000-000000007d0f'; fa uuid := pg_temp.td_flujo('prueba_td_a');
        v_id uuid := '00000000-0000-4000-8000-000000007d10'; j jsonb; t public.tipos_documento;
begin
  j := pg_temp.td_json(flor, format('select public.tipo_documento_crear(%L, %L, %L)', v_id, fa,
    '{"nombre":"  Póliza  ","formatos":["image/png","application/pdf","image/png"],"modo_vencimiento":"renovar","vigencia_dias":365,"aviso_dias":30}'));
  if (j ->> 'repetido')::boolean then raise exception 'la primera vez salió repetido'; end if;
  select * into t from public.tipos_documento where id = v_id;
  if t.nombre <> 'Póliza' or t.formatos <> array['application/pdf', 'image/png'] or t.orden <= 0 or not t.activo then
    raise exception 'el tipo creado quedó mal: % % % %', t.nombre, t.formatos, t.orden, t.activo;
  end if;
  j := pg_temp.td_json(flor, format('select public.tipo_documento_crear(%L, %L, %L)', v_id, fa, '{"nombre":"Otra"}'));
  if not (j ->> 'repetido')::boolean then raise exception 'repetir el intento no salió repetido'; end if;
  if pg_temp.td_codigo(flor, format('select public.tipo_documento_crear(gen_random_uuid(), %L, %L)', fa, '{"nombre":"td GLOBAL"}')) <> '23505/nombre' then
    raise exception 'uno de A repitió el nombre de un global activo';
  end if;
  update public.tipos_documento set activo = false where id = '00000000-0000-4000-8000-000000007d01';
  if pg_temp.td_codigo(flor, format('select public.tipo_documento_crear(gen_random_uuid(), %L, %L)', fa, '{"nombre":"td GLOBAL"}')) <> 'sin error' then
    raise exception 'con el global inactivo, su nombre no quedó libre';
  end if;
  if pg_temp.td_codigo(flor, format('select public.tipo_documento_crear(gen_random_uuid(), %L, %L)', fa, '{"nombre":"póliza"}')) <> '23505/nombre' then
    raise exception 'se repitió un nombre del grupo en otras mayúsculas';
  end if;
  if pg_temp.td_codigo(flor, format('select public.tipo_documento_crear(gen_random_uuid(), %L, %L)', fa,
       '{"nombre":"R","modo_vencimiento":"renovar"}')) <> '22023/vigencia_dias' then
    raise exception 'renovar sin vigencia pasó';
  end if;
  if pg_temp.td_codigo(flor, format('select public.tipo_documento_crear(gen_random_uuid(), %L, %L)', fa,
       '{"nombre":"R","modo_vencimiento":"renovar","vigencia_dias":10,"aviso_dias":20}')) <> '22023/aviso_dias' then
    raise exception 'un aviso más largo que la vigencia pasó';
  end if;
  if pg_temp.td_codigo(flor, format('select public.tipo_documento_crear(gen_random_uuid(), %L, %L)', fa,
       '{"nombre":"R","formatos":["text/plain"]}')) <> '22023/formatos' then
    raise exception 'un formato fuera de la lista pasó';
  end if;
  if pg_temp.td_codigo(flor, format('select public.tipo_documento_crear(gen_random_uuid(), %L, %L)', fa,
       '{"nombre":"R","proposito":"titulo"}')) <> '22023/proposito' then
    raise exception 'crear eligió el propósito';
  end if;
end $$;
rollback;

-- @test datos de tipos de documento: guardar valida el nombre (también al reactivar) y el vencimiento
begin;
select pg_temp.td_preparar();
do $$
declare flor uuid := '00000000-0000-4000-8000-000000007d0f'; cata uuid := '00000000-0000-4000-8000-000000007d0c';
        g uuid := '00000000-0000-4000-8000-000000007d01'; a uuid := '00000000-0000-4000-8000-000000007d02'; r text;
begin
  r := pg_temp.td_codigo(flor, format('select public.tipo_documento_guardar(%L, %L, %L)', a, pg_temp.td_version(a), '{"nombre":"TD Global"}'));
  if r <> '23505/nombre' then raise exception 'el de A tomó el nombre de un global activo: %', r; end if;
  perform pg_temp.td_json(cata, format('select public.tipo_documento_guardar(%L, %L, %L)', g, pg_temp.td_version(g), '{"activo":false}'));
  r := pg_temp.td_codigo(flor, format('select public.tipo_documento_guardar(%L, %L, %L)', a, pg_temp.td_version(a), '{"nombre":"TD Global"}'));
  if r <> 'sin error' then raise exception 'con el global inactivo, su nombre no quedó libre: %', r; end if;
  r := pg_temp.td_codigo(cata, format('select public.tipo_documento_guardar(%L, %L, %L)', g, pg_temp.td_version(g), '{"activo":true}'));
  if r <> 'sin error' then raise exception 'reactivar el global falló: %', r; end if;
  r := pg_temp.td_codigo(flor, format('select public.tipo_documento_guardar(%L, %L, %L)', a, pg_temp.td_version(a), '{"modo_vencimiento":"renovar"}'));
  if r <> '22023/vigencia_dias' then raise exception 'renovar sin vigencia dio %', r; end if;
  r := pg_temp.td_codigo(flor, format('select public.tipo_documento_guardar(%L, %L, %L)', a, pg_temp.td_version(a),
    '{"modo_vencimiento":"solicitar","vigencia_dias":30}'));
  if r <> '22023/vigencia_dias' then raise exception 'solicitar con vigencia dio %', r; end if;
  r := pg_temp.td_codigo(flor, format('select public.tipo_documento_guardar(%L, %L, %L)', a, pg_temp.td_version(a), '{"aviso_dias":5}'));
  if r <> '22023/aviso_dias' then raise exception 'un aviso sin vencimiento dio %', r; end if;
end $$;
rollback;
