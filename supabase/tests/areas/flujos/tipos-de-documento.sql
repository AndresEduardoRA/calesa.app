-- Los tipos de documento se escriben sólo por RPC (5.03): el grupo global pide `logistica.catalogos.gestionar` y el de un flujo
-- `puede_configurar_flujo()`; la versión da PT409; en uso se desactiva y sin uso se borra; achicar los formatos que pide un requisito falla; la
-- escritura directa da 42501. Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno y lo revierte.

-- @test tipos de documento: los ayudantes
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

-- @test tipos de documento: crear pide el permiso de su grupo (global: catálogos; de flujo: configurar ese flujo)
begin;
select pg_temp.td_preparar();
do $$
declare flor uuid := '00000000-0000-4000-8000-000000007d0f'; cata uuid := '00000000-0000-4000-8000-000000007d0c';
        ana uuid := '00000000-0000-4000-8000-000000007d0a'; fa uuid := pg_temp.td_flujo('prueba_td_a'); fb uuid := pg_temp.td_flujo('prueba_td_b');
        r text;
begin
  r := pg_temp.td_codigo(flor, format('select public.tipo_documento_crear(gen_random_uuid(), null, %L)', '{"nombre":"Global de Flor"}'));
  if r <> '42501' then raise exception 'Flor creó un global: %', r; end if;
  r := pg_temp.td_codigo(cata, format('select public.tipo_documento_crear(gen_random_uuid(), %L, %L)', fa, '{"nombre":"De A por Cata"}'));
  if r <> '42501' then raise exception 'Cata creó uno del flujo de A: %', r; end if;
  r := pg_temp.td_codigo(flor, format('select public.tipo_documento_crear(gen_random_uuid(), %L, %L)', fb, '{"nombre":"De B por Flor"}'));
  if r <> '42501' then raise exception 'Flor creó uno del flujo de B: %', r; end if;
  r := pg_temp.td_codigo(ana, format('select public.tipo_documento_crear(gen_random_uuid(), %L, %L)', fa, '{"nombre":"De A por Ana"}'));
  if r <> '42501' then raise exception 'Ana creó uno del flujo de A: %', r; end if;
  r := pg_temp.td_codigo(cata, format('select public.tipo_documento_crear(gen_random_uuid(), null, %L)', '{"nombre":"Global de Cata"}'));
  if r <> 'sin error' then raise exception 'Cata no creó un global: %', r; end if;
  r := pg_temp.td_codigo(flor, format('select public.tipo_documento_crear(gen_random_uuid(), %L, %L)', fa, '{"nombre":"De A por Flor"}'));
  if r <> 'sin error' then raise exception 'Flor no creó uno del flujo de A: %', r; end if;
  if (select count(*) from (select 1 from public.tipos_documento where nombre in ('Global de Cata', 'De A por Flor') limit 3) q) <> 2 then
    raise exception 'no quedaron los dos tipos creados';
  end if;
end $$;
rollback;

-- @test tipos de documento: crear es idempotente, ordena al final y valida nombre y vencimiento
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

-- @test tipos de documento: guardar pide el permiso del grupo de la fila, antes que la versión
begin;
select pg_temp.td_preparar();
do $$
declare flor uuid := '00000000-0000-4000-8000-000000007d0f'; cata uuid := '00000000-0000-4000-8000-000000007d0c';
        ana uuid := '00000000-0000-4000-8000-000000007d0a';
        g uuid := '00000000-0000-4000-8000-000000007d01'; a uuid := '00000000-0000-4000-8000-000000007d02'; r text;
begin
  r := pg_temp.td_codigo(flor, format('select public.tipo_documento_guardar(%L, %L, %L)', g, pg_temp.td_version(g), '{"nombre":"Por Flor"}'));
  if r <> '42501' then raise exception 'Flor guardó el global: %', r; end if;
  r := pg_temp.td_codigo(flor, format('select public.tipo_documento_guardar(%L, %L, %L)', g, '2000-01-01', '{"nombre":"Por Flor"}'));
  if r <> '42501' then raise exception 'Flor con versión vieja no recibió 42501 en el global: %', r; end if;
  r := pg_temp.td_codigo(cata, format('select public.tipo_documento_guardar(%L, %L, %L)', a, pg_temp.td_version(a), '{"nombre":"Por Cata"}'));
  if r <> '42501' then raise exception 'Cata guardó el de A: %', r; end if;
  r := pg_temp.td_codigo(ana, format('select public.tipo_documento_guardar(%L, %L, %L)', a, pg_temp.td_version(a), '{"nombre":"Por Ana"}'));
  if r <> '42501' then raise exception 'Ana guardó el de A: %', r; end if;
  r := pg_temp.td_codigo(cata, format('select public.tipo_documento_guardar(%L, %L, %L)', g, pg_temp.td_version(g), '{"nombre":"Por Cata"}'));
  if r <> 'sin error' then raise exception 'Cata no guardó el global: %', r; end if;
  r := pg_temp.td_codigo(flor, format('select public.tipo_documento_guardar(%L, %L, %L)', a, pg_temp.td_version(a), '{"nombre":"Por Flor"}'));
  if r <> 'sin error' then raise exception 'Flor no guardó el de A: %', r; end if;
  if (select nombre from public.tipos_documento where id = g) <> 'Por Cata' or (select nombre from public.tipos_documento where id = a) <> 'Por Flor' then
    raise exception 'guardar no dejó los nombres';
  end if;
  r := pg_temp.td_codigo(cata, format('select public.tipo_documento_guardar(%L, %L, %L)', g, pg_temp.td_version(g), '{"proposito":"titulo"}'));
  if r <> '22023/proposito' then raise exception 'guardar cambió el propósito: %', r; end if;
end $$;
rollback;

-- @test tipos de documento: con otra versión guardar da PT409 y no cambia nada; sin diferencia no escribe
begin;
select pg_temp.td_preparar();
do $$
declare cata uuid := '00000000-0000-4000-8000-000000007d0c'; g uuid := '00000000-0000-4000-8000-000000007d01';
        v1 timestamptz := pg_temp.td_version(g); v2 timestamptz; j jsonb;
begin
  j := pg_temp.td_json(cata, format('select public.tipo_documento_guardar(%L, %L, %L)', g, v1, '{"nombre":"Segunda"}'));
  v2 := (j ->> 'actualizado_en')::timestamptz;
  if v2 <= v1 or v2 <> pg_temp.td_version(g) then raise exception 'la versión no se movió: % → %', v1, v2; end if;
  if pg_temp.td_codigo(cata, format('select public.tipo_documento_guardar(%L, %L, %L)', g, v1, '{"nombre":"Tercera"}')) <> 'PT409' then
    raise exception 'guardar con la versión vieja no dio PT409';
  end if;
  if (select nombre from public.tipos_documento where id = g) <> 'Segunda' then raise exception 'el PT409 cambió el nombre'; end if;
  j := pg_temp.td_json(cata, format('select public.tipo_documento_guardar(%L, %L, %L)', g, v1, '{"nombre":"Segunda"}'));
  if not (j ->> 'sin_cambios')::boolean or pg_temp.td_version(g) <> v2 then raise exception 'sin diferencia escribió'; end if;
  if pg_temp.td_codigo(cata, format('select public.tipo_documento_guardar(%L, null, %L)', g, '{"nombre":"Segunda"}')) = 'sin error' then
    raise exception 'guardar sin versión pasó';
  end if;
end $$;
rollback;

-- @test tipos de documento: achicar los formatos que pide un requisito falla; los que no pide, o un requisito sin formatos, no
begin;
select pg_temp.td_preparar();
do $$
declare flor uuid := '00000000-0000-4000-8000-000000007d0f'; a uuid := '00000000-0000-4000-8000-000000007d02';
        v_fase uuid := (select id from public.fases where nombre = 'TD fase'); r text;
begin
  insert into public.fases_requisitos (fase_id, tipo, tipo_documento_id, formatos) values (v_fase, 'documento', a, array['application/pdf']);
  insert into public.fases_requisitos (fase_id, tipo, tipo_documento_id) values (v_fase, 'documento', a);
  r := pg_temp.td_codigo(flor, format('select public.tipo_documento_guardar(%L, %L, %L)', a, pg_temp.td_version(a), '{"formatos":["image/jpeg"]}'));
  if r <> '22023/formatos' then raise exception 'quitar un formato que pide un requisito dio %', r; end if;
  if (select formatos from public.tipos_documento where id = a) <> public._tipos_documento_formatos() then
    raise exception 'el rechazo cambió los formatos';
  end if;
  r := pg_temp.td_codigo(flor, format('select public.tipo_documento_guardar(%L, %L, %L)', a, pg_temp.td_version(a),
    '{"formatos":["application/pdf","image/png"]}'));
  if r <> 'sin error' then raise exception 'quitar formatos que nadie pide dio %', r; end if;
  if (select formatos from public.tipos_documento where id = a) <> array['application/pdf', 'image/png'] then
    raise exception 'no quedaron los formatos nuevos';
  end if;
end $$;
rollback;

-- @test tipos de documento: guardar valida el nombre (también al reactivar) y el vencimiento
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

-- @test tipos de documento: mover pide el permiso del grupo de la fila y no cambia versiones
begin;
select pg_temp.td_preparar();
do $$
declare flor uuid := '00000000-0000-4000-8000-000000007d0f'; cata uuid := '00000000-0000-4000-8000-000000007d0c';
        ana uuid := '00000000-0000-4000-8000-000000007d0a';
        g uuid := '00000000-0000-4000-8000-000000007d01'; a uuid := '00000000-0000-4000-8000-000000007d02'; r text; v timestamptz;
begin
  r := pg_temp.td_codigo(flor, format('select public.tipo_documento_mover(%L, %L)', g, pg_temp.td_version(g)));
  if r <> '42501' then raise exception 'Flor movió el global: %', r; end if;
  r := pg_temp.td_codigo(cata, format('select public.tipo_documento_mover(%L, %L)', a, pg_temp.td_version(a)));
  if r <> '42501' then raise exception 'Cata movió el de A: %', r; end if;
  r := pg_temp.td_codigo(ana, format('select public.tipo_documento_mover(%L, %L)', a, pg_temp.td_version(a)));
  if r <> '42501' then raise exception 'Ana movió el de A: %', r; end if;
  v := pg_temp.td_version(g);
  r := pg_temp.td_codigo(cata, format('select public.tipo_documento_mover(%L, %L)', g, v));
  if r <> 'sin error' then raise exception 'Cata no movió el global: %', r; end if;
  if (select min(orden) from public.tipos_documento where flujo_id is null) <> (select orden from public.tipos_documento where id = g)
     or pg_temp.td_version(g) <> v then
    raise exception 'el global no quedó primero o cambió su versión';
  end if;
  r := pg_temp.td_codigo(flor, format('select public.tipo_documento_mover(%L, %L, %L)', a, pg_temp.td_version(a), g));
  if r <> 'PT409' then raise exception 'mover el de A después de un global dio %', r; end if;
  r := pg_temp.td_codigo(flor, format('select public.tipo_documento_mover(%L, %L)', a, pg_temp.td_version(a)));
  if r <> 'sin error' then raise exception 'Flor no movió el de A: %', r; end if;
end $$;
rollback;
