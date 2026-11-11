-- Registrar documentos por RPC después de subir el objeto (paso 6.05): `documento_registrar()`.
-- No depende de otro archivo (`SOLO=areas/documentos/registrar.sql`). Cada bloque arma su terreno en una transacción y la revierte.
--
-- Qué asegura:
--   C1.3 Sin la clave de subir de cada unidad no se registra (42501), tampoco si falta en una de tres; el repuesto pide la suya.
--   C2   Nadie nace aprobado: queda «subido» y de quien llama.
--   C1.4 Tres vehículos dan tres filas con la misma ruta y refcount 3; reintentar con el mismo p_id devuelve los mismos ids; con otro conjunto, 23505/id.
--   C1.5–C1.9 El tipo, la ruta, el objeto y el mime se validan (22023 con hint). C3: el vencimiento según el modo. C4: sale de la cola de limpieza.

-- @test documentos registrar: los ayudantes
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

-- @test documentos registrar: sin la clave de subir de cada unidad, 42501 y sin filas; el repuesto pide la suya
begin;
do $$
declare e jsonb := pg_temp.dc_preparar(); ana uuid; bea uuid; rosa uuid; v_ruta text; r text; j jsonb;
begin
  ana := pg_temp.dc_persona(array['logistica.ver', 'repuestos.ver']);
  bea := pg_temp.dc_persona(array['logistica.documentos.subir'], pg_temp.dc_u(e, 'a'));
  rosa := pg_temp.dc_persona(array['repuestos.documentos.subir']);
  v_ruta := pg_temp.dc_objeto(pg_temp.dc_u(e, 'v1'), 1);
  r := pg_temp.dc_codigo(ana, pg_temp.dc_reg(gen_random_uuid(), array[pg_temp.dc_u(e, 'v1')], null, pg_temp.dc_u(e, 'tg'), v_ruta));
  if r <> '42501' then raise exception 'sin la clave registró: %', r; end if;
  r := pg_temp.dc_codigo(bea, pg_temp.dc_reg(gen_random_uuid(), array[pg_temp.dc_u(e, 'v1'), pg_temp.dc_u(e, 'v2'), pg_temp.dc_u(e, 'vb')], null,
                                             pg_temp.dc_u(e, 'tg'), v_ruta));
  if r <> '42501' then raise exception 'con la clave sólo del origen A registró en uno de B: %', r; end if;
  if exists (select 1 from public.documentos where ruta = v_ruta) then raise exception 'quedaron filas tras el 42501'; end if;
  r := pg_temp.dc_codigo(rosa, pg_temp.dc_reg(gen_random_uuid(), array[pg_temp.dc_u(e, 'v1')], null, pg_temp.dc_u(e, 'tg'), v_ruta));
  if r <> '42501' then raise exception 'la clave de repuestos registró en un vehículo: %', r; end if;
  -- El repuesto: sin su clave no, con su clave una fila del repuesto.
  v_ruta := pg_temp.dc_objeto(pg_temp.dc_u(e, 'rp'), 2);
  r := pg_temp.dc_codigo(bea, pg_temp.dc_reg(gen_random_uuid(), null, pg_temp.dc_u(e, 'rp'), pg_temp.dc_u(e, 'tg'), v_ruta));
  if r <> '42501' then raise exception 'la clave de logística registró en un repuesto: %', r; end if;
  j := pg_temp.dc_json(rosa, pg_temp.dc_reg(gen_random_uuid(), null, pg_temp.dc_u(e, 'rp'), pg_temp.dc_u(e, 'tg'), v_ruta));
  if jsonb_array_length(j) <> 1 or (j -> 0 ->> 'repuesto_id')::uuid is distinct from pg_temp.dc_u(e, 'rp') or (j -> 0 ->> 'vehiculo_id') is not null then
    raise exception 'el repuesto no quedó registrado: %', j;
  end if;
  -- Bea, con la clave en A, registra en los tres de A.
  v_ruta := pg_temp.dc_objeto(pg_temp.dc_u(e, 'v1'), 3);
  r := pg_temp.dc_codigo(bea, pg_temp.dc_reg(gen_random_uuid(), array[pg_temp.dc_u(e, 'v1'), pg_temp.dc_u(e, 'v2'), pg_temp.dc_u(e, 'v3')], null,
                                             pg_temp.dc_u(e, 'ta'), v_ruta));
  if r <> 'sin error' then raise exception 'con la clave en A no registró en A: %', r; end if;
end $$;
rollback;

-- @test documentos registrar: nadie nace aprobado; 3 vehículos, 3 filas y refcount 3; reintentar devuelve lo mismo; otro conjunto, 23505/id
begin;
do $$
declare e jsonb := pg_temp.dc_preparar(); bea uuid; v_ruta text; v_id uuid := gen_random_uuid(); j jsonb; j2 jsonb; r text; vs uuid[];
begin
  bea := pg_temp.dc_persona(array['logistica.documentos.subir']);
  vs := array[pg_temp.dc_u(e, 'v1'), pg_temp.dc_u(e, 'v2'), pg_temp.dc_u(e, 'v3')];
  v_ruta := pg_temp.dc_objeto(vs[1], 1);
  j := pg_temp.dc_json(bea, pg_temp.dc_reg(v_id, vs, null, pg_temp.dc_u(e, 'tg'), v_ruta));
  if jsonb_array_length(j) <> 3 then raise exception 'no dio 3 filas: %', j; end if;
  if (select count(*) from public.documentos d where d.ruta = v_ruta and d.estado = 'subido' and d.subido_por = bea and d.eliminado_en is null) <> 3 then
    raise exception 'las 3 filas no quedaron subidas y de quien llama';
  end if;
  if public.storage_refcount('documentos', v_ruta) <> 3 then raise exception 'refcount % y no 3', public.storage_refcount('documentos', v_ruta); end if;
  j2 := pg_temp.dc_json(bea, pg_temp.dc_reg(v_id, array[vs[3], vs[1], vs[2]], null, pg_temp.dc_u(e, 'tg'), v_ruta));
  if (select array_agg(x ->> 'id' order by x ->> 'id') from jsonb_array_elements(j2) x)
     is distinct from (select array_agg(x ->> 'id' order by x ->> 'id') from jsonb_array_elements(j) x) then
    raise exception 'reintentar no devolvió los mismos ids: % y %', j, j2;
  end if;
  if public.storage_refcount('documentos', v_ruta) <> 3 then raise exception 'reintentar cambió el refcount'; end if;
  r := pg_temp.dc_codigo(bea, pg_temp.dc_reg(v_id, vs || pg_temp.dc_u(e, 'vb'), null, pg_temp.dc_u(e, 'tg'), v_ruta));
  if r <> '23505/id' then raise exception 'el mismo p_id con otro conjunto dio %', r; end if;
  r := pg_temp.dc_codigo(bea, pg_temp.dc_reg(null, vs, null, pg_temp.dc_u(e, 'tg'), v_ruta));
  if r <> '22023/id' then raise exception 'p_id nulo dio %', r; end if;
  -- Ni por la base nace aprobado (documento_sellos).
  insert into public.documentos (vehiculo_id, tipo_documento_id, estado) values (vs[1], pg_temp.dc_u(e, 'tg'), 'aprobado');
  if exists (select 1 from public.documentos where vehiculo_id = vs[1] and estado = 'aprobado') then raise exception 'nació aprobado por la base'; end if;
end $$;
rollback;

-- @test documentos registrar: el tipo, la ruta, el objeto y el mime se validan; el vencimiento según el modo; sale de la cola de limpieza
begin;
do $$
declare e jsonb := pg_temp.dc_preparar(); bea uuid; v_ruta text; r text; j jsonb; v1 uuid; v2 uuid; tg uuid; ti uuid; tr uuid; ts uuid;
begin
  bea := pg_temp.dc_persona(array['logistica.documentos.subir']);
  v1 := pg_temp.dc_u(e, 'v1'); v2 := pg_temp.dc_u(e, 'v2'); tg := pg_temp.dc_u(e, 'tg');
  insert into public.tipos_documento (flujo_id, nombre, activo) values (null, 'DC inactivo', false) returning id into ti;
  insert into public.tipos_documento (flujo_id, nombre, modo_vencimiento, vigencia_dias) values (null, 'DC renovar', 'renovar', 30) returning id into tr;
  insert into public.tipos_documento (flujo_id, nombre, modo_vencimiento) values (null, 'DC solicitar', 'solicitar') returning id into ts;
  v_ruta := pg_temp.dc_objeto(v1, 1);
  r := pg_temp.dc_codigo(bea, pg_temp.dc_reg(gen_random_uuid(), array[v1], null, pg_temp.dc_u(e, 'tb'), v_ruta));
  if r <> '22023/tipo' then raise exception 'un tipo de otro flujo dio %', r; end if;
  r := pg_temp.dc_codigo(bea, pg_temp.dc_reg(gen_random_uuid(), array[v1], null, ti, v_ruta));
  if r <> '22023/tipo' then raise exception 'un tipo inactivo dio %', r; end if;
  r := pg_temp.dc_codigo(bea, pg_temp.dc_reg(gen_random_uuid(), array[v1], null, tg, v1 || '/' || repeat('e', 64) || '.pdf'));
  if r <> '22023/ruta' then raise exception 'un objeto que no existe dio %', r; end if;
  r := pg_temp.dc_codigo(bea, pg_temp.dc_reg(gen_random_uuid(), array[v2], null, tg, v_ruta));
  if r <> '22023/ruta' then raise exception 'una ruta en la carpeta de un vehículo ajeno a la llamada dio %', r; end if;
  r := pg_temp.dc_codigo(bea, pg_temp.dc_reg(gen_random_uuid(), array[v1], null, tg, pg_temp.dc_objeto(v1, 2, '{"mimetype": "video/mp4", "size": 10}')));
  if r <> '22023/mime' then raise exception 'un mime fuera de los formatos del tipo (según la metadata) dio %', r; end if;
  -- El vencimiento: renovar lo calcula desde la emisión; solicitar lo pide.
  j := pg_temp.dc_json(bea, pg_temp.dc_reg(gen_random_uuid(), array[v1], null, tr, v_ruta, date '2026-01-10'));
  if (select vence_el from public.documentos where id = (j -> 0 ->> 'id')::uuid) is distinct from date '2026-02-09' then
    raise exception 'renovar sin fecha no calculó emisión + vigencia';
  end if;
  r := pg_temp.dc_codigo(bea, pg_temp.dc_reg(gen_random_uuid(), array[v1], null, ts, v_ruta));
  if r <> '22023/vence_el' then raise exception 'solicitar sin fecha dio %', r; end if;
  -- Una v_ruta en la cola de limpieza sale al registrarla.
  v_ruta := pg_temp.dc_objeto(v1, 3);
  insert into public.cola_gc_storage (bucket, ruta) values ('documentos', v_ruta);
  perform pg_temp.dc_json(bea, pg_temp.dc_reg(gen_random_uuid(), array[v1], null, tg, v_ruta));
  if exists (select 1 from public.cola_gc_storage c where c.bucket = 'documentos' and c.ruta = v_ruta) then
    raise exception 'registrar no sacó la ruta de la cola de limpieza';
  end if;
end $$;
rollback;

