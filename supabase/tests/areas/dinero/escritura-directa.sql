-- Gastos y pagos sin escritura directa (paso 6.10-1, C14). No depende de otro archivo (`SOLO=areas/dinero/escritura-directa.sql`). Los ayudantes son
-- copia de `gastos.sql`. Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   E1. Como authenticated con todas las claves, insert, update y delete directos en `gastos` y `pagos` dan 42501; sin INSERT, UPDATE ni DELETE de tabla ni
--       de columna para authenticated; ninguna policy de INSERT, UPDATE o DELETE en las dos tablas; el select sigue.

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

-- @test dinero: gastos y pagos no se escriben directo, sólo por sus RPC (E1)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); p uuid; g uuid; pg uuid; r jsonb; tabla text; v_sql text;
begin
  p := pg_temp.din_persona('logistica.gastos.ver', 'logistica.gastos.editar', 'logistica.pagos.ver', 'logistica.pagos.editar', 'logistica.pagos.confirmar');
  g := (pg_temp.din_corre(p, format('select public.gasto_registrar(%L, %L, null, %L, %L, 10, null, null, null, null, null)',
                                    gen_random_uuid(), t ->> 'v', t ->> 'cat', t ->> 'base'))) ->> 'id';
  pg := (pg_temp.din_corre(p, format('select public.pago_registrar(%L, %L, null, %L, %L, 10, null, null, null, null, null)',
                                     gen_random_uuid(), t ->> 'v', 'Seña', t ->> 'base'))) ->> 'id';
  if g is null or pg is null then raise exception 'E1: las RPC debían registrar'; end if;
  foreach v_sql in array array[
    format('insert into public.gastos (vehiculo_id, categoria_id, moneda, monto, monto_base, creado_por) values (%L, %L, %L, 1, 1, %L) returning to_jsonb(gastos)', t ->> 'v', t ->> 'cat', t ->> 'base', p),
    format('update public.gastos set monto_base = 1 where id = %L returning to_jsonb(gastos)', g),
    format('delete from public.gastos where id = %L returning to_jsonb(gastos)', g),
    format('insert into public.pagos (vehiculo_id, concepto, moneda, monto, monto_base) values (%L, %L, %L, 1, 1) returning to_jsonb(pagos)', t ->> 'v', 'X', t ->> 'base'),
    format('update public.pagos set monto_base = 1 where id = %L returning to_jsonb(pagos)', pg),
    format('update public.pagos set confirmado = true where id = %L returning to_jsonb(pagos)', pg),
    format('delete from public.pagos where id = %L returning to_jsonb(pagos)', pg)]
  loop
    perform pg_temp.din_da('E1: ' || left(v_sql, 40), pg_temp.din_corre(p, v_sql), '42501');
  end loop;
  foreach tabla in array array['public.gastos', 'public.pagos'] loop
    if has_table_privilege('authenticated', tabla, 'insert') or has_table_privilege('authenticated', tabla, 'update')
       or has_table_privilege('authenticated', tabla, 'delete') or not has_table_privilege('authenticated', tabla, 'select') then
      raise exception 'E1: authenticated debía quedar sólo con select en %', tabla;
    end if;
  end loop;
  if exists (select 1 from information_schema.column_privileges c
              where c.grantee = 'authenticated' and c.table_schema = 'public' and c.table_name in ('gastos', 'pagos')
                and c.privilege_type in ('INSERT', 'UPDATE')) then
    raise exception 'E1: quedó un grant de columna de escritura para authenticated';
  end if;
  if exists (select 1 from pg_policies x where x.schemaname = 'public' and x.tablename in ('gastos', 'pagos') and x.cmd <> 'SELECT') then
    raise exception 'E1: quedó una policy de escritura en gastos o pagos';
  end if;
  if (pg_temp.din_corre(p, format('select to_jsonb(count(*)) from public.pagos where id = %L', pg)))::int <> 1 then
    raise exception 'E1: quien ve los pagos debía seguir leyéndolos';
  end if;
end $$;
reset role;
rollback;
