-- Eliminar un pago sin confirmar de un proyecto de repuestos con `pago_eliminar`: la guarda de fase del proyecto, como al anular. No depende de otro archivo
-- (`SOLO=areas/repuestos/pagos-eliminar.sql`); cada bloque abre su transacción y la revierte.
--
--   E1. Un ítem vivo del proyecto en una fase que pide `proyecto.pago_cliente`: eliminar el último pago vivo da 23514 (hint `id`, con el nombre de la fase)
--       y sigue vivo; con otro vivo (aunque confirmado) se elimina. No cuentan el ítem eliminado, el de otro proyecto ni el pago de otro proyecto.
--   E2. Sin `repuestos.costos.editar`, 42501 antes de mirar la fase, y el pago sigue vivo.
--   E3. Dos que eliminan (o anulan) a la vez los dos últimos pagos de un proyecto se ordenan: `pago_eliminar` toma los vivos del proyecto `for update` en
--       orden de id antes de tomar el suyo (sin carrera en `scripts/carreras/`, se fija la cláusula).

create or replace function pg_temp.pel_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-pel@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

create or replace function pg_temp.pel_persona(variadic p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.pel_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('pel_' || substr(v_id::text, 1, 8), 'pel ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.pel_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

create or replace function pg_temp.pel_da(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.pel_ok(p_que text, p_r jsonb) returns jsonb language plpgsql as $f$
begin
  if p_r ? 'error' then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return p_r;
end $f$;

-- Quien registra, confirma y elimina los pagos de proyecto de la prueba.
create or replace function pg_temp.pel_editora() returns uuid language sql as $f$
  select pg_temp.pel_persona('repuestos.ver', 'repuestos.editar', 'repuestos.costos.ver', 'repuestos.costos.editar', 'logistica.pagos.confirmar');
$f$;

create or replace function pg_temp.pel_proyecto(p_quien uuid) returns uuid language plpgsql as $f$
declare i uuid := gen_random_uuid();
begin
  perform pg_temp.pel_ok('proyecto', pg_temp.pel_corre(p_quien, format('select public.repuesto_proyecto_crear(%L, %L)', i, '{"vehiculo_etiqueta": "pel"}')));
  return i;
end $f$;

-- Un pago del proyecto en la moneda base, confirmado si se pide: su id.
create or replace function pg_temp.pel_pago(p_quien uuid, p_proyecto uuid, p_monto numeric, p_confirmar boolean) returns uuid language plpgsql as $f$
declare p uuid := gen_random_uuid();
begin
  perform pg_temp.pel_ok('registrar', pg_temp.pel_corre(p_quien, format(
    'select public.pago_registrar_proyecto(%L::uuid, %L::uuid, ''Anticipo'', %L, %s, null, null, null, null, null)',
    p, p_proyecto, (select moneda_base::text from public.ajustes_empresa where id = 1), p_monto)));
  if p_confirmar then
    perform pg_temp.pel_ok('confirmar', pg_temp.pel_corre(p_quien, format('select public.pago_confirmar(%L, %L)', p,
      (select actualizado_en from public.pagos where id = p))));
  end if;
  return p;
end $f$;

create or replace function pg_temp.pel_eliminar(p_quien uuid, p_id uuid) returns jsonb language sql as $f$
  select pg_temp.pel_corre(p_quien, format('select public.pago_eliminar(%L, %L)', p_id, (select actualizado_en from public.pagos where id = p_id)));
$f$;

-- Una fase del flujo de repuestos que pide el pago del cliente (no bloqueante), con `p_nombre`, y un ítem del proyecto en ella: su id.
create or replace function pg_temp.pel_item_en_fase_cobrada(p_proyecto uuid, p_nombre text default null) returns uuid language plpgsql as $f$
declare f uuid; i uuid;
begin
  insert into public.fases (flujo_id, nombre, orden)
  values ((select id from public.flujos where ambito = 'repuestos'), coalesce(p_nombre, 'pel cobrado ' || substr(gen_random_uuid()::text, 1, 6)), 1100)
  returning id into f;
  insert into public.fases_requisitos (fase_id, tipo, clave_dato, bloqueante) values (f, 'dato', 'proyecto.pago_cliente', false);
  insert into public.repuestos_items (proyecto_id, descripcion) values (p_proyecto, 'pel ítem') returning id into i;
  update public.repuestos_items set fase_id = f, fase_desde = now() where id = i;
  return i;
end $f$;

-- @test repuestos: no se elimina el último pago vivo de un proyecto con un ítem en una fase que pide el pago del cliente (E1)
begin;
do $$
declare
  ed uuid := pg_temp.pel_editora(); pr uuid := pg_temp.pel_proyecto(ed); otro uuid := pg_temp.pel_proyecto(ed); p uuid; q uuid; i uuid; r jsonb;
begin
  p := pg_temp.pel_pago(ed, pr, 100, false);
  i := pg_temp.pel_item_en_fase_cobrada(pr, 'pel cobrada');
  perform pg_temp.pel_pago(ed, otro, 70, false);
  r := pg_temp.pel_eliminar(ed, p);
  perform pg_temp.pel_da('E1: el último pago vivo', r, '23514', 'id');
  if r ->> 'mensaje' not like '%«pel cobrada»%' then raise exception 'E1: el mensaje debía nombrar la fase: %', r; end if;
  if (select eliminado_en from public.pagos where id = p) is not null then raise exception 'E1: el 23514 debía revertir el borrado'; end if;
  -- Con otro vivo, aunque confirmado, se elimina.
  q := pg_temp.pel_pago(ed, pr, 20, true);
  perform pg_temp.pel_ok('E1: con otro vivo confirmado', pg_temp.pel_eliminar(ed, p));
  -- El ítem eliminado ya no pide nada; el de otro proyecto nunca pidió.
  p := pg_temp.pel_pago(ed, pr, 30, false);
  perform pg_temp.pel_ok('E1: anular el confirmado con otro vivo', pg_temp.pel_corre(ed, format('select public.pago_anular(%L, %L, ''Rebotó'')', q,
    (select actualizado_en from public.pagos where id = q))));
  perform pg_temp.pel_da('E1: otra vez el último', pg_temp.pel_eliminar(ed, p), '23514', 'id');
  update public.repuestos_items set eliminado_en = now() where id = i;
  perform pg_temp.pel_item_en_fase_cobrada(otro);
  perform pg_temp.pel_ok('E1: sin ítems vivos que lo pidan', pg_temp.pel_eliminar(ed, p));
end $$;
rollback;

-- @test repuestos: eliminar un pago de proyecto sin repuestos.costos.editar da 42501 antes de mirar la fase (E2)
begin;
do $$
declare ed uuid := pg_temp.pel_editora(); pr uuid := pg_temp.pel_proyecto(ed); p uuid;
begin
  p := pg_temp.pel_pago(ed, pr, 100, false);
  perform pg_temp.pel_item_en_fase_cobrada(pr);
  perform pg_temp.pel_da('E2: sin la clave de editar', pg_temp.pel_eliminar(pg_temp.pel_persona('repuestos.ver', 'repuestos.costos.ver'), p), '42501');
  if (select eliminado_en from public.pagos where id = p) is not null then raise exception 'E2: el rechazo dejó el pago eliminado'; end if;
end $$;
rollback;

-- @test repuestos: eliminar un pago de proyecto toma los pagos vivos del proyecto en orden de id antes del suyo (E3)
begin;
do $$
declare src text := pg_get_functiondef('public.pago_eliminar(uuid,timestamp with time zone)'::regprocedure);
begin
  if src !~ 'x\.proyecto_repuestos_id = o\.proyecto_repuestos_id and x\.eliminado_en is null order by x\.id for update' then
    raise exception 'E3: pago_eliminar ya no toma los pagos vivos del proyecto en orden de id';
  end if;
  if strpos(src, 'order by x.id for update') > strpos(src, 'public._pago_tomar(p_id)') then
    raise exception 'E3: pago_eliminar debe tomar los pagos del proyecto antes que el suyo (_pago_tomar)';
  end if;
end $$;
rollback;
