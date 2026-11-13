-- Anular un pago confirmado (paso 6.10-2, C12–C15). No depende de otro archivo (`SOLO=areas/dinero/anular.sql`). Los ayudantes son copia de `gastos.sql`
-- y `margen.sql`. Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   A1. Sin `logistica.pagos.confirmar`, 42501 y el pago sigue vivo; con la clave sin ver el pago, 42501; motivo vacío o de 501, 22023 (hint `motivo`); uno
--       sin confirmar, 23514; uno de proyecto sin `repuestos.costos.ver`, 42501 (el resto del proyecto, en `areas/repuestos/pagos-anular.sql`).
--   A2. Anular un confirmado: queda borrado, una fila `pago.anulado` en `actividad` con el motivo y la venta del margen baja; otra vez, PT409; versión vieja,
--       PT409.
--   A3. Con la fase actual que pide `pagos.confirmado` y un solo confirmado: 23514 y sigue vivo; con dos, se anula uno.
--   A4. Con `pagos.umbral_pct` 50 sobre una final de 100 y dos confirmados de 30: anular uno da 23514.
--   A5. Un anulado no vuelve: `eliminado_en = null` como dueño de la base da 23514; soltar el lead (`lead_id` → nulo) sigue pasando.

create or replace function pg_temp.din_persona(variadic p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  -- La primera cuenta de la base es la dueña (con `SOLO=` no hay otra antes): una de relleno, para que ninguna de la prueba lo sea.
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email) values (gen_random_uuid(), 'din-primera-' || substr(v_id::text, 1, 8) || '@ejemplo.com');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('din_' || substr(v_id::text, 1, 8), 'DIN ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance, origen_id)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso, nullif(split_part(c, ':', 3), '')::uuid);
  end loop;
  return v_id;
end $f$;

-- Dos orígenes con un vehículo cada uno, una categoría, la moneda XTS y dos tipos: XTS → base y base → XTS, los dos en 6,96.
create or replace function pg_temp.din_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; v uuid; v2 uuid; v3 uuid; cat uuid; trib uuid; tc uuid; tc_inv uuid; s text := substr(gen_random_uuid()::text, 1, 8);
  v_base text := (select moneda_base::text from public.ajustes_empresa where id = 1);
begin
  insert into public.origenes (clave, nombre) values ('din_' || s, 'DIN origen ' || s) returning id into o;
  insert into public.origenes (clave, nombre) values ('din2_' || s, 'DIN origen 2 ' || s) returning id into o2;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'DIN vehículo', 'toyota') returning id into v;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'DIN vehículo 3', 'nissan') returning id into v3;
  insert into public.vehiculos (origen_id, titulo, marca) values (o2, 'DIN vehículo 2', 'mazda') returning id into v2;
  insert into public.categorias_gasto (nombre, proposito) values ('DIN flete ' || s, 'flete') returning id into cat;
  insert into public.categorias_gasto (nombre, proposito) values ('DIN tributos ' || s, 'tributos') returning id into trib;
  insert into public.monedas (codigo, nombre, simbolo) values ('XTS', 'Prueba', 'X') on conflict do nothing;
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor) values ('din_' || s, 'DIN', 'XTS', v_base, 6.96) returning id into tc;
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor) values ('din_inv_' || s, 'DIN inverso', v_base, 'XTS', 6.96) returning id into tc_inv;
  return jsonb_build_object('o', o, 'o2', o2, 'v', v, 'v2', v2, 'v3', v3, 'cat', cat, 'trib', trib, 'tc', tc, 'tc_inv', tc_inv, 'base', v_base);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.din_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return v;
end $f$;

create or replace function pg_temp.din_da(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create sequence if not exists pg_temp.din_telefono;

-- Un lead de una persona de relleno.
create or replace function pg_temp.din_lead() returns uuid language plpgsql as $f$
declare l uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('DIN lead', '7219' || lpad(nextval('pg_temp.din_telefono')::text, 4, '0'), pg_temp.din_persona(variadic '{}'::text[]),
          (select id from public.origenes_lead where clave = 'web'), '{}')
  returning id into l;
  return l;
end $f$;

create or replace function pg_temp.din_margen(p_quien uuid, p_vehiculo uuid) returns jsonb language sql as $f$
  select pg_temp.din_corre(p_quien, format('select public.margen_vehiculo(%L)', p_vehiculo));
$f$;

-- Un pago del vehículo en la base, confirmado si se pide: su id.
create or replace function pg_temp.din_pago_de(t jsonb, p_monto numeric, p_confirmar boolean) returns uuid language plpgsql as $f$
declare ed uuid := pg_temp.din_persona('logistica.pagos.editar', 'logistica.pagos.ver', 'logistica.pagos.confirmar'); r jsonb; p uuid;
begin
  r := pg_temp.din_corre(ed, format('select public.pago_registrar(%L, %L, null, ''Anticipo'', %L, %s, null, null, null, null, null)',
                                    gen_random_uuid(), t ->> 'v', t ->> 'base', p_monto));
  if r ? 'error' then raise exception 'pago: %', r; end if;
  p := (r ->> 'id')::uuid;
  if p_confirmar then
    r := pg_temp.din_corre(ed, format('select public.pago_confirmar(%L, %L)', p, (select actualizado_en from public.pagos where id = p)));
    if r ? 'error' then raise exception 'confirmar: %', r; end if;
  end if;
  return p;
end $f$;

create or replace function pg_temp.din_anular(p_quien uuid, p_id uuid, p_motivo text default 'Rebotó el depósito') returns jsonb language sql as $f$
  select pg_temp.din_corre(p_quien, format('select public.pago_anular(%L, %L, %L)', p_id, (select actualizado_en from public.pagos where id = p_id), p_motivo));
$f$;

-- La fase del flujo del origen que pide ese dato de pagos (no bloqueante), con el vehículo en ella.
create or replace function pg_temp.din_fase_con(t jsonb, p_clave text, p_config jsonb default '{}') returns void language plpgsql as $f$
declare f uuid;
begin
  insert into public.fases (flujo_id, nombre, orden) values ((select id from public.flujos where origen_id = (t ->> 'o')::uuid), 'DIN cobro', 90) returning id into f;
  insert into public.fases_requisitos (fase_id, tipo, clave_dato, bloqueante, config) values (f, 'dato', p_clave, false, p_config);
  update public.vehiculos set fase_id = f where id = (t ->> 'v')::uuid;
end $f$;

-- @test dinero: anular pide la clave de confirmar, ver el pago, un motivo y que esté confirmado (A1)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); jefa uuid; p uuid; sin uuid; pr uuid; pp uuid;
begin
  jefa := pg_temp.din_persona('logistica.pagos.confirmar', 'logistica.pagos.ver', 'repuestos.costos.ver');
  p := pg_temp.din_pago_de(t, 100, true);
  perform pg_temp.din_da('A1: sin la clave de confirmar', pg_temp.din_anular(pg_temp.din_persona('logistica.pagos.ver', 'logistica.pagos.editar'), p), '42501');
  if (select eliminado_en from public.pagos where id = p) is not null then raise exception 'A1: sin la clave el pago quedó anulado'; end if;
  perform pg_temp.din_da('A1: con la clave sin ver el pago',
    pg_temp.din_anular(pg_temp.din_persona('logistica.pagos.confirmar', 'logistica.pagos.ver:todos:' || (t ->> 'o2')), p), '42501');
  perform pg_temp.din_da('A1: motivo vacío', pg_temp.din_anular(jefa, p, '   '), '22023', 'motivo');
  perform pg_temp.din_da('A1: motivo de 501', pg_temp.din_anular(jefa, p, repeat('x', 501)), '22023', 'motivo');
  sin := pg_temp.din_pago_de(t, 100, false);
  perform pg_temp.din_da('A1: sin confirmar', pg_temp.din_anular(jefa, sin), '23514', 'id');
  insert into public.repuestos_proyectos (vehiculo_id) values (null) returning id into pr;
  insert into public.pagos (proyecto_repuestos_id, concepto, moneda, monto, monto_base) values (pr, 'DIN proyecto', t ->> 'base', 10, 10) returning id into pp;
  perform pg_temp.din_da('A1: de un proyecto, sin verlo', pg_temp.din_anular(pg_temp.din_persona('logistica.pagos.confirmar'), pp), '42501');
end $$;
rollback;

-- @test dinero: anular un confirmado lo saca de la venta con su constancia, y no se anula dos veces (A2)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); jefa uuid; p uuid; q uuid; r jsonb; v0 timestamptz; m jsonb;
begin
  jefa := pg_temp.din_persona('logistica.pagos.confirmar', 'logistica.pagos.ver', 'logistica.margen.ver');
  p := pg_temp.din_pago_de(t, 100, true);
  q := pg_temp.din_pago_de(t, 40, true);
  r := pg_temp.din_anular(jefa, p);
  if r ? 'error' or (select eliminado_en from public.pagos where id = p) is null or (r ->> 'anulado_en') is null then
    raise exception 'A2: anular un confirmado debía dejarlo borrado y dio %', r;
  end if;
  if (select count(*) from public.actividad where accion = 'pago.anulado' and registro_id = p::text and detalle ->> 'motivo' = 'Rebotó el depósito') <> 1 then
    raise exception 'A2: debía quedar una sola fila pago.anulado con el motivo';
  end if;
  m := pg_temp.din_margen(jefa, (t ->> 'v')::uuid);
  if (m ->> 'venta')::numeric is distinct from 40.00 then raise exception 'A2: la venta debía bajar a 40,00 y dio %', m; end if;
  perform pg_temp.din_da('A2: otra vez', pg_temp.din_anular(jefa, p), 'PT409');
  v0 := (select actualizado_en from public.pagos where id = q) - interval '1 second';
  perform pg_temp.din_da('A2: versión vieja', pg_temp.din_corre(jefa, format('select public.pago_anular(%L, %L, ''x'')', q, v0)), 'PT409');
end $$;
rollback;

-- @test dinero: no se anula el único pago confirmado que pide la fase actual; con dos, sí uno (A3)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); jefa uuid; p uuid; q uuid;
begin
  jefa := pg_temp.din_persona('logistica.pagos.confirmar', 'logistica.pagos.ver');
  p := pg_temp.din_pago_de(t, 100, true);
  perform pg_temp.din_fase_con(t, 'pagos.confirmado');
  perform pg_temp.din_da('A3: el único confirmado', pg_temp.din_anular(jefa, p), '23514', 'id');
  if (select eliminado_en from public.pagos where id = p) is not null then raise exception 'A3: el 23514 debía revertir el borrado'; end if;
  q := pg_temp.din_pago_de(t, 50, true);
  if pg_temp.din_anular(jefa, p) ? 'error' then raise exception 'A3: con dos confirmados debía anularse uno'; end if;
  perform pg_temp.din_da('A3: el que queda', pg_temp.din_anular(jefa, q), '23514', 'id');
end $$;
rollback;

-- @test dinero: no se anula un pago si deja la suma confirmada bajo el umbral que pide la fase (A4)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); jefa uuid; p uuid; f uuid;
begin
  jefa := pg_temp.din_persona('logistica.pagos.confirmar', 'logistica.pagos.ver');
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values ((t ->> 'o')::uuid, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'total', 'tipo', 'input', 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen'))), '{}', '{}',
          jsonb_build_object('total', jsonb_build_object('ver', 'todos', 'editar', 'todos')))
  returning id into f;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, clase, valores, fuentes, tipos_cambio, totales, total_base)
  values ((t ->> 'o')::uuid, pg_temp.din_persona(variadic '{}'::text[]), f, (t ->> 'v')::uuid, 'final', '{"total": 100}', '{"total": "input"}', '{}',
          '{"usd": 100}', 100);
  p := pg_temp.din_pago_de(t, 30, true);
  perform pg_temp.din_pago_de(t, 30, true);
  perform pg_temp.din_fase_con(t, 'pagos.umbral_pct', '{"pct": 50}');
  perform pg_temp.din_da('A4: bajo el umbral', pg_temp.din_anular(jefa, p), '23514', 'id');
end $$;
rollback;

-- @test dinero: un pago anulado no vuelve, y soltar su lead sigue pasando (A5)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); p uuid; v_e text; jefa uuid := pg_temp.din_persona('logistica.pagos.confirmar', 'logistica.pagos.ver');
begin
  -- Sin sesión, trg_lead_visible no mira el lead: lo que se prueba es el sello (como Q5 de `pagos.sql`).
  perform set_config('request.jwt.claim.sub', '', true);
  insert into public.pagos (vehiculo_id, lead_id, concepto, moneda, monto, monto_base) values ((t ->> 'v')::uuid, pg_temp.din_lead(), 'DIN', t ->> 'base', 10, 10)
  returning pagos.id into p;
  if pg_temp.din_corre(jefa, format('select public.pago_confirmar(%L, %L)', p, (select actualizado_en from public.pagos where id = p))) ? 'error' then
    raise exception 'A5: no se pudo confirmar';
  end if;
  if pg_temp.din_anular(jefa, p) ? 'error' then raise exception 'A5: no se pudo anular'; end if;
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    update public.pagos set eliminado_en = null where id = p;
    raise exception 'A5: un anulado volvió';
  exception when check_violation then
    get stacked diagnostics v_e = message_text;
    if v_e <> 'Un pago anulado no vuelve.' then raise exception 'A5: debía decir «Un pago anulado no vuelve.» y dijo %', v_e; end if;
  end;
  begin
    update public.pagos set eliminado_en = now() + interval '1 day' where id = p;
    raise exception 'A5: un anulado cambió su fecha de anulación';
  exception when check_violation then null;
  end;
  update public.pagos set lead_id = null where id = p;
  if (select lead_id from public.pagos where id = p) is not null then raise exception 'A5: el anulado no soltó su lead'; end if;
end $$;
rollback;
