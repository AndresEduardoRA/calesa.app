-- Revisar, editar y eliminar documentos por RPC con versión (paso 6.05): `documento_revisar()`, `documento_editar()`, `documento_eliminar()`.
-- No depende de otro archivo (`SOLO=areas/documentos/revisar.sql`). Cada bloque arma su terreno en una transacción y la revierte.
--
-- Qué asegura:
--   C7   Rechazar sin motivo falla (22023/motivo); aprobar sin la clave da 42501, también con la versión vieja; la versión vieja da PT409.
--   C8   visible_portal lo cambia sólo quien aprueba (42501/visible_portal); encenderlo en un tipo que no lo permite da 23514.
--   C11b Un visible de un tipo al que luego se le apaga el permiso se sigue revisando y eliminando.
--   C10–C11 Quien subió elimina su «subido», no un aprobado; eliminar 1 de 3 deja el refcount en 2; los 3, en 0 y la ruta en la cola.

-- @test documentos revisar: los ayudantes
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

-- @test documentos revisar: rechazar sin motivo falla; aprobar sin la clave da 42501 (antes que la versión); la versión vieja da PT409
begin;
do $$
declare e jsonb := pg_temp.dc_preparar(); sube uuid; aprueba uuid; d uuid; v0 timestamptz; r text;
begin
  sube := pg_temp.dc_persona(array['logistica.documentos.subir', 'logistica.ver']);
  aprueba := pg_temp.dc_persona(array['logistica.documentos.aprobar', 'logistica.ver']);
  d := (pg_temp.dc_registrar(sube, array[pg_temp.dc_u(e, 'v1')], pg_temp.dc_u(e, 'tg'), pg_temp.dc_objeto(pg_temp.dc_u(e, 'v1'), 1)))[1];
  v0 := pg_temp.dc_version(d);
  r := pg_temp.dc_codigo(aprueba, format('select public.documento_revisar(%L, %L, %L, %L)', d, v0, 'rechazado', '  '));
  if r <> '22023/motivo' then raise exception 'rechazar sin motivo dio %', r; end if;
  if (select estado from public.documentos where id = d) <> 'subido' or pg_temp.dc_version(d) <> v0 then raise exception 'el rechazo fallido cambió la fila'; end if;
  r := pg_temp.dc_codigo(sube, format('select public.documento_revisar(%L, %L, %L, null)', d, v0, 'aprobado'));
  if r <> '42501' then raise exception 'aprobar sin la clave dio %', r; end if;
  r := pg_temp.dc_codigo(sube, format('select public.documento_revisar(%L, %L, %L, null)', d, '2000-01-01', 'aprobado'));
  if r <> '42501' then raise exception 'aprobar sin la clave y con la versión vieja dio % (el permiso va primero)', r; end if;
  r := pg_temp.dc_codigo(aprueba, format('select public.documento_revisar(%L, %L, %L, null)', d, v0, 'aprobado'));
  if r <> 'sin error' then raise exception 'quien aprueba no aprobó: %', r; end if;
  if (select estado::text || '|' || revisado_por::text from public.documentos where id = d) <> 'aprobado|' || aprueba then
    raise exception 'no quedó aprobado y sellado por quien aprueba';
  end if;
  r := pg_temp.dc_codigo(aprueba, format('select public.documento_revisar(%L, %L, %L, %L)', d, v0, 'rechazado', 'Ilegible'));
  if r <> 'PT409' then raise exception 'la versión vieja dio %', r; end if;
end $$;
rollback;

-- @test documentos revisar: visible_portal sólo quien aprueba; un tipo sin permiso da 23514; apagado el permiso después, se revisa y se elimina
begin;
do $$
declare e jsonb := pg_temp.dc_preparar(); sube uuid; aprueba uuid; d uuid; d2 uuid; tp uuid; r text;
begin
  sube := pg_temp.dc_persona(array['logistica.documentos.subir', 'logistica.ver']);
  aprueba := pg_temp.dc_persona(array['logistica.documentos.aprobar', 'logistica.ver']);
  insert into public.tipos_documento (flujo_id, nombre, visible_portal_permitido) values (null, 'DC del portal', true) returning id into tp;
  d := (pg_temp.dc_registrar(sube, array[pg_temp.dc_u(e, 'v1')], pg_temp.dc_u(e, 'tg'), pg_temp.dc_objeto(pg_temp.dc_u(e, 'v1'), 1)))[1];
  d2 := (pg_temp.dc_registrar(sube, array[pg_temp.dc_u(e, 'v1')], tp, pg_temp.dc_objeto(pg_temp.dc_u(e, 'v1'), 2)))[1];
  r := pg_temp.dc_codigo(sube, format('select public.documento_editar(%L, %L, %L)', d2, pg_temp.dc_version(d2), '{"visible_portal": true}'));
  if r <> '42501/visible_portal' then raise exception 'quien subió marcó el portal: %', r; end if;
  r := pg_temp.dc_codigo(sube, format('select public.documento_editar(%L, %L, %L)', d2, pg_temp.dc_version(d2), '{"nota": "Copia legible"}'));
  if r <> 'sin error' then raise exception 'quien subió no editó la nota de su «subido»: %', r; end if;
  r := pg_temp.dc_codigo(aprueba, format('select public.documento_editar(%L, %L, %L)', d, pg_temp.dc_version(d), '{"visible_portal": true}'));
  if r <> '23514' then raise exception 'un tipo sin permiso del portal dio %', r; end if;
  r := pg_temp.dc_codigo(aprueba, format('select public.documento_editar(%L, %L, %L)', d2, pg_temp.dc_version(d2), '{"visible_portal": true}'));
  if r <> 'sin error' or not (select visible_portal from public.documentos where id = d2) then raise exception 'quien aprueba no marcó el portal: %', r; end if;
  -- 5.03 deja apagar el permiso del tipo sin tocar los visibles: el documento se sigue revisando y eliminando.
  update public.tipos_documento set visible_portal_permitido = false where id = tp;
  r := pg_temp.dc_codigo(aprueba, format('select public.documento_revisar(%L, %L, %L, null)', d2, pg_temp.dc_version(d2), 'aprobado'));
  if r <> 'sin error' then raise exception 'revisar un visible de un tipo sin permiso dio %', r; end if;
  r := pg_temp.dc_codigo(aprueba, format('select public.documento_eliminar(%L, %L)', d2, pg_temp.dc_version(d2)));
  if r <> 'sin error' then raise exception 'eliminar un visible de un tipo sin permiso dio %', r; end if;
end $$;
rollback;

-- @test documentos revisar: quien subió elimina su «subido» y no un aprobado; el refcount cuenta las vivas y la última encola la ruta
begin;
do $$
declare e jsonb := pg_temp.dc_preparar(); sube uuid; aprueba uuid; ds uuid[]; d uuid; v_ruta text; r text;
begin
  sube := pg_temp.dc_persona(array['logistica.documentos.subir', 'logistica.ver']);
  aprueba := pg_temp.dc_persona(array['logistica.documentos.aprobar', 'logistica.ver']);
  d := (pg_temp.dc_registrar(sube, array[pg_temp.dc_u(e, 'v1')], pg_temp.dc_u(e, 'tg'), pg_temp.dc_objeto(pg_temp.dc_u(e, 'v1'), 9)))[1];
  perform pg_temp.dc_json(aprueba, format('select public.documento_revisar(%L, %L, %L, null)', d, pg_temp.dc_version(d), 'aprobado'));
  r := pg_temp.dc_codigo(sube, format('select public.documento_eliminar(%L, %L)', d, pg_temp.dc_version(d)));
  if r <> '42501' then raise exception 'quien subió eliminó un aprobado: %', r; end if;
  v_ruta := pg_temp.dc_objeto(pg_temp.dc_u(e, 'v1'), 1);
  ds := pg_temp.dc_registrar(sube, array[pg_temp.dc_u(e, 'v1'), pg_temp.dc_u(e, 'v2'), pg_temp.dc_u(e, 'v3')], pg_temp.dc_u(e, 'tg'), v_ruta);
  r := pg_temp.dc_codigo(sube, format('select public.documento_eliminar(%L, %L)', ds[1], pg_temp.dc_version(ds[1])));
  if r <> 'sin error' then raise exception 'quien subió no eliminó su «subido»: %', r; end if;
  if public.storage_refcount('documentos', v_ruta) <> 2 then raise exception 'eliminar 1 de 3 dejó el refcount en %', public.storage_refcount('documentos', v_ruta); end if;
  if exists (select 1 from public.cola_gc_storage c where c.bucket = 'documentos' and c.ruta = v_ruta) then raise exception 'encoló con filas vivas'; end if;
  r := pg_temp.dc_codigo(sube, format('select public.documento_eliminar(%L, %L)', ds[1], pg_temp.dc_version(ds[1])));
  if r <> 'PT409' then raise exception 'eliminar dos veces dio %', r; end if;
  perform pg_temp.dc_json(sube, format('select public.documento_eliminar(%L, %L)', ds[2], pg_temp.dc_version(ds[2])));
  perform pg_temp.dc_json(aprueba, format('select public.documento_eliminar(%L, %L)', ds[3], pg_temp.dc_version(ds[3])));
  if public.storage_refcount('documentos', v_ruta) <> 0 then raise exception 'eliminar los 3 dejó el refcount en %', public.storage_refcount('documentos', v_ruta); end if;
  if not exists (select 1 from public.cola_gc_storage c where c.bucket = 'documentos' and c.ruta = v_ruta) then raise exception 'la última no encoló la ruta'; end if;
end $$;
rollback;
