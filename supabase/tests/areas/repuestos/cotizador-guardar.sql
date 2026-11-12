-- Crear y guardar cotizaciones de repuestos por RPC (paso 8.12-1, C9–C13, C19). No depende de otro archivo (`SOLO=areas/repuestos/cotizador-guardar.sql`);
-- cada bloque abre su transacción y la revierte. El arnés `rcz_` es copia del de `cotizador.sql`.
--
-- Qué asegura:
--   G1. Crear congela la configuración de id más alto y los tramos y cajas activos de su moneda; sin configuración, 23514; idempotente por id.
--   G2. Guardar recalcula cada total en la base (K1 + K4 = 375,00); lo que el cliente crea saber del total no entra (22023) y nada cambia.
--   G3. Publicar otra configuración o cambiar tramos no cambia una cotización que existe: ni su snapshot ni lo que guardar recalcula.
--   G4. Versión vieja → PT409; el error de una línea dice cuál es (`detail` = su id); ítem ajeno o repetido; proyecto cerrado → 23514.

create or replace function pg_temp.rcz_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-rcz@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio que tiene estas claves.
create or replace function pg_temp.rcz_persona(p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.rcz_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('rcz_' || substr(v_id::text, 1, 8), 'rcz ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c, null, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint, detalle}`.
create or replace function pg_temp.rcz_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text; v_h text; v_d text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint, v_d = pg_exception_detail;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''), 'detalle', nullif(v_d, ''));
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

create or replace function pg_temp.rcz_es(p_que text, p_r jsonb, p_estado text, p_hint text, p_mensaje text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint
     or (p_mensaje is not null and p_r ->> 'mensaje' is distinct from p_mensaje) then
    raise exception '%: debía dar % (hint %) «%» y dio %', p_que, p_estado, p_hint, coalesce(p_mensaje, '…'), p_r;
  end if;
end $f$;

create or replace function pg_temp.rcz_ok(p_que text, p_r jsonb) returns jsonb language plpgsql as $f$
begin
  if p_r ? 'error' then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return p_r;
end $f$;

create or replace function pg_temp.rcz_todos() returns text[] language sql as $f$
  select array['repuestos.ver', 'repuestos.editar', 'repuestos.cotizar'];
$f$;

create or replace function pg_temp.rcz_proyecto(p_quien uuid) returns uuid language plpgsql as $f$
declare i uuid := gen_random_uuid();
begin
  perform pg_temp.rcz_ok('proyecto', pg_temp.rcz_corre(p_quien, format('select public.repuesto_proyecto_crear(%L, %L)', i, '{"vehiculo_etiqueta": "rq"}')));
  return i;
end $f$;

-- La moneda XTS (y XTU), la configuración A de los casos (factor 1,35, recargo 0,10, redondeo 1) y sus tramos y cajas en XTS:
-- [0,100) → 15, [100,500) → 40, [500,2000) → 90; cajas de 10 y 25 (y una de 99 inactiva, y un tramo inactivo que no cuenta).
create or replace function pg_temp.rcz_terreno() returns jsonb language plpgsql as $f$
declare k bigint; c10 uuid; c25 uuid;
begin
  insert into public.monedas (codigo, nombre, simbolo) values ('XTS', 'Prueba', 'X'), ('XTU', 'Prueba U', 'U')
  on conflict (codigo) do update set activa = true;
  delete from public.repuestos_tramos_logistica where moneda in ('XTS', 'XTU');
  delete from public.repuestos_cajas where moneda in ('XTS', 'XTU');
  insert into public.repuestos_cotizador_config (factor_importado, recargo_local, redondeo) values (1.35, 0.10, 1.00) returning id into k;
  insert into public.repuestos_tramos_logistica (moneda, costo_min, costo_max, monto) values
    ('XTS', 0, 100, 15), ('XTS', 100, 500, 40), ('XTS', 500, 2000, 90);
  insert into public.repuestos_tramos_logistica (moneda, costo_min, costo_max, monto, activo) values ('XTS', 0, 50, 1, false);
  insert into public.repuestos_cajas (moneda, monto) values ('XTS', 10) returning id into c10;
  insert into public.repuestos_cajas (moneda, monto) values ('XTS', 25) returning id into c25;
  insert into public.repuestos_cajas (moneda, monto, activa) values ('XTS', 99, false);
  return jsonb_build_object('config', k, 'c10', c10, 'c25', c25);
end $f$;

create or replace function pg_temp.rcz_crear(p_quien uuid, p_id uuid, p_proyecto uuid, p_moneda text default 'XTS') returns jsonb language sql as $f$
  select pg_temp.rcz_corre(p_quien, format('select public.repuestos_cotizacion_crear(%L::uuid, %L::uuid, %L)', p_id, p_proyecto, p_moneda));
$f$;

create or replace function pg_temp.rcz_guardar(p_quien uuid, p_id uuid, p_lineas jsonb, p_esperada timestamptz, p_notas text default null) returns jsonb
language sql as $f$
  select pg_temp.rcz_corre(p_quien, format('select public.repuestos_cotizacion_guardar(%L::uuid, %L::jsonb, %L, %L::timestamptz)', p_id, p_lineas, p_notas, p_esperada));
$f$;

create or replace function pg_temp.rcz_aceptar(p_quien uuid, p_id uuid, p_esperada timestamptz) returns jsonb language sql as $f$
  select pg_temp.rcz_corre(p_quien, format('select public.repuestos_cotizacion_aceptar(%L::uuid, %L::timestamptz)', p_id, p_esperada));
$f$;

create or replace function pg_temp.rcz_anular(p_quien uuid, p_id uuid, p_esperada timestamptz) returns jsonb language sql as $f$
  select pg_temp.rcz_corre(p_quien, format('select public.repuestos_cotizacion_anular(%L::uuid, %L::timestamptz)', p_id, p_esperada));
$f$;

create or replace function pg_temp.rcz_fila(p_id uuid) returns public.repuestos_cotizaciones language sql as $f$
  select * from public.repuestos_cotizaciones where id = p_id;
$f$;

-- Una línea K1 (importado 80, logística sugerida, caja 10) y una K4 (local 80, logística 20, caja 10, × 2), con ids nuevos.
create or replace function pg_temp.rcz_k1(p_item uuid default null) returns jsonb language sql as $f$
  select jsonb_build_object('id', gen_random_uuid(), 'item_id', p_item, 'descripcion', 'K1', 'bloque', 'importado', 'cantidad', 1, 'costo', '80.00',
                            'logistica', null, 'caja', '10.00');
$f$;
create or replace function pg_temp.rcz_k4(p_item uuid default null) returns jsonb language sql as $f$
  select jsonb_build_object('id', gen_random_uuid(), 'item_id', p_item, 'descripcion', 'K4', 'bloque', 'local', 'cantidad', 2, 'costo', 80,
                            'logistica', '20.00', 'caja', 10);
$f$;

-- @test repuestos: crear congela la configuración vigente, los tramos y las cajas activos de su moneda; idempotente por id (G1)
begin;
do $$
declare
  ed uuid := pg_temp.rcz_persona(pg_temp.rcz_todos()); t jsonb := pg_temp.rcz_terreno(); p uuid := pg_temp.rcz_proyecto(ed); c uuid := gen_random_uuid();
  r jsonb; s jsonb; k2 bigint;
begin
  -- La de id más alto manda, aunque se haya publicado después de otra.
  insert into public.repuestos_cotizador_config (factor_importado, recargo_local, redondeo) values (1.2, 0.075, 0.05) returning id into k2;
  r := pg_temp.rcz_ok('G1 crear', pg_temp.rcz_crear(ed, c, p, ' xts '));
  if (select array_agg(k order by k) from jsonb_object_keys(r) k)
     <> array['actualizado_en', 'config_snapshot', 'estado', 'id', 'moneda', 'numero', 'ya_existia'] or (r ->> 'ya_existia')::boolean then
    raise exception 'G1: las claves de la respuesta no son las de C10: %', r;
  end if;
  s := (pg_temp.rcz_fila(c)).config_snapshot;
  if s <> r -> 'config_snapshot' or s ->> 'version' <> '1' or s ->> 'moneda' <> 'XTS'
     or s -> 'config' ->> 'id' <> k2::text or s -> 'config' ->> 'factor_importado' <> '1.2000' or s -> 'config' ->> 'redondeo' <> '0.05'
     or s -> 'tramos' <> '[{"costo_min": "0.00", "costo_max": "100.00", "monto": "15.00"}, {"costo_min": "100.00", "costo_max": "500.00", "monto": "40.00"}, {"costo_min": "500.00", "costo_max": "2000.00", "monto": "90.00"}]'::jsonb
     or s -> 'cajas' <> jsonb_build_array(jsonb_build_object('id', t ->> 'c10', 'monto', '10.00'), jsonb_build_object('id', t ->> 'c25', 'monto', '25.00')) then
    raise exception 'G1: el snapshot no es el de C4: %', s;
  end if;
  if (pg_temp.rcz_fila(c)).estado <> 'borrador' or (pg_temp.rcz_fila(c)).total is not null or (pg_temp.rcz_fila(c)).creado_por <> ed then
    raise exception 'G1: crear deja un borrador sin total y con quién: %', to_jsonb(pg_temp.rcz_fila(c));
  end if;
  -- Otra moneda sin tramos ni cajas: listas vacías.
  r := pg_temp.rcz_ok('G1 XTU', pg_temp.rcz_crear(ed, gen_random_uuid(), p, 'XTU'));
  if r -> 'config_snapshot' -> 'tramos' <> '[]' or r -> 'config_snapshot' -> 'cajas' <> '[]' then
    raise exception 'G1: XTU no tiene tramos ni cajas: %', r;
  end if;
  -- El reintento con el mismo id devuelve la misma; con otro proyecto o moneda, 23505.
  r := pg_temp.rcz_ok('G1 reintento', pg_temp.rcz_crear(ed, c, p));
  if not (r ->> 'ya_existia')::boolean or r ->> 'numero' <> (pg_temp.rcz_fila(c)).numero::text then
    raise exception 'G1: el reintento debía devolver la misma: %', r;
  end if;
  perform pg_temp.rcz_es('G1 id ajeno', pg_temp.rcz_crear(ed, c, p, 'XTU'), '23505', 'id');
  perform pg_temp.rcz_es('G1 sin id', pg_temp.rcz_crear(ed, null, p), '23502', 'id');
  perform pg_temp.rcz_es('G1 moneda inactiva', pg_temp.rcz_crear(ed, gen_random_uuid(), p, 'ZZZ'), '22023', 'moneda');
  perform pg_temp.rcz_es('G1 proyecto que no existe', pg_temp.rcz_crear(ed, gen_random_uuid(), gen_random_uuid()), 'PT409', 'conflicto');
  -- Sin ninguna configuración, 23514 con el camino a Configuración.
  delete from public.repuestos_cotizador_config;
  perform pg_temp.rcz_es('G1 sin config', pg_temp.rcz_crear(ed, gen_random_uuid(), p), '23514', 'config',
    'Todavía no hay configuración del cotizador: publícala en Configuración › Repuestos.');
end $$;
rollback;

-- @test repuestos: guardar recalcula cada total en la base y no acepta el total del cliente (G2)
begin;
do $$
declare
  ed uuid := pg_temp.rcz_persona(pg_temp.rcz_todos()); t jsonb := pg_temp.rcz_terreno(); p uuid := pg_temp.rcz_proyecto(ed); c uuid := gen_random_uuid();
  r jsonb; v timestamptz; k1 jsonb := pg_temp.rcz_k1(); k4 jsonb := pg_temp.rcz_k4(); sin_caja jsonb;
begin
  v := (pg_temp.rcz_ok('G2 crear', pg_temp.rcz_crear(ed, c, p)) ->> 'actualizado_en')::timestamptz;
  r := pg_temp.rcz_ok('G2 guardar', pg_temp.rcz_guardar(ed, c, jsonb_build_array(k1, k4), v, '  notas  '));
  if r ->> 'total' <> '375.00' or r -> 'lineas' <> jsonb_build_array(
       jsonb_build_object('id', k1 ->> 'id', 'logistica_sugerida', '15.00', 'total', '133.00', 'falta', null),
       jsonb_build_object('id', k4 ->> 'id', 'logistica_sugerida', '15.00', 'total', '242.00', 'falta', null)) then
    raise exception 'G2: K1 + K4 debían dar 133,00 + 242,00 = 375,00: %', r;
  end if;
  if (pg_temp.rcz_fila(c)).total <> 375.00 or (pg_temp.rcz_fila(c)).notas <> 'notas'
     or (select array_agg(l.total order by l.orden) from public.repuestos_cotizaciones_lineas l where l.cotizacion_id = c) <> array[133.00, 242.00]
     or (select array_agg(l.caja_sugerida order by l.orden) from public.repuestos_cotizaciones_lineas l where l.cotizacion_id = c) <> array[10.00, 10.00]
     or (select array_agg(l.orden order by l.orden) from public.repuestos_cotizaciones_lineas l where l.cotizacion_id = c) <> array[1, 2]::smallint[] then
    raise exception 'G2: lo guardado no es lo calculado';
  end if;
  v := (r ->> 'actualizado_en')::timestamptz;
  -- Lo que el cliente crea saber del total no entra: 22023 con esa clave, la línea que es y nada cambia.
  perform pg_temp.rcz_es('G2 total', pg_temp.rcz_guardar(ed, c, jsonb_build_array(k1, k4 || '{"total": "1.00"}'), v), '22023', 'total',
    'Línea 2: no se escribe «total».');
  perform pg_temp.rcz_es('G2 sugerida', pg_temp.rcz_guardar(ed, c, jsonb_build_array(k1 || '{"logistica_sugerida": "0"}'), v), '22023', 'logistica_sugerida');
  perform pg_temp.rcz_es('G2 caja sugerida', pg_temp.rcz_guardar(ed, c, jsonb_build_array(k1 || '{"caja_sugerida": "0"}'), v), '22023', 'caja_sugerida');
  if (pg_temp.rcz_fila(c)).total <> 375.00 or (pg_temp.rcz_fila(c)).actualizado_en <> v then
    raise exception 'G2: un guardar rechazado cambió la cotización';
  end if;
  -- Una línea sin caja queda sin total, y la cotización también (nulo no es 0); sin líneas, total nulo.
  sin_caja := k1 || '{"caja": null}';
  r := pg_temp.rcz_ok('G2 sin caja', pg_temp.rcz_guardar(ed, c, jsonb_build_array(sin_caja, k4), v));
  if r ->> 'total' is not null or r -> 'lineas' -> 0 ->> 'falta' <> 'caja' or (pg_temp.rcz_fila(c)).total is not null then
    raise exception 'G2: con una línea sin total la cotización no tiene total: %', r;
  end if;
  r := pg_temp.rcz_ok('G2 vacía', pg_temp.rcz_guardar(ed, c, '[]', (r ->> 'actualizado_en')::timestamptz));
  if r ->> 'total' is not null or exists (select 1 from public.repuestos_cotizaciones_lineas where cotizacion_id = c) then
    raise exception 'G2: sin líneas no hay total ni quedan líneas: %', r;
  end if;
end $$;
rollback;

-- @test repuestos: publicar otra configuración o cambiar tramos no cambia una cotización que existe (G3)
begin;
do $$
declare
  ed uuid := pg_temp.rcz_persona(pg_temp.rcz_todos()); t jsonb := pg_temp.rcz_terreno(); p uuid := pg_temp.rcz_proyecto(ed); c uuid := gen_random_uuid();
  r jsonb; v timestamptz; antes jsonb; k1 jsonb := pg_temp.rcz_k1();
begin
  v := (pg_temp.rcz_ok('G3 crear', pg_temp.rcz_crear(ed, c, p)) ->> 'actualizado_en')::timestamptz;
  antes := (pg_temp.rcz_fila(c)).config_snapshot;
  -- Otra configuración (factor 2), sin el primer tramo y sin la caja de 10.
  insert into public.repuestos_cotizador_config (factor_importado, recargo_local, redondeo) values (2, 0.5, 10);
  update public.repuestos_tramos_logistica set activo = false where moneda = 'XTS' and costo_min = 0;
  update public.repuestos_cajas set activa = false where id = (t ->> 'c10')::uuid;
  r := pg_temp.rcz_ok('G3 guardar', pg_temp.rcz_guardar(ed, c, jsonb_build_array(k1), v));
  if r ->> 'total' <> '133.00' or r -> 'lineas' -> 0 ->> 'logistica_sugerida' <> '15.00' or (pg_temp.rcz_fila(c)).config_snapshot <> antes then
    raise exception 'G3: la cotización debía seguir con su snapshot (133,00 con la sugerida 15): %', r;
  end if;
  -- Una nueva toma la configuración nueva: sin el tramo [0,100) no hay sugerencia, la caja de 10 ya no está y el factor es 2.
  c := gen_random_uuid();
  v := (pg_temp.rcz_ok('G3 crear nueva', pg_temp.rcz_crear(ed, c, p)) ->> 'actualizado_en')::timestamptz;
  perform pg_temp.rcz_es('G3 caja que ya no está', pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1()), v), '22023', 'caja');
  -- Un id de línea de otra cotización choca (23505); con uno nuevo pasa.
  perform pg_temp.rcz_es('G3 id de otra cotización', pg_temp.rcz_guardar(ed, c, jsonb_build_array(k1 || '{"caja": "25"}'), v), '23505', 'id');
  r := pg_temp.rcz_ok('G3 guardar nueva', pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1() || '{"caja": "25", "logistica": "5"}'), v));
  if r ->> 'total' <> '190.00' or r -> 'lineas' -> 0 ->> 'logistica_sugerida' is not null then
    raise exception 'G3: con factor 2 y redondeo 10, 80 × 2 + 5 + 25 = 190: %', r;
  end if;
end $$;
rollback;

-- @test repuestos: versión, el error de cada línea, ítems del proyecto y proyecto cerrado (G4)
begin;
do $$
declare
  ed uuid := pg_temp.rcz_persona(pg_temp.rcz_todos()); t jsonb := pg_temp.rcz_terreno(); p uuid := pg_temp.rcz_proyecto(ed); otro uuid := pg_temp.rcz_proyecto(ed);
  c uuid := gen_random_uuid(); r jsonb; v timestamptz; i uuid; i_otro uuid; i_borrado uuid; mala jsonb;
begin
  insert into public.repuestos_items (proyecto_id, descripcion) values (p, 'rq ítem') returning id into i;
  insert into public.repuestos_items (proyecto_id, descripcion) values (otro, 'rq otro') returning id into i_otro;
  insert into public.repuestos_items (proyecto_id, descripcion, eliminado_en) values (p, 'rq borrado', now()) returning id into i_borrado;
  v := (pg_temp.rcz_ok('G4 crear', pg_temp.rcz_crear(ed, c, p)) ->> 'actualizado_en')::timestamptz;
  r := pg_temp.rcz_ok('G4 guardar', pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1(i)), v));
  perform pg_temp.rcz_es('G4 versión vieja', pg_temp.rcz_guardar(ed, c, '[]', v - interval '1 second'), 'PT409', null,
    'Otra persona cambió esta cotización. Recarga para ver lo nuevo.');
  v := (r ->> 'actualizado_en')::timestamptz;
  -- El error de una línea: «Línea N», el campo y el id de la línea.
  mala := pg_temp.rcz_k4() || '{"caja": "11"}';
  r := pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1(), mala), v);
  perform pg_temp.rcz_es('G4 caja fuera del snapshot', r, '22023', 'caja', 'Línea 2: esa caja no está entre las de esta cotización.');
  if r ->> 'detalle' is distinct from mala ->> 'id' then
    raise exception 'G4: el detail debía ser el id de la línea: %', r;
  end if;
  perform pg_temp.rcz_es('G4 tres decimales', pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1() || '{"costo": "1.234"}'), v), '22023', 'costo');
  perform pg_temp.rcz_es('G4 negativo', pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1() || '{"logistica": -1}'), v), '22023', 'logistica');
  perform pg_temp.rcz_es('G4 no cabe el costo', pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1() || '{"costo": "1e16"}'), v), '22023', 'costo');
  perform pg_temp.rcz_es('G4 no cabe el total', pg_temp.rcz_guardar(ed, c,
    jsonb_build_array(pg_temp.rcz_k1() || '{"costo": "9999999999999.99", "cantidad": 100000, "logistica": 0}'), v), '22023', 'cantidad');
  perform pg_temp.rcz_es('G4 cantidad', pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1() || '{"cantidad": 1.5}'), v), '22023', 'cantidad');
  perform pg_temp.rcz_es('G4 bloque', pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1() || '{"bloque": "otro"}'), v), '22023', 'bloque');
  perform pg_temp.rcz_es('G4 sin descripción', pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1() || '{"descripcion": " "}'), v),
    '23502', 'descripcion');
  perform pg_temp.rcz_es('G4 sin id', pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1() - 'id'), v), '23502', 'id');
  mala := pg_temp.rcz_k1();
  perform pg_temp.rcz_es('G4 línea repetida', pg_temp.rcz_guardar(ed, c, jsonb_build_array(mala, mala), v), '22023', 'id');
  perform pg_temp.rcz_es('G4 no es lista', pg_temp.rcz_guardar(ed, c, '{}', v), '22023', 'lineas');
  perform pg_temp.rcz_es('G4 más de 200', pg_temp.rcz_guardar(ed, c, (select jsonb_agg(pg_temp.rcz_k1()) from generate_series(1, 201)), v), '22023', 'lineas');
  -- Ítems: de otro proyecto, eliminado o repetido → 22023 item_id con la línea.
  r := pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1(), pg_temp.rcz_k4(i_otro)), v);
  perform pg_temp.rcz_es('G4 ítem ajeno', r, '22023', 'item_id', 'Línea 2: ese ítem no es de este proyecto.');
  perform pg_temp.rcz_es('G4 ítem borrado', pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1(i_borrado)), v), '22023', 'item_id');
  perform pg_temp.rcz_es('G4 ítem repetido', pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1(i), pg_temp.rcz_k4(i)), v), '22023', 'item_id');
  if (pg_temp.rcz_fila(c)).actualizado_en <> v then
    raise exception 'G4: un guardar rechazado cambió la cotización';
  end if;
  -- Proyecto cerrado: 23514 proyecto.
  update public.repuestos_proyectos set cerrado_en = now() where id = p;
  perform pg_temp.rcz_es('G4 cerrado', pg_temp.rcz_guardar(ed, c, '[]', v), '23514', 'proyecto', 'El proyecto está cerrado: reábrelo para cotizar.');
  perform pg_temp.rcz_es('G4 crear en cerrado', pg_temp.rcz_crear(ed, gen_random_uuid(), p), '23514', 'proyecto');
end $$;
rollback;
