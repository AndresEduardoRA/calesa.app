-- Anular un pago confirmado de un proyecto de repuestos con `pago_anular`: las mismas guardas que el de un vehículo, con la de fase del proyecto. No depende
-- de otro archivo (`SOLO=areas/repuestos/pagos-anular.sql`); cada bloque abre su transacción y la revierte.
--
--   N1. Sin `logistica.pagos.confirmar`, o con ella sin `repuestos.costos.ver`, 42501 y el pago sigue vivo; motivo vacío, 22023 (hint `motivo`); uno sin
--       confirmar, 23514 (hint `id`).
--   N2. Anular un confirmado: queda borrado con una fila `pago.anulado` en `actividad` con el motivo; otra vez, PT409; versión vieja, PT409.
--   N3. Un ítem vivo del proyecto en una fase que pide `proyecto.pago_cliente`: anular el último pago vivo da 23514 (hint `id`) y sigue vivo; con otro vivo
--       (aunque sin confirmar) se anula. No cuentan el ítem eliminado, el de otro proyecto ni el pago de otro proyecto.
--   N4. Dos que anulan a la vez los dos últimos pagos de un proyecto se ordenan: `pago_anular` toma los vivos del proyecto `for update` en orden de id (sin
--       carrera en `scripts/carreras/`, se fija la cláusula).

create or replace function pg_temp.pan_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-pan@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

create or replace function pg_temp.pan_persona(variadic p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.pan_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('pan_' || substr(v_id::text, 1, 8), 'pan ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.pan_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.pan_da(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.pan_ok(p_que text, p_r jsonb) returns jsonb language plpgsql as $f$
begin
  if p_r ? 'error' then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return p_r;
end $f$;

-- Quien registra y confirma los pagos de proyecto de la prueba.
create or replace function pg_temp.pan_editora() returns uuid language sql as $f$
  select pg_temp.pan_persona('repuestos.ver', 'repuestos.editar', 'repuestos.costos.ver', 'repuestos.costos.editar', 'logistica.pagos.confirmar');
$f$;

create or replace function pg_temp.pan_proyecto(p_quien uuid) returns uuid language plpgsql as $f$
declare i uuid := gen_random_uuid();
begin
  perform pg_temp.pan_ok('proyecto', pg_temp.pan_corre(p_quien, format('select public.repuesto_proyecto_crear(%L, %L)', i, '{"vehiculo_etiqueta": "pan"}')));
  return i;
end $f$;

-- Un pago del proyecto en la moneda base, confirmado si se pide: su id.
create or replace function pg_temp.pan_pago(p_quien uuid, p_proyecto uuid, p_monto numeric, p_confirmar boolean) returns uuid language plpgsql as $f$
declare p uuid := gen_random_uuid();
begin
  perform pg_temp.pan_ok('registrar', pg_temp.pan_corre(p_quien, format(
    'select public.pago_registrar_proyecto(%L::uuid, %L::uuid, ''Anticipo'', %L, %s, null, null, null, null, null)',
    p, p_proyecto, (select moneda_base::text from public.ajustes_empresa where id = 1), p_monto)));
  if p_confirmar then
    perform pg_temp.pan_ok('confirmar', pg_temp.pan_corre(p_quien, format('select public.pago_confirmar(%L, %L)', p,
      (select actualizado_en from public.pagos where id = p))));
  end if;
  return p;
end $f$;

create or replace function pg_temp.pan_anular(p_quien uuid, p_id uuid, p_motivo text default 'Rebotó el depósito') returns jsonb language sql as $f$
  select pg_temp.pan_corre(p_quien, format('select public.pago_anular(%L, %L, %L)', p_id, (select actualizado_en from public.pagos where id = p_id), p_motivo));
$f$;

-- Una fase del flujo de repuestos que pide el pago del cliente (no bloqueante) y un ítem del proyecto en ella: su id.
create or replace function pg_temp.pan_item_en_fase_cobrada(p_proyecto uuid) returns uuid language plpgsql as $f$
declare f uuid; i uuid;
begin
  insert into public.fases (flujo_id, nombre, orden) values ((select id from public.flujos where ambito = 'repuestos'), 'pan cobrado ' || substr(gen_random_uuid()::text, 1, 6), 1100)
  returning id into f;
  insert into public.fases_requisitos (fase_id, tipo, clave_dato, bloqueante) values (f, 'dato', 'proyecto.pago_cliente', false);
  insert into public.repuestos_items (proyecto_id, descripcion) values (p_proyecto, 'pan ítem') returning id into i;
  update public.repuestos_items set fase_id = f, fase_desde = now() where id = i;
  return i;
end $f$;

-- @test repuestos: anular un pago de proyecto pide la clave de confirmar, ver los costos, un motivo y que esté confirmado (N1)
begin;
do $$
declare ed uuid := pg_temp.pan_editora(); pr uuid := pg_temp.pan_proyecto(ed); p uuid; sin uuid;
begin
  p := pg_temp.pan_pago(ed, pr, 100, true);
  perform pg_temp.pan_da('N1: sin la clave de confirmar',
    pg_temp.pan_anular(pg_temp.pan_persona('repuestos.ver', 'repuestos.costos.ver', 'repuestos.costos.editar'), p), '42501');
  perform pg_temp.pan_da('N1: con la clave sin ver los costos', pg_temp.pan_anular(pg_temp.pan_persona('logistica.pagos.confirmar', 'repuestos.ver'), p), '42501');
  if (select eliminado_en from public.pagos where id = p) is not null then raise exception 'N1: un rechazo dejó el pago anulado'; end if;
  perform pg_temp.pan_da('N1: motivo vacío', pg_temp.pan_anular(ed, p, '   '), '22023', 'motivo');
  sin := pg_temp.pan_pago(ed, pr, 50, false);
  perform pg_temp.pan_da('N1: sin confirmar', pg_temp.pan_anular(ed, sin), '23514', 'id');
end $$;
rollback;

-- @test repuestos: anular un pago confirmado de proyecto lo borra con su constancia, y no se anula dos veces (N2)
begin;
do $$
declare
  ed uuid := pg_temp.pan_editora(); pr uuid := pg_temp.pan_proyecto(ed); p uuid; q uuid; r jsonb;
  jefa uuid := pg_temp.pan_persona('logistica.pagos.confirmar', 'repuestos.costos.ver');
begin
  p := pg_temp.pan_pago(ed, pr, 100, true);
  q := pg_temp.pan_pago(ed, pr, 40, true);
  r := pg_temp.pan_anular(jefa, p);
  if r ? 'error' or (select eliminado_en from public.pagos where id = p) is null or (r ->> 'anulado_en') is null then
    raise exception 'N2: anular un confirmado de proyecto debía dejarlo borrado y dio %', r;
  end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) <> array['actualizado_en', 'anulado_en', 'id'] then
    raise exception 'N2: la respuesta no es la esperada: %', r;
  end if;
  if (select count(*) from public.actividad where accion = 'pago.anulado' and registro_id = p::text and detalle ->> 'motivo' = 'Rebotó el depósito') <> 1 then
    raise exception 'N2: debía quedar una sola fila pago.anulado con el motivo';
  end if;
  perform pg_temp.pan_da('N2: otra vez', pg_temp.pan_anular(jefa, p), 'PT409');
  perform pg_temp.pan_da('N2: versión vieja', pg_temp.pan_corre(jefa, format('select public.pago_anular(%L, %L, ''x'')', q,
    (select actualizado_en from public.pagos where id = q) - interval '1 second')), 'PT409');
  if (select eliminado_en from public.pagos where id = q) is not null then raise exception 'N2: la versión vieja anuló el pago'; end if;
end $$;
rollback;

-- @test repuestos: no se anula el último pago vivo de un proyecto con un ítem en una fase que pide el pago del cliente (N3)
begin;
do $$
declare
  ed uuid := pg_temp.pan_editora(); pr uuid := pg_temp.pan_proyecto(ed); otro uuid := pg_temp.pan_proyecto(ed); p uuid; q uuid; i uuid;
begin
  p := pg_temp.pan_pago(ed, pr, 100, true);
  i := pg_temp.pan_item_en_fase_cobrada(pr);
  perform pg_temp.pan_pago(ed, otro, 70, true);
  perform pg_temp.pan_da('N3: el último pago vivo', pg_temp.pan_anular(ed, p), '23514', 'id');
  if (select eliminado_en from public.pagos where id = p) is not null then raise exception 'N3: el 23514 debía revertir el borrado'; end if;
  q := pg_temp.pan_pago(ed, pr, 20, false);
  perform pg_temp.pan_ok('N3: con otro vivo sin confirmar', pg_temp.pan_anular(ed, p));
  -- El ítem eliminado ya no pide nada; el de otro proyecto nunca pidió.
  p := pg_temp.pan_pago(ed, pr, 30, true);
  perform pg_temp.pan_ok('N3: eliminar el sin confirmar', pg_temp.pan_corre(ed, format('select public.pago_eliminar(%L, %L)', q,
    (select actualizado_en from public.pagos where id = q))));
  update public.repuestos_items set eliminado_en = now() where id = i;
  perform pg_temp.pan_item_en_fase_cobrada(otro);
  perform pg_temp.pan_ok('N3: sin ítems vivos que lo pidan', pg_temp.pan_anular(ed, p));
end $$;
rollback;

-- @test repuestos: anular un pago de proyecto toma los pagos vivos del proyecto en orden de id antes de mirar la fase (N4)
begin;
do $$
declare src text := pg_get_functiondef('public.pago_anular(uuid,timestamp with time zone,text)'::regprocedure);
begin
  if src !~ 'x\.proyecto_repuestos_id = o\.proyecto_repuestos_id and x\.eliminado_en is null order by x\.id for update' then
    raise exception 'N4: pago_anular ya no toma los pagos vivos del proyecto en orden de id';
  end if;
end $$;
rollback;
