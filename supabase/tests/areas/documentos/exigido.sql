-- El documento que exige la fase actual no se quita (paso 6.05): el trigger `documento_exigido()`.
-- No depende de otro archivo (`SOLO=areas/documentos/exigido.sql`). Cada bloque arma su terreno en una transacción y la revierte.
--
-- Qué asegura (C14):
--   Con la unidad en una fase con un requisito bloqueante de ese tipo y un solo aprobado, eliminarlo o rechazarlo da 23514 con el nombre de la fase;
--   con dos, el primero se va y el segundo no; lo mismo con un requisito de min_archivos nulo (vale 1, como evaluar_requisitos).
--   El de un tipo que exige otra fase (no la actual) se elimina; uno vencido, también; acortar vence_el a ayer al único da 23514.

-- @test documentos exigido: los ayudantes
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

-- El mensaje de un error corrido como esa persona (o «sin error»).
create or replace function pg_temp.dc_mensaje(p_quien uuid, p_sql text) returns text language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  execute p_sql;
  reset role;
  return 'sin error';
exception when others then
  reset role;
  return sqlstate || ' ' || sqlerrm;
end $f$;

-- Un aprobado vivo de ese tipo en la unidad (como postgres: nace subido y se aprueba).
create or replace function pg_temp.dc_aprobado(p_vehiculo uuid, p_tipo uuid, p_vence date default null) returns uuid language plpgsql as $f$
declare d uuid;
begin
  insert into public.documentos (vehiculo_id, tipo_documento_id, mime, vence_el) values (p_vehiculo, p_tipo, 'application/pdf', p_vence) returning id into d;
  update public.documentos set estado = 'aprobado' where id = d;
  return d;
end $f$;

-- Una fase «DC exige» del flujo de A con un requisito bloqueante del tipo (min dado o nulo), otra «DC otra» con uno de otro tipo, y el vehículo 1 en
-- «DC exige».
create or replace function pg_temp.dc_fases(e jsonb, p_tipo uuid, p_otro uuid, p_min int) returns void language plpgsql as $f$
declare f uuid; g uuid; fl uuid := (select id from public.flujos where origen_id = (e ->> 'a')::uuid);
begin
  insert into public.fases (flujo_id, nombre) values (fl, 'DC exige') returning id into f;
  insert into public.fases (flujo_id, nombre) values (fl, 'DC otra') returning id into g;
  insert into public.fases_requisitos (fase_id, tipo, tipo_documento_id, min_archivos, bloqueante) values (f, 'documento', p_tipo, p_min, true);
  insert into public.fases_requisitos (fase_id, tipo, tipo_documento_id, bloqueante) values (g, 'documento', p_otro, true);
  update public.vehiculos set fase_id = f where id = (e ->> 'v1')::uuid;
end $f$;

-- @test documentos exigido: el único aprobado que exige la fase no se elimina ni se rechaza; con dos, el primero sí y el segundo no (min 1 y nulo)
begin;
do $$
declare e jsonb := pg_temp.dc_preparar(); aprueba uuid; v1 uuid; t uuid; o uuid; d1 uuid; d2 uuid; m text; v_min int;
begin
  aprueba := pg_temp.dc_persona(array['logistica.documentos.aprobar', 'logistica.ver']);
  v1 := pg_temp.dc_u(e, 'v1');
  insert into public.tipos_documento (flujo_id, nombre) values (null, 'DC exigido') returning id into t;
  insert into public.tipos_documento (flujo_id, nombre) values (null, 'DC de otra fase') returning id into o;
  perform pg_temp.dc_fases(e, t, o, null);
  foreach v_min in array array[1, 0] loop
    -- 0 = el requisito con min_archivos nulo.
    update public.fases_requisitos set min_archivos = nullif(v_min, 0) where tipo_documento_id = t;
    delete from public.documentos where vehiculo_id = v1;
    d1 := pg_temp.dc_aprobado(v1, t);
    m := pg_temp.dc_mensaje(aprueba, format('select public.documento_eliminar(%L, %L)', d1, pg_temp.dc_version(d1)));
    if m not like '23514 %«DC exige»%' then raise exception 'min %: eliminar el único exigido dio %', v_min, m; end if;
    m := pg_temp.dc_mensaje(aprueba, format('select public.documento_revisar(%L, %L, %L, %L)', d1, pg_temp.dc_version(d1), 'rechazado', 'Ilegible'));
    if m not like '23514 %«DC exige»%' then raise exception 'min %: rechazar el único exigido dio %', v_min, m; end if;
    d2 := pg_temp.dc_aprobado(v1, t);
    m := pg_temp.dc_mensaje(aprueba, format('select public.documento_eliminar(%L, %L)', d1, pg_temp.dc_version(d1)));
    if m <> 'sin error' then raise exception 'min %: con dos aprobados no se eliminó el primero: %', v_min, m; end if;
    m := pg_temp.dc_mensaje(aprueba, format('select public.documento_eliminar(%L, %L)', d2, pg_temp.dc_version(d2)));
    if m not like '23514 %' then raise exception 'min %: se eliminó el segundo, que quedaba solo: %', v_min, m; end if;
  end loop;
end $$;
rollback;

-- @test documentos exigido: el de otra fase y el vencido se eliminan; acortar el vencimiento del único a ayer da 23514
begin;
do $$
declare e jsonb := pg_temp.dc_preparar(); aprueba uuid; v1 uuid; t uuid; o uuid; d uuid; m text;
begin
  aprueba := pg_temp.dc_persona(array['logistica.documentos.aprobar', 'logistica.ver']);
  v1 := pg_temp.dc_u(e, 'v1');
  -- «renovar» sin vigencia: la fecha la escribe quien edita.
  insert into public.tipos_documento (flujo_id, nombre, modo_vencimiento) values (null, 'DC exigido', 'renovar') returning id into t;
  insert into public.tipos_documento (flujo_id, nombre) values (null, 'DC de otra fase') returning id into o;
  perform pg_temp.dc_fases(e, t, o, 1);
  d := pg_temp.dc_aprobado(v1, o);
  m := pg_temp.dc_mensaje(aprueba, format('select public.documento_eliminar(%L, %L)', d, pg_temp.dc_version(d)));
  if m <> 'sin error' then raise exception 'el de un tipo que exige otra fase no se eliminó: %', m; end if;
  d := pg_temp.dc_aprobado(v1, t, current_date - 1);
  m := pg_temp.dc_mensaje(aprueba, format('select public.documento_eliminar(%L, %L)', d, pg_temp.dc_version(d)));
  if m <> 'sin error' then raise exception 'el vencido no se eliminó: %', m; end if;
  d := pg_temp.dc_aprobado(v1, t, current_date + 30);
  m := pg_temp.dc_mensaje(aprueba, format('select public.documento_editar(%L, %L, %L)', d, pg_temp.dc_version(d),
                                          jsonb_build_object('vence_el', current_date - 1)));
  if m not like '23514 %«DC exige»%' then raise exception 'acortar a ayer el vencimiento del único dio %', m; end if;
  m := pg_temp.dc_mensaje(aprueba, format('select public.documento_editar(%L, %L, %L)', d, pg_temp.dc_version(d), '{"nota": "Sigue vigente"}'));
  if m <> 'sin error' then raise exception 'editar la nota del único exigido dio %', m; end if;
end $$;
rollback;
