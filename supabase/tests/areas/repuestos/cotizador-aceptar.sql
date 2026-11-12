-- Aceptar y anular cotizaciones de repuestos por RPC (paso 8.12-1, C14–C16). No depende de otro archivo (`SOLO=areas/repuestos/cotizador-aceptar.sql`);
-- cada bloque abre su transacción y la revierte. El arnés `rcz_` es copia del de `cotizador.sql`.
--
-- Qué asegura:
--   A1. Aceptar copia el unitario y la moneda a cada ítem vivo (no al eliminado ni a una línea libre) y sella `aceptada_en`.
--   A2. Una sola aceptada por proyecto: aceptar otra anula la anterior; el índice parcial lo garantiza; una línea sin total no se acepta.
--   A3. Aceptada no se edita ni se acepta otra vez; anular una aceptada deja el precio del ítem; anular una anulada, 23514.
--   F3. Sin INSERT, UPDATE ni DELETE directos en cotizaciones y líneas (42501): `total` y `config_snapshot` no se escriben directo.
--   F4. Sin `repuestos.cotizar` (o sin `repuestos.ver`) las cuatro RPC dan 42501; aceptar pide también `repuestos.editar`.

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

-- @test repuestos: aceptar copia el unitario y la moneda a cada ítem vivo y sella aceptada_en (A1)
begin;
do $$
declare
  ed uuid := pg_temp.rcz_persona(pg_temp.rcz_todos()); t jsonb := pg_temp.rcz_terreno(); p uuid := pg_temp.rcz_proyecto(ed); c uuid := gen_random_uuid();
  r jsonb; v timestamptz; i1 uuid; i4 uuid; i_borrar uuid; f public.repuestos_cotizaciones;
begin
  insert into public.repuestos_items (proyecto_id, descripcion) values (p, 'rq 1') returning id into i1;
  insert into public.repuestos_items (proyecto_id, descripcion) values (p, 'rq 4') returning id into i4;
  insert into public.repuestos_items (proyecto_id, descripcion, precio_cliente, moneda) values (p, 'rq borrar', 7, 'XTU') returning id into i_borrar;
  v := (pg_temp.rcz_ok('A1 crear', pg_temp.rcz_crear(ed, c, p)) ->> 'actualizado_en')::timestamptz;
  -- K4 lleva cantidad 2: el ítem recibe el unitario (121,00), no el total (242,00).
  r := pg_temp.rcz_ok('A1 guardar', pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1(i1), pg_temp.rcz_k4(i4),
         pg_temp.rcz_k1(i_borrar) || '{"descripcion": "a borrar"}', pg_temp.rcz_k1() || '{"descripcion": "libre"}'), v));
  update public.repuestos_items set eliminado_en = now() where id = i_borrar;
  r := pg_temp.rcz_ok('A1 aceptar', pg_temp.rcz_aceptar(ed, c, (r ->> 'actualizado_en')::timestamptz));
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) <> array['aceptada_en', 'actualizado_en', 'anulada', 'id', 'items']
     or (r ->> 'items')::integer <> 2 or r ->> 'anulada' is not null then
    raise exception 'A1: la respuesta no es la de C14: %', r;
  end if;
  f := pg_temp.rcz_fila(c);
  if f.estado <> 'aceptada' or f.aceptada_en is null or f.aceptada_en::text <> (r ->> 'aceptada_en')::timestamptz::text then
    raise exception 'A1: aceptada y con aceptada_en: %', to_jsonb(f);
  end if;
  if (select (precio_cliente, btrim(moneda)) from public.repuestos_items where id = i1) is distinct from (133.00::numeric(18,2), 'XTS'::text)
     or (select (precio_cliente, btrim(moneda)) from public.repuestos_items where id = i4) is distinct from (121.00::numeric(18,2), 'XTS'::text) then
    raise exception 'A1: los ítems debían recibir 133,00 y 121,00 en XTS';
  end if;
  if (select (precio_cliente, btrim(moneda)) from public.repuestos_items where id = i_borrar) is distinct from (7.00::numeric(18,2), 'XTU'::text) then
    raise exception 'A1: el ítem eliminado no recibe precio';
  end if;
end $$;
rollback;

-- @test repuestos: una sola aceptada por proyecto; una línea sin total no se acepta (A2)
begin;
do $$
declare
  ed uuid := pg_temp.rcz_persona(pg_temp.rcz_todos()); t jsonb := pg_temp.rcz_terreno(); p uuid := pg_temp.rcz_proyecto(ed); otro uuid := pg_temp.rcz_proyecto(ed);
  c1 uuid := gen_random_uuid(); c2 uuid := gen_random_uuid(); c3 uuid := gen_random_uuid(); r jsonb; v timestamptz;
begin
  v := (pg_temp.rcz_ok('A2 crear 1', pg_temp.rcz_crear(ed, c1, p)) ->> 'actualizado_en')::timestamptz;
  v := (pg_temp.rcz_ok('A2 guardar 1', pg_temp.rcz_guardar(ed, c1, jsonb_build_array(pg_temp.rcz_k1()), v)) ->> 'actualizado_en')::timestamptz;
  perform pg_temp.rcz_ok('A2 aceptar 1', pg_temp.rcz_aceptar(ed, c1, v));
  -- La de otro proyecto no se toca.
  v := (pg_temp.rcz_ok('A2 crear 3', pg_temp.rcz_crear(ed, c3, otro)) ->> 'actualizado_en')::timestamptz;
  v := (pg_temp.rcz_ok('A2 guardar 3', pg_temp.rcz_guardar(ed, c3, jsonb_build_array(pg_temp.rcz_k1()), v)) ->> 'actualizado_en')::timestamptz;
  perform pg_temp.rcz_ok('A2 aceptar 3', pg_temp.rcz_aceptar(ed, c3, v));
  -- Sin líneas, o con una sin total, no se acepta.
  v := (pg_temp.rcz_ok('A2 crear 2', pg_temp.rcz_crear(ed, c2, p)) ->> 'actualizado_en')::timestamptz;
  perform pg_temp.rcz_es('A2 sin líneas', pg_temp.rcz_aceptar(ed, c2, v), '23514', 'lineas', 'Para aceptarla, cada línea necesita su total.');
  v := (pg_temp.rcz_ok('A2 guardar 2', pg_temp.rcz_guardar(ed, c2, jsonb_build_array(pg_temp.rcz_k4(), pg_temp.rcz_k1() || '{"costo": null}'), v))
        ->> 'actualizado_en')::timestamptz;
  perform pg_temp.rcz_es('A2 sin total', pg_temp.rcz_aceptar(ed, c2, v), '23514', 'lineas');
  v := (pg_temp.rcz_ok('A2 guardar 2 bis', pg_temp.rcz_guardar(ed, c2, jsonb_build_array(pg_temp.rcz_k4()), v)) ->> 'actualizado_en')::timestamptz;
  -- Aceptar la segunda anula la primera.
  r := pg_temp.rcz_ok('A2 aceptar 2', pg_temp.rcz_aceptar(ed, c2, v));
  if r ->> 'anulada' is distinct from c1::text or (pg_temp.rcz_fila(c1)).estado <> 'anulada' or (pg_temp.rcz_fila(c2)).estado <> 'aceptada'
     or (pg_temp.rcz_fila(c3)).estado <> 'aceptada' then
    raise exception 'A2: aceptar la segunda anula la primera y no toca la de otro proyecto: %', r;
  end if;
  -- El índice parcial existe: una segunda aceptada directa (como superusuario) choca.
  begin
    update public.repuestos_cotizaciones set estado = 'aceptada' where id = c1;
    raise exception 'A2: dos aceptadas en un proyecto debían chocar en el índice';
  exception when unique_violation then null;
  end;
end $$;
rollback;

-- @test repuestos: aceptada no se edita; anular una aceptada deja el precio del ítem; anular dos veces no (A3)
begin;
do $$
declare
  ed uuid := pg_temp.rcz_persona(pg_temp.rcz_todos()); t jsonb := pg_temp.rcz_terreno(); p uuid := pg_temp.rcz_proyecto(ed); c uuid := gen_random_uuid();
  b uuid := gen_random_uuid(); r jsonb; v timestamptz; i uuid;
begin
  insert into public.repuestos_items (proyecto_id, descripcion) values (p, 'rq') returning id into i;
  v := (pg_temp.rcz_ok('A3 crear', pg_temp.rcz_crear(ed, c, p)) ->> 'actualizado_en')::timestamptz;
  v := (pg_temp.rcz_ok('A3 guardar', pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1(i)), v)) ->> 'actualizado_en')::timestamptz;
  v := (pg_temp.rcz_ok('A3 aceptar', pg_temp.rcz_aceptar(ed, c, v)) ->> 'actualizado_en')::timestamptz;
  perform pg_temp.rcz_es('A3 guardar aceptada', pg_temp.rcz_guardar(ed, c, '[]', v), '23514', 'estado', 'Una cotización aceptada o anulada no se edita.');
  perform pg_temp.rcz_es('A3 aceptar otra vez', pg_temp.rcz_aceptar(ed, c, v), '23514', 'estado');
  perform pg_temp.rcz_es('A3 anular versión vieja', pg_temp.rcz_anular(ed, c, v - interval '1 second'), 'PT409', null);
  r := pg_temp.rcz_ok('A3 anular aceptada', pg_temp.rcz_anular(ed, c, v));
  if r ->> 'estado' <> 'anulada' or (select precio_cliente from public.repuestos_items where id = i) <> 133.00 then
    raise exception 'A3: anular una aceptada la anula y deja el precio del ítem: %', r;
  end if;
  perform pg_temp.rcz_es('A3 anular anulada', pg_temp.rcz_anular(ed, c, (r ->> 'actualizado_en')::timestamptz), '23514', 'estado',
    'Esta cotización ya está anulada.');
  perform pg_temp.rcz_es('A3 guardar anulada', pg_temp.rcz_guardar(ed, c, '[]', (r ->> 'actualizado_en')::timestamptz), '23514', 'estado');
  -- Un borrador se anula; uno sin el snapshot de la versión 1 (escrito antes de las RPC) no se guarda ni se acepta.
  v := (pg_temp.rcz_ok('A3 crear borrador', pg_temp.rcz_crear(ed, b, p)) ->> 'actualizado_en')::timestamptz;
  update public.repuestos_cotizaciones set config_snapshot = '{}' where id = b returning actualizado_en into v;
  perform pg_temp.rcz_es('A3 snapshot viejo guardar', pg_temp.rcz_guardar(ed, b, '[]', v), '23514', 'config_snapshot');
  perform pg_temp.rcz_es('A3 snapshot viejo aceptar', pg_temp.rcz_aceptar(ed, b, v), '23514', 'config_snapshot');
  r := pg_temp.rcz_ok('A3 anular borrador', pg_temp.rcz_anular(ed, b, v));
  if (pg_temp.rcz_fila(b)).estado <> 'anulada' then
    raise exception 'A3: un borrador se anula';
  end if;
end $$;
rollback;

-- @test repuestos: sin INSERT, UPDATE ni DELETE directos en cotizaciones y líneas, ni policies ni privilegios de escritura (F3)
begin;
do $$
declare
  ed uuid := pg_temp.rcz_persona(pg_temp.rcz_todos()); t jsonb := pg_temp.rcz_terreno(); p uuid := pg_temp.rcz_proyecto(ed); c uuid := gen_random_uuid();
  r jsonb; v_tabla text;
begin
  r := pg_temp.rcz_ok('F3 crear', pg_temp.rcz_crear(ed, c, p));
  r := pg_temp.rcz_ok('F3 guardar', pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1()), (r ->> 'actualizado_en')::timestamptz));
  perform pg_temp.rcz_es('F3 insert cotización', pg_temp.rcz_corre(ed, format(
    'insert into public.repuestos_cotizaciones (proyecto_id, moneda, config_snapshot, total, creado_por) values (%L, %L, %L, 1, %L) returning to_jsonb(id)',
    p, 'XTS', '{"version": 1}', ed)), '42501', null);
  perform pg_temp.rcz_es('F3 update total', pg_temp.rcz_corre(ed, format(
    'with x as (update public.repuestos_cotizaciones set total = 1 where id = %L returning 1) select to_jsonb(count(*)) from x', c)), '42501', null);
  perform pg_temp.rcz_es('F3 update snapshot', pg_temp.rcz_corre(ed, format(
    'with x as (update public.repuestos_cotizaciones set config_snapshot = %L where id = %L returning 1) select to_jsonb(count(*)) from x', '{}', c)), '42501', null);
  perform pg_temp.rcz_es('F3 insert línea', pg_temp.rcz_corre(ed, format(
    'insert into public.repuestos_cotizaciones_lineas (cotizacion_id, descripcion, bloque, total) values (%L, %L, %L, 1) returning to_jsonb(id)',
    c, 'x', 'importado')), '42501', null);
  perform pg_temp.rcz_es('F3 update línea', pg_temp.rcz_corre(ed, format(
    'with x as (update public.repuestos_cotizaciones_lineas set total = 1 where cotizacion_id = %L returning 1) select to_jsonb(count(*)) from x', c)),
    '42501', null);
  perform pg_temp.rcz_es('F3 delete línea', pg_temp.rcz_corre(ed, format(
    'with x as (delete from public.repuestos_cotizaciones_lineas where cotizacion_id = %L returning 1) select to_jsonb(count(*)) from x', c)), '42501', null);
  if (pg_temp.rcz_fila(c)).total <> 133.00 then
    raise exception 'F3: una escritura directa cambió la cotización: %', to_jsonb(pg_temp.rcz_fila(c));
  end if;
  foreach v_tabla in array array['repuestos_cotizaciones', 'repuestos_cotizaciones_lineas'] loop
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = v_tabla and cmd <> 'SELECT')
       or has_table_privilege('authenticated', 'public.' || v_tabla, 'INSERT')
       or has_table_privilege('authenticated', 'public.' || v_tabla, 'UPDATE')
       or has_table_privilege('authenticated', 'public.' || v_tabla, 'DELETE')
       or has_column_privilege('authenticated', 'public.' || v_tabla, 'total', 'UPDATE')
       or has_column_privilege('authenticated', 'public.' || v_tabla, 'total', 'INSERT') then
      raise exception 'F3: quedó una policy o un privilegio de escritura sobre %', v_tabla;
    end if;
  end loop;
  if pg_temp.rcz_corre(ed, format('select to_jsonb(count(*)) from public.repuestos_cotizaciones_lineas where cotizacion_id = %L', c)) <> '1'::jsonb then
    raise exception 'F3: con repuestos.cotizar se debía seguir leyendo la línea';
  end if;
end $$;
rollback;

-- @test repuestos: sin repuestos.cotizar o sin repuestos.ver, las cuatro RPC dan 42501; aceptar pide también repuestos.editar (F4)
begin;
do $$
declare
  ed uuid := pg_temp.rcz_persona(pg_temp.rcz_todos()); t jsonb := pg_temp.rcz_terreno(); p uuid := pg_temp.rcz_proyecto(ed); c uuid := gen_random_uuid();
  sin_cotizar uuid := pg_temp.rcz_persona(array['repuestos.ver', 'repuestos.editar', 'repuestos.costos.ver']);
  sin_ver uuid := pg_temp.rcz_persona(array['repuestos.cotizar', 'repuestos.editar']);
  sin_editar uuid := pg_temp.rcz_persona(array['repuestos.ver', 'repuestos.cotizar']);
  r jsonb; v timestamptz; quien uuid;
begin
  r := pg_temp.rcz_ok('F4 crear', pg_temp.rcz_crear(ed, c, p));
  r := pg_temp.rcz_ok('F4 guardar', pg_temp.rcz_guardar(ed, c, jsonb_build_array(pg_temp.rcz_k1()), (r ->> 'actualizado_en')::timestamptz));
  v := (r ->> 'actualizado_en')::timestamptz;
  foreach quien in array array[sin_cotizar, sin_ver] loop
    perform pg_temp.rcz_es('F4 crear', pg_temp.rcz_crear(quien, gen_random_uuid(), p), '42501', null);
    perform pg_temp.rcz_es('F4 guardar', pg_temp.rcz_guardar(quien, c, '[]', v), '42501', null);
    perform pg_temp.rcz_es('F4 aceptar', pg_temp.rcz_aceptar(quien, c, v), '42501', null);
    perform pg_temp.rcz_es('F4 anular', pg_temp.rcz_anular(quien, c, v), '42501', null);
  end loop;
  perform pg_temp.rcz_es('F4 aceptar sin editar', pg_temp.rcz_aceptar(sin_editar, c, v), '42501', null, 'No tienes el permiso «repuestos.editar».');
  -- Sin editar se cotiza: crear y guardar pasan.
  perform pg_temp.rcz_ok('F4 crear sin editar', pg_temp.rcz_crear(sin_editar, gen_random_uuid(), p));
  if (pg_temp.rcz_fila(c)).estado <> 'borrador' or (pg_temp.rcz_fila(c)).actualizado_en <> v then
    raise exception 'F4: una llamada sin permiso cambió la cotización';
  end if;
  -- Los ayudantes no se llaman desde afuera.
  perform pg_temp.rcz_es('F4 ayudante', pg_temp.rcz_corre(ed, format('select public._repuesto_cotizacion_linea(%L, %L, 1, 1, 1, 1)', '{}', 'local')),
    '42501', null);
end $$;
rollback;
