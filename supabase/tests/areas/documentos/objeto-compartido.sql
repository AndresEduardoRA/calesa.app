-- El objeto compartido se lee por cualquier fila viva (paso 6.05): la policy «documentos: leer» de storage.objects.
-- No depende de otro archivo (`SOLO=areas/documentos/objeto-compartido.sql`). Cada bloque arma su terreno en una transacción y la revierte.
--
-- Qué asegura (C16): un objeto en la carpeta del vehículo 1 registrado para 1, 2 y 3. Quien ve sólo el 3 (logistica.ver «propios», lo creó) lo lee;
-- quien no ve ninguno, no; eliminada la fila del 3, ya no lo lee.

-- @test documentos objeto compartido: los ayudantes
reset role;
-- Una persona activa con un rol propio y estas concesiones ('clave' con alcance «todos» o 'clave:propios'), en un origen o en todos.
create or replace function pg_temp.dc_persona(p_concesiones text[], p_origen uuid default null) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  delete from public.usuarios_roles where usuario_id = v_id;
  insert into public.roles (clave, nombre) values ('dc_' || substr(v_id::text, 1, 8), 'DC ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, ':', 1), p_origen, coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- El error de un SQL corrido como esa persona: «sqlstate» o «sqlstate/hint», o «sin error».
create or replace function pg_temp.dc_codigo(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v_hint text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
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
create or replace function pg_temp.dc_json(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  execute p_sql into r;
  reset role;
  return r;
end $f$;

-- Dos orígenes (sus flujos nacen solos), tres vehículos en A y uno en B, un tipo global, uno de A, uno de B y un repuesto. Antes, una cuenta de
-- relleno: si es la primera, nace dueña y nadie más.
create or replace function pg_temp.dc_preparar() returns jsonb language plpgsql as $f$
declare a uuid; b uuid; v1 uuid; v2 uuid; v3 uuid; vb uuid; tg uuid; ta uuid; tb uuid; rp uuid; pr uuid;
begin
  perform pg_temp.dc_persona(array[]::text[]);
  insert into public.origenes (clave, nombre) values ('prueba_dc_a', 'Prueba dc A') returning id into a;
  insert into public.origenes (clave, nombre) values ('prueba_dc_b', 'Prueba dc B') returning id into b;
  insert into public.vehiculos (origen_id, titulo) values (a, 'DC 1') returning id into v1;
  insert into public.vehiculos (origen_id, titulo) values (a, 'DC 2') returning id into v2;
  insert into public.vehiculos (origen_id, titulo) values (a, 'DC 3') returning id into v3;
  insert into public.vehiculos (origen_id, titulo) values (b, 'DC B') returning id into vb;
  insert into public.tipos_documento (flujo_id, nombre) values (null, 'DC global') returning id into tg;
  insert into public.tipos_documento (flujo_id, nombre) select f.id, 'DC de A' from public.flujos f where f.origen_id = a returning id into ta;
  insert into public.tipos_documento (flujo_id, nombre) select f.id, 'DC de B' from public.flujos f where f.origen_id = b returning id into tb;
  insert into public.repuestos_proyectos default values returning id into pr;
  insert into public.repuestos_items (proyecto_id, descripcion) values (pr, 'DC repuesto') returning id into rp;
  return jsonb_build_object('a', a, 'b', b, 'v1', v1, 'v2', v2, 'v3', v3, 'vb', vb, 'tg', tg, 'ta', ta, 'tb', tb, 'rp', rp);
end $f$;

-- La ruta n de una unidad y su objeto en storage (con su metadata).
create or replace function pg_temp.dc_objeto(p_unidad uuid, p_n int, p_meta jsonb default '{"mimetype": "application/pdf", "size": 1234}')
returns text language sql as $f$
  insert into storage.objects (bucket_id, name, metadata) values ('documentos', p_unidad || '/' || lpad(to_hex(p_n), 64, '0') || '.pdf', p_meta)
  returning name;
$f$;

-- El SQL de registrar (vehículos o repuesto) con lo mínimo.
create or replace function pg_temp.dc_reg(p_id uuid, p_vehiculos uuid[], p_repuesto uuid, p_tipo uuid, p_ruta text,
                                          p_emitido date default null, p_vence date default null) returns text language sql as $f$
  select format('select public.documento_registrar(%L, %L::uuid[], %L, %L, %L, %L, %L, %s, %L, %L, null)',
                p_id, p_vehiculos, p_repuesto, p_tipo, p_ruta, 'factura.pdf', 'application/pdf', 1234, p_emitido, p_vence);
$f$;

create or replace function pg_temp.dc_u(e jsonb, k text) returns uuid language sql as $f$ select (e ->> k)::uuid $f$;

-- Registra un documento como esa persona y devuelve sus ids, por id.
create or replace function pg_temp.dc_registrar(p_quien uuid, p_vehiculos uuid[], p_tipo uuid, p_ruta text) returns uuid[] language plpgsql as $f$
declare j jsonb;
begin
  j := pg_temp.dc_json(p_quien, pg_temp.dc_reg(gen_random_uuid(), p_vehiculos, null, p_tipo, p_ruta));
  return array(select (x ->> 'id')::uuid from jsonb_array_elements(j) x order by x ->> 'id');
end $f$;

create or replace function pg_temp.dc_version(p_id uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.documentos where id = p_id
$f$;

-- @test documentos objeto compartido: quien ve sólo la tercera unidad lee el objeto; quien no ve ninguna, no; sin la fila viva, ya no
begin;
do $$
declare e jsonb := pg_temp.dc_preparar(); sube uuid; ve3 uuid; nadie uuid; v_ruta text; ds uuid[]; q text;
begin
  sube := pg_temp.dc_persona(array['logistica.documentos.subir', 'logistica.ver']);
  ve3 := pg_temp.dc_persona(array['logistica.ver:propios']);
  nadie := pg_temp.dc_persona(array['logistica.ver:propios']);
  update public.vehiculos set creado_por = ve3 where id = pg_temp.dc_u(e, 'v3');
  v_ruta := pg_temp.dc_objeto(pg_temp.dc_u(e, 'v1'), 1);
  ds := pg_temp.dc_registrar(sube, array[pg_temp.dc_u(e, 'v1'), pg_temp.dc_u(e, 'v2'), pg_temp.dc_u(e, 'v3')], pg_temp.dc_u(e, 'tg'), v_ruta);
  q := format('select to_jsonb(count(*)) from storage.objects where bucket_id = %L and name = %L', 'documentos', v_ruta);
  if pg_temp.dc_json(ve3, q) <> '1'::jsonb then raise exception 'quien ve sólo el 3 no lee el objeto compartido'; end if;
  if pg_temp.dc_json(nadie, q) <> '0'::jsonb then raise exception 'quien no ve ninguno leyó el objeto'; end if;
  if pg_temp.dc_json(sube, q) <> '1'::jsonb then raise exception 'quien ve todos no lee el objeto'; end if;
  update public.documentos set eliminado_en = now() where vehiculo_id = pg_temp.dc_u(e, 'v3') and ruta = v_ruta;
  if pg_temp.dc_json(ve3, q) <> '0'::jsonb then raise exception 'sin la fila viva del 3, todavía lee el objeto'; end if;
end $$;
rollback;
