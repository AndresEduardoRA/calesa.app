-- Los pagos del cliente de un proyecto de repuestos: `pago_registrar_proyecto` (paso 8.13-5, C1–C5). No depende de otro archivo
-- (`SOLO=areas/repuestos/pagos.sql`); cada bloque abre su transacción y la revierte.
--
--   P1. Permisos: sin `repuestos.costos.editar`, sin `repuestos.ver` o sólo con `logistica.pagos.editar` → 42501; `anon` no ejecuta.
--   P2. Registrar: el monto en base lo calcula la base (moneda base y XTS a 6,96); nace sin confirmar, con quien lo creó y sin vehículo.
--   P3. Validación con su hint (NaN y tres decimales incluidos).
--   P4. Proyecto cerrado (23514) o eliminado (PT409); el reintento de un id ya guardado pasa aunque el proyecto se haya cerrado.
--   P5. Idempotencia: el mismo id no pisa; el id de un pago de otro proyecto o de un vehículo → 23505.
--   P6. `proyecto.pago_cliente` se cumple con un pago vivo del proyecto y vuelve a no cumplirse al eliminarlo (sólo de ese proyecto).
--   P7. Corregir, confirmar y leer sirven al proyecto; anular no (8-13d); eliminar el proyecto con un pago vivo → 23514 `en_uso`.

create or replace function pg_temp.rp_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-rp@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio: cada concesión es `clave` o `clave@origen`.
create or replace function pg_temp.rp_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.rp_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('rp_' || substr(v_id::text, 1, 8), 'rp ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated, o anon con `p_rol`): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.rpg_corre(p_quien uuid, p_sql text, p_rol text default 'authenticated') returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_quien::text, ''), true);
  perform set_config('request.jwt.claim.role', p_rol, true);
  execute format('set local role %I', p_rol);
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

create or replace function pg_temp.rp_es(p_que text, p_r jsonb, p_estado text, p_hint text, p_mensaje text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint
     or (p_mensaje is not null and p_r ->> 'mensaje' is distinct from p_mensaje) then
    raise exception '%: debía dar % (hint %) «%» y dio %', p_que, p_estado, p_hint, coalesce(p_mensaje, '…'), p_r;
  end if;
end $f$;

create or replace function pg_temp.rp_ok(p_que text, p_r jsonb) returns jsonb language plpgsql as $f$
begin
  if p_r ? 'error' then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return p_r;
end $f$;

create or replace function pg_temp.rp_proyecto(p_quien uuid) returns uuid language plpgsql as $f$
declare i uuid := gen_random_uuid();
begin
  perform pg_temp.rp_ok('proyecto', pg_temp.rpg_corre(p_quien, format('select public.repuesto_proyecto_crear(%L, %L)', i, '{"vehiculo_etiqueta": "rp"}')));
  return i;
end $f$;

-- La moneda XTS y su tipo de cambio por defecto XTS → base a 6,96.
create or replace function pg_temp.rpg_terreno() returns jsonb language plpgsql as $f$
declare s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8); v_base text; tc uuid;
begin
  select moneda_base::text into v_base from public.ajustes_empresa where id = 1;
  insert into public.monedas (codigo, nombre, simbolo) values ('XTS', 'Prueba', 'X') on conflict (codigo) do update set activa = true;
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor, es_default) values ('rpg_' || s, 'RPG', 'XTS', v_base, 6.96, true)
  returning id into tc;
  return jsonb_build_object('base', v_base, 'tc', tc);
end $f$;

-- Registrar un pago de proyecto como `p_quien`: concepto, moneda y monto (el resto nulo salvo `p_ruta`).
create or replace function pg_temp.rpg_registrar(p_quien uuid, p_id uuid, p_proyecto uuid, p_concepto text, p_moneda text, p_monto numeric,
  p_tc uuid default null, p_ruta text default null, p_metodo text default null) returns jsonb language sql as $f$
  select pg_temp.rpg_corre(p_quien, format(
    'select public.pago_registrar_proyecto(%L::uuid, %L::uuid, %L, %L, %L::numeric, %L::uuid, %L, null, %L, null)',
    p_id, p_proyecto, p_concepto, p_moneda, p_monto, p_tc, p_metodo, p_ruta));
$f$;

create or replace function pg_temp.rpg_fila(p_id uuid) returns public.pagos language sql as $f$
  select * from public.pagos where id = p_id;
$f$;

create or replace function pg_temp.rpg_todos() returns text[] language sql as $f$
  select array['repuestos.ver', 'repuestos.editar', 'repuestos.costos.ver', 'repuestos.costos.editar'];
$f$;

-- @test repuestos: registrar un pago de proyecto pide repuestos.costos.editar y repuestos.ver; anon no lo ejecuta (P1)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(pg_temp.rpg_todos()); t jsonb := pg_temp.rpg_terreno(); p uuid := pg_temp.rp_proyecto(ed);
  sin_editar uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.costos.ver']);
  sin_ver uuid := pg_temp.rp_persona(array['repuestos.costos.ver', 'repuestos.costos.editar']);
  logistica uuid := pg_temp.rp_persona(array['logistica.ver', 'logistica.pagos.editar', 'logistica.pagos.ver']);
  b text := t ->> 'base';
begin
  perform pg_temp.rp_es('P1 sin costos.editar', pg_temp.rpg_registrar(sin_editar, gen_random_uuid(), p, 'Anticipo', b, 10), '42501', null);
  perform pg_temp.rp_es('P1 sin repuestos.ver', pg_temp.rpg_registrar(sin_ver, gen_random_uuid(), p, 'Anticipo', b, 10), '42501', null);
  perform pg_temp.rp_es('P1 sólo logística', pg_temp.rpg_registrar(logistica, gen_random_uuid(), p, 'Anticipo', b, 10), '42501', null);
  perform pg_temp.rp_es('P1 anon', pg_temp.rpg_corre(null, format(
    'select public.pago_registrar_proyecto(%L::uuid, %L::uuid, %L, %L, 10, null, null, null, null, null)', gen_random_uuid(), p, 'Anticipo', b), 'anon'),
    '42501', null);
  if has_function_privilege('anon', 'public.pago_registrar_proyecto(uuid,uuid,text,text,numeric,uuid,text,date,text,text)', 'execute') then
    raise exception 'P1: anon todavía ejecuta pago_registrar_proyecto';
  end if;
  if exists (select 1 from public.pagos where proyecto_repuestos_id = p) then raise exception 'P1: un rechazo dejó un pago'; end if;
  if (select aplicado_en from public.permisos where clave = 'repuestos.costos.editar') !~ 'pago_registrar_proyecto' then
    raise exception 'P1: el aplicado_en de repuestos.costos.editar no nombra pago_registrar_proyecto';
  end if;
end $$;
rollback;

-- @test repuestos: el monto en base lo calcula la base; el pago nace sin confirmar, con quien lo creó y sin vehículo (P2)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(pg_temp.rpg_todos()); t jsonb := pg_temp.rpg_terreno(); p uuid := pg_temp.rp_proyecto(ed);
  a uuid := gen_random_uuid(); x uuid := gen_random_uuid(); r jsonb; f public.pagos;
begin
  r := pg_temp.rp_ok('P2 en base', pg_temp.rpg_registrar(ed, a, p, '  Anticipo   del  cliente ', t ->> 'base', 150.5, null, null, ' Transferencia '));
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) <> array['actualizado_en', 'id', 'monto_base', 'tipo_cambio_aplicado', 'ya_existia']
     or (r ->> 'ya_existia')::boolean or (r ->> 'monto_base')::numeric <> 150.50 then
    raise exception 'P2: la respuesta en base no es la esperada: %', r;
  end if;
  f := pg_temp.rpg_fila(a);
  if f.proyecto_repuestos_id <> p or f.vehiculo_id is not null or f.lead_id is not null or f.confirmado or f.creado_por <> ed
     or f.concepto <> 'Anticipo del cliente' or f.metodo <> 'Transferencia' or f.monto_base <> 150.50 or f.fecha <> current_date then
    raise exception 'P2: la fila en base no quedó como se pidió: %', to_jsonb(f);
  end if;
  r := pg_temp.rp_ok('P2 en XTS', pg_temp.rpg_registrar(ed, x, p, 'Saldo', 'XTS', 100, (t ->> 'tc')::uuid));
  f := pg_temp.rpg_fila(x);
  if f.monto_base <> 696.00 or f.tipo_cambio_aplicado <> 6.96 or f.tipo_cambio_id <> (t ->> 'tc')::uuid or (r ->> 'monto_base')::numeric <> 696.00 then
    raise exception 'P2: el monto en base en XTS debía ser 696,00 a 6,96: % %', r, to_jsonb(f);
  end if;
end $$;
rollback;

-- @test repuestos: los datos de un pago de proyecto se validan, cada uno con su hint (P3)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(pg_temp.rpg_todos()); t jsonb := pg_temp.rpg_terreno(); p uuid := pg_temp.rp_proyecto(ed); q uuid := pg_temp.rp_proyecto(ed);
  b text := t ->> 'base'; i uuid := gen_random_uuid(); v_ruta text := p || '/' || repeat('c', 64) || '.pdf';
begin
  perform pg_temp.rp_es('P3 concepto vacío', pg_temp.rpg_registrar(ed, i, p, '   ', b, 10), '22023', 'concepto');
  perform pg_temp.rp_es('P3 concepto largo', pg_temp.rpg_registrar(ed, i, p, repeat('x', 201), b, 10), '22023', 'concepto');
  perform pg_temp.rp_es('P3 monto cero', pg_temp.rpg_registrar(ed, i, p, 'A', b, 0), '22023', 'monto');
  perform pg_temp.rp_es('P3 monto negativo', pg_temp.rpg_registrar(ed, i, p, 'A', b, -5), '22023', 'monto');
  perform pg_temp.rp_es('P3 monto NaN', pg_temp.rpg_registrar(ed, i, p, 'A', b, 'NaN'::numeric), '22023', 'monto');
  perform pg_temp.rp_es('P3 monto nulo', pg_temp.rpg_registrar(ed, i, p, 'A', b, null), '23502', 'monto');
  perform pg_temp.rp_es('P3 tres decimales', pg_temp.rpg_registrar(ed, i, p, 'A', b, 1.005), '22023', 'monto', 'El monto lleva como mucho dos decimales.');
  perform pg_temp.rp_es('P3 método largo', pg_temp.rpg_registrar(ed, i, p, 'A', b, 10, null, null, repeat('m', 101)), '22023', 'metodo');
  perform pg_temp.rp_es('P3 comprobante de otro proyecto', pg_temp.rpg_registrar(ed, i, p, 'A', b, 10, null, q || '/' || repeat('c', 64) || '.pdf'),
    '22023', 'comprobante_ruta');
  perform pg_temp.rp_es('P3 comprobante sin forma', pg_temp.rpg_registrar(ed, i, p, 'A', b, 10, null, p || '/factura.pdf'), '22023', 'comprobante_ruta');
  perform pg_temp.rp_es('P3 sin id', pg_temp.rpg_registrar(ed, null, p, 'A', b, 10), '23502', 'id');
  perform pg_temp.rp_es('P3 sin proyecto', pg_temp.rpg_registrar(ed, i, null, 'A', b, 10), '23502', 'proyecto');
  if exists (select 1 from public.pagos where id = i) then raise exception 'P3: un rechazo dejó el pago'; end if;
  perform pg_temp.rp_ok('P3 comprobante en la carpeta', pg_temp.rpg_registrar(ed, i, p, 'A', b, 10, null, v_ruta));
  if (pg_temp.rpg_fila(i)).comprobante_ruta <> v_ruta then raise exception 'P3: el comprobante no quedó guardado'; end if;
end $$;
rollback;

-- @test repuestos: proyecto cerrado da 23514 y eliminado PT409; el reintento de un id guardado pasa aunque se haya cerrado (P4)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(pg_temp.rpg_todos()); t jsonb := pg_temp.rpg_terreno(); p uuid := pg_temp.rp_proyecto(ed); q uuid := pg_temp.rp_proyecto(ed);
  b text := t ->> 'base'; a uuid := gen_random_uuid(); r jsonb; f public.pagos;
begin
  perform pg_temp.rp_ok('P4 crear', pg_temp.rpg_registrar(ed, a, p, 'Anticipo', b, 10));
  update public.repuestos_proyectos set cerrado_en = now() where id = p;
  perform pg_temp.rp_es('P4 crear en cerrado', pg_temp.rpg_registrar(ed, gen_random_uuid(), p, 'Saldo', b, 5), '23514', 'proyecto',
    'El proyecto está cerrado: reábrelo para registrar pagos.');
  r := pg_temp.rp_ok('P4 reintento en cerrado', pg_temp.rpg_registrar(ed, a, p, 'Anticipo', b, 10));
  if not (r ->> 'ya_existia')::boolean then raise exception 'P4: el reintento debía devolver lo guardado: %', r; end if;
  update public.repuestos_proyectos set eliminado_en = now() where id = q;
  perform pg_temp.rp_es('P4 proyecto eliminado', pg_temp.rpg_registrar(ed, gen_random_uuid(), q, 'A', b, 5), 'PT409', 'conflicto', 'Este proyecto ya no existe.');
  perform pg_temp.rp_es('P4 proyecto inexistente', pg_temp.rpg_registrar(ed, gen_random_uuid(), gen_random_uuid(), 'A', b, 5), 'PT409', 'conflicto');
  -- Un pago eliminado: el mismo id ya no se reusa.
  update public.repuestos_proyectos set cerrado_en = null where id = p;
  f := pg_temp.rpg_fila(a);
  perform pg_temp.rp_ok('P4 eliminar el pago', pg_temp.rpg_corre(ed, format('select public.pago_eliminar(%L::uuid, %L::timestamptz)', a, f.actualizado_en)));
  perform pg_temp.rp_es('P4 reintento de un eliminado', pg_temp.rpg_registrar(ed, a, p, 'Anticipo', b, 10), 'PT409', null, 'Ese pago ya no existe.');
end $$;
rollback;

-- @test repuestos: registrar es idempotente por id y nunca pisa; un id de otro proyecto o de un vehículo da 23505 (P5)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(pg_temp.rpg_todos()); t jsonb := pg_temp.rpg_terreno(); p uuid := pg_temp.rp_proyecto(ed); q uuid := pg_temp.rp_proyecto(ed);
  b text := t ->> 'base'; a uuid := gen_random_uuid(); pv uuid := gen_random_uuid(); o uuid; v uuid; r jsonb; antes public.pagos;
begin
  perform pg_temp.rp_ok('P5 crear', pg_temp.rpg_registrar(ed, a, p, 'Anticipo', b, 10));
  antes := pg_temp.rpg_fila(a);
  r := pg_temp.rp_ok('P5 reintento con otros datos', pg_temp.rpg_registrar(ed, a, p, 'Otro', b, 999));
  if not (r ->> 'ya_existia')::boolean or (r ->> 'monto_base')::numeric <> 10 or to_jsonb(pg_temp.rpg_fila(a)) <> to_jsonb(antes)
     or (select count(*) from public.pagos where id = a) <> 1 then
    raise exception 'P5: el reintento debía devolver lo guardado sin pisar: % %', r, to_jsonb(pg_temp.rpg_fila(a));
  end if;
  perform pg_temp.rp_es('P5 id de otro proyecto', pg_temp.rpg_registrar(ed, a, q, 'Anticipo', b, 10), '23505', 'id', 'Ese id ya es de otro pago.');
  -- Un pago de vehículo (sembrado como superusuario) con el mismo id.
  insert into public.origenes (clave, nombre, tipo) values ('rpg_' || substr(pv::text, 1, 8), 'rpg origen', 'manual') returning id into o;
  insert into public.vehiculos (origen_id, titulo) values (o, 'rpg vehículo') returning id into v;
  insert into public.pagos (id, vehiculo_id, concepto, moneda, monto, monto_base) values (pv, v, 'De vehículo', b, 1, 1);
  perform pg_temp.rp_es('P5 id de un pago de vehículo', pg_temp.rpg_registrar(ed, pv, p, 'Anticipo', b, 10), '23505', 'id');
  if (pg_temp.rpg_fila(pv)).proyecto_repuestos_id is not null then raise exception 'P5: el pago del vehículo cambió'; end if;
end $$;
rollback;

-- @test repuestos: proyecto.pago_cliente se cumple con un pago vivo del proyecto y deja de cumplirse al eliminarlo (P6)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(pg_temp.rpg_todos()); t jsonb := pg_temp.rpg_terreno(); p uuid := pg_temp.rp_proyecto(ed); q uuid := pg_temp.rp_proyecto(ed);
  fr uuid := (select id from public.flujos where ambito = 'repuestos'); f uuid; i uuid; iq uuid; a uuid := gen_random_uuid();
begin
  insert into public.fases (flujo_id, nombre, orden) values (fr, 'rpg cobrado', 1100) returning id into f;
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato) values (f, 'dato', true, 'proyecto.pago_cliente');
  insert into public.repuestos_items (proyecto_id, descripcion) values (p, 'rpg ítem') returning id into i;
  insert into public.repuestos_items (proyecto_id, descripcion) values (q, 'rpg ítem de otro') returning id into iq;
  if (select bool_and(cumplido) from public.evaluar_requisitos(null, i, f)) then raise exception 'P6: sin pagos el requisito no se cumple'; end if;
  perform pg_temp.rp_ok('P6 registrar', pg_temp.rpg_registrar(ed, a, p, 'Anticipo', t ->> 'base', 10));
  if not (select bool_and(cumplido) from public.evaluar_requisitos(null, i, f)) then raise exception 'P6: con un pago vivo el requisito se cumple'; end if;
  if (select bool_and(cumplido) from public.evaluar_requisitos(null, iq, f)) then raise exception 'P6: el pago de un proyecto no cumple el de otro'; end if;
  perform pg_temp.rp_ok('P6 eliminar', pg_temp.rpg_corre(ed, format('select public.pago_eliminar(%L::uuid, %L::timestamptz)', a,
    (pg_temp.rpg_fila(a)).actualizado_en)));
  if (select bool_and(cumplido) from public.evaluar_requisitos(null, i, f)) then raise exception 'P6: el pago eliminado ya no cumple'; end if;
end $$;
rollback;

-- @test repuestos: corregir, confirmar y leer sirven al proyecto; anular no; el proyecto con un pago vivo no se elimina (P7)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(pg_temp.rpg_todos()); t jsonb := pg_temp.rpg_terreno(); p uuid := pg_temp.rp_proyecto(ed);
  conf uuid := pg_temp.rp_persona(array['logistica.pagos.confirmar', 'repuestos.costos.ver']);
  conf_sin_ver uuid := pg_temp.rp_persona(array['logistica.pagos.confirmar']);
  solo_ver uuid := pg_temp.rp_persona(array['repuestos.ver']);
  editor uuid := pg_temp.rp_persona(array['repuestos.editar', 'repuestos.ver']);
  a uuid := gen_random_uuid(); r jsonb; f public.pagos;
begin
  perform pg_temp.rp_ok('P7 crear', pg_temp.rpg_registrar(ed, a, p, 'Anticipo', t ->> 'base', 10));
  f := pg_temp.rpg_fila(a);
  r := pg_temp.rp_ok('P7 corregir', pg_temp.rpg_corre(ed, format('select public.pago_guardar(%L::uuid, %L::timestamptz, %L::jsonb)', a, f.actualizado_en,
    '{"monto": 20}')));
  if (pg_temp.rpg_fila(a)).monto_base <> 20 then raise exception 'P7: corregir debía recalcular el monto en base'; end if;
  if pg_temp.rpg_corre(ed, format('select to_jsonb(count(*)) from public.pagos where id = %L', a)) <> '1'::jsonb
     or pg_temp.rpg_corre(solo_ver, format('select to_jsonb(count(*)) from public.pagos where id = %L', a)) <> '0'::jsonb then
    raise exception 'P7: con repuestos.costos.ver el pago se lee y sin ella no';
  end if;
  f := pg_temp.rpg_fila(a);
  perform pg_temp.rp_es('P7 confirmar sin costos.ver', pg_temp.rpg_corre(conf_sin_ver, format('select public.pago_confirmar(%L::uuid, %L::timestamptz)', a,
    f.actualizado_en)), '42501', null);
  perform pg_temp.rp_es('P7 confirmar sin logistica.pagos.confirmar', pg_temp.rpg_corre(ed, format('select public.pago_confirmar(%L::uuid, %L::timestamptz)',
    a, f.actualizado_en)), '42501', null);
  perform pg_temp.rp_ok('P7 confirmar', pg_temp.rpg_corre(conf, format('select public.pago_confirmar(%L::uuid, %L::timestamptz)', a, f.actualizado_en)));
  f := pg_temp.rpg_fila(a);
  if not f.confirmado or f.confirmado_por <> conf then raise exception 'P7: el pago debía quedar confirmado por quien confirmó'; end if;
  perform pg_temp.rp_es('P7 anular uno de proyecto', pg_temp.rpg_corre(conf, format('select public.pago_anular(%L::uuid, %L::timestamptz, %L)', a,
    f.actualizado_en, 'Error')), '22023', 'id');
  perform pg_temp.rp_es('P7 eliminar el proyecto con un pago vivo', pg_temp.rpg_corre(editor, format(
    'select public.repuesto_proyecto_eliminar(%L::uuid, %L::timestamptz)', p, (select actualizado_en from public.repuestos_proyectos where id = p))),
    '23514', 'en_uso');
end $$;
rollback;
