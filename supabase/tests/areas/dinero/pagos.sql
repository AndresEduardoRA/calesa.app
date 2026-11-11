-- Pagos en la base (paso 6.10-1, C9–C12). No depende de otro archivo (`SOLO=areas/dinero/pagos.sql`). Los ayudantes son copia de `gastos.sql`. Cada
-- bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   Q1. `pago_registrar` en XTS a 6,96 guarda 696,00 sin confirmar; monto 0, 22023; sin `logistica.pagos.editar` del origen, 42501; un lead que no se ve,
--       42501 con hint `lead_id`. Corregir no recibe el monto en base ni el sello; eliminar es suave.

create sequence if not exists pg_temp.din_telefono;

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

-- Un lead de una persona de relleno.
create or replace function pg_temp.din_lead() returns uuid language plpgsql as $f$
declare l uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('DIN lead', '7218' || lpad(nextval('pg_temp.din_telefono')::text, 4, '0'), pg_temp.din_persona(variadic '{}'::text[]),
          (select id from public.origenes_lead where clave = 'web'), '{}')
  returning id into l;
  return l;
end $f$;

create or replace function pg_temp.din_pago(p_quien uuid, p_id uuid, p_vehiculo uuid, p_moneda text, p_monto numeric, p_tc uuid, p_lead uuid default null)
returns jsonb language sql as $f$
  select pg_temp.din_corre(p_quien, format('select public.pago_registrar(%L, %L, %L, %L, %L, %s, %L, null, null, null, null)',
                                           p_id, p_vehiculo, p_lead, 'Anticipo', p_moneda, p_monto, p_tc));
$f$;

create or replace function pg_temp.din_pago_guardar(p_quien uuid, p_id uuid, p_cambios jsonb) returns jsonb language sql as $f$
  select pg_temp.din_corre(p_quien, format('select public.pago_guardar(%L, %L, %L)', p_id, (select actualizado_en from public.pagos where id = p_id), p_cambios));
$f$;

create or replace function pg_temp.din_pago_eliminar(p_quien uuid, p_id uuid) returns jsonb language sql as $f$
  select pg_temp.din_corre(p_quien, format('select public.pago_eliminar(%L, %L)', p_id, (select actualizado_en from public.pagos where id = p_id)));
$f$;

-- @test dinero: registrar un pago calcula el monto en base, nace sin confirmar y pide la clave y ver el lead (Q1)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); p uuid; r jsonb; pg public.pagos; v uuid := (t ->> 'v')::uuid; tc uuid := (t ->> 'tc')::uuid;
begin
  p := pg_temp.din_persona('logistica.pagos.editar', 'logistica.pagos.ver');
  r := pg_temp.din_pago(p, gen_random_uuid(), v, 'XTS', 100, tc);
  select * into pg from public.pagos where id = (r ->> 'id')::uuid;
  if pg.monto_base is distinct from 696.00 or pg.tipo_cambio_id is distinct from tc or pg.confirmado or pg.confirmado_por is not null
     or pg.creado_por is distinct from p or (r ->> 'ya_existia')::boolean then
    raise exception 'Q1: 100 XTS a 6,96 debía guardar 696,00 sin confirmar; dio % / %', r, to_jsonb(pg);
  end if;
  perform pg_temp.din_da('Q1: monto 0', pg_temp.din_pago(p, gen_random_uuid(), v, 'XTS', 0, tc), '22023', 'monto');
  perform pg_temp.din_da('Q1: tres decimales', pg_temp.din_pago(p, gen_random_uuid(), v, 'XTS', 1.005, tc), '22023', 'monto');
  perform pg_temp.din_da('Q1: sin la clave del origen',
    pg_temp.din_pago(pg_temp.din_persona('logistica.pagos.editar:todos:' || (t ->> 'o2')), gen_random_uuid(), v, 'XTS', 100, tc), '42501');
  perform pg_temp.din_da('Q1: un lead que no se ve', pg_temp.din_pago(p, gen_random_uuid(), v, 'XTS', 100, tc, pg_temp.din_lead()), '42501', 'lead_id');
  -- Corregir: lista cerrada, con la tasa guardada.
  perform pg_temp.din_da('Q1: monto_base', pg_temp.din_pago_guardar(p, pg.id, '{"monto_base": 1}'), '22023', 'monto_base');
  perform pg_temp.din_da('Q1: confirmado', pg_temp.din_pago_guardar(p, pg.id, '{"confirmado": true}'), '22023', 'confirmado');
  perform pg_temp.din_da('Q1: confirmado_por', pg_temp.din_pago_guardar(p, pg.id, jsonb_build_object('confirmado_por', p)), '22023', 'confirmado_por');
  update public.tipos_cambio set valor = 7 where id = tc;
  r := pg_temp.din_pago_guardar(p, pg.id, '{"monto": 50, "concepto": "  Segundo   anticipo "}');
  if (r ->> 'monto_base')::numeric is distinct from 348.00 or (select concepto from public.pagos where id = pg.id) <> 'Segundo anticipo' then
    raise exception 'Q1: corregir el monto debía usar la tasa guardada (348,00) y limpiar el concepto; dio %', r;
  end if;
  r := pg_temp.din_pago_eliminar(p, pg.id);
  if r ->> 'error' is not null or (select eliminado_en from public.pagos where id = pg.id) is null then raise exception 'Q1: eliminar debía borrar suave; dio %', r; end if;
  perform pg_temp.din_da('Q1: eliminar dos veces', pg_temp.din_pago_eliminar(p, pg.id), 'PT409');
end $$;
reset role;
rollback;
