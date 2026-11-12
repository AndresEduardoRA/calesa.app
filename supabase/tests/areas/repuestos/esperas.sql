-- Qué espera un vehículo de sus repuestos (paso 8.08-1, C10 y C11; contradicción 3 de la Fase 8). No depende de otro archivo
-- (`SOLO=areas/repuestos/esperas.sql`); cada bloque abre su transacción y la revierte. Las fases son propias (nombres «rpe …», orden ≥ 1000) y los
-- ítems se ubican con su historial como superusuario: no depende de la semilla.
--
-- Terreno: un vehículo en «rpe taller» con transición a «rpe listo»; en «rpe listo», un requisito `espera`/`hijos` bloqueante hacia «rpe recibido».
-- Qué asegura (el «Terminado cuando» del 8.08):
--   E1. Con i1 en «recibido» e i2 en «tránsito», la vista previa hacia «listo» (con `logistica.ver` del origen) trae el código `requisitos` y el
--       requisito con detalle {hijos 2, llegaron 1, sin_llegar 0}.
--   E2. i2 llega a «recibido»: cumple con {2, 2, 0}.
--   E3. i2 queda «perdido» (final, sin llegar): cumple con {2, 1, 1}. Contra la versión del 6.02-1 cae (frenaba para siempre).
--   E4. Un i3 en stock, en «tránsito», no cuenta.
--   E5. El único ítem «perdido»: cumple con {1, 0, 1}.
--   E6. `repuestos_pendientes_de_vehiculo`: con `logistica.ver` del origen (sin `repuestos.ver`), sólo i2 en «tránsito», con espera «recibido» y destino
--       «listo»; sólo con `repuestos.ver`, la misma fila con los nombres de las fases del vehículo nulos; sin ninguno, nada; desde una fase sin
--       transición hacia una espera, nada; `authenticated` no ejecuta `_repuesto_ante_espera` (42501).

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

create or replace function pg_temp.rp_origen() returns uuid language plpgsql as $f$
declare s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8); o uuid;
begin
  insert into public.origenes (clave, nombre, tipo) values ('rp_' || s, 'rp origen ' || s, 'manual') returning id into o;
  return o;
end $f$;

create or replace function pg_temp.rp_vehiculo(p_origen uuid) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo) values (p_origen, 'rp vehículo') returning id;
$f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.rp_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.rp_crear(p_quien uuid, p_id uuid, p_datos jsonb) returns jsonb language sql as $f$
  select pg_temp.rp_corre(p_quien, format('select public.repuesto_proyecto_crear(%L, %L)', p_id, p_datos));
$f$;


-- El terreno: devuelve {v, listo, req, transito, recibido, perdido, proyecto, origen}.
create or replace function pg_temp.rpe_terreno() returns jsonb language plpgsql as $f$
declare
  o uuid := pg_temp.rp_origen(); fv uuid; taller uuid; listo uuid; v uuid; q uuid;
  fr uuid := (select id from public.flujos where ambito = 'repuestos'); transito uuid; recibido uuid; perdido uuid; p uuid;
begin
  select id into fv from public.flujos where origen_id = o;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fv, 'rpe taller', 10, true) returning id into taller;
  insert into public.fases (flujo_id, nombre, orden) values (fv, 'rpe listo', 20) returning id into listo;
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values (fv, taller, listo);
  insert into public.fases (flujo_id, nombre, orden) values (fr, 'rpe tránsito', 1010) returning id into transito;
  insert into public.fases (flujo_id, nombre, orden, es_final) values (fr, 'rpe recibido', 1020, true) returning id into recibido;
  insert into public.fases (flujo_id, nombre, orden, es_final) values (fr, 'rpe perdido', 1030, true) returning id into perdido;
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, espera_fase_id, espera_ambito) values (listo, 'espera', true, recibido, 'hijos') returning id into q;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'rpe vehículo', taller) returning id into v;
  insert into public.repuestos_proyectos (vehiculo_id) values (v) returning id into p;
  return jsonb_build_object('v', v, 'listo', listo, 'req', q, 'transito', transito, 'recibido', recibido, 'perdido', perdido, 'proyecto', p, 'origen', o,
    'taller', taller);
end $f$;

-- Un ítem del proyecto en una fase, con su historial hasta ella (por tránsito si es otra).
create or replace function pg_temp.rpe_item(t jsonb, p_fase uuid, p_stock boolean default false) returns uuid language plpgsql as $f$
declare i uuid; fr uuid := (select id from public.flujos where ambito = 'repuestos');
begin
  insert into public.repuestos_items (proyecto_id, descripcion, fase_id, en_stock_desde)
  values ((t ->> 'proyecto')::uuid, 'rpe ítem', p_fase, case when p_stock then now() end) returning id into i;
  insert into public.historial_fases (flujo_id, repuesto_id, de_fase_id, a_fase_id) values (fr, i, null, (t ->> 'transito')::uuid);
  if p_fase <> (t ->> 'transito')::uuid then
    insert into public.historial_fases (flujo_id, repuesto_id, de_fase_id, a_fase_id) values (fr, i, (t ->> 'transito')::uuid, p_fase);
  end if;
  return i;
end $f$;

create or replace function pg_temp.rpe_mover(t jsonb, p_item uuid, p_fase uuid) returns void language sql as $f$
  insert into public.historial_fases (flujo_id, repuesto_id, de_fase_id, a_fase_id)
  select (select id from public.flujos where ambito = 'repuestos'), p_item, i.fase_id, p_fase from public.repuestos_items i where i.id = p_item;
  update public.repuestos_items set fase_id = p_fase where id = p_item;
$f$;

-- La vista previa hacia «listo», pedida por alguien con logistica.ver del origen.
create or replace function pg_temp.rpe_ver(t jsonb) returns jsonb language sql as $f$
  select pg_temp.rp_corre(pg_temp.rp_persona(array['logistica.ver@' || (t ->> 'origen')]),
    format('select public.previsualizar_cambio_fase(%L, null, %L)', t ->> 'v', t ->> 'listo'));
$f$;

-- Comprueba el requisito de espera en la vista previa: cumplido y detalle exacto.
create or replace function pg_temp.rpe_es(p_que text, t jsonb, p_cumplido boolean, p_detalle jsonb) returns void language plpgsql as $f$
declare r jsonb := pg_temp.rpe_ver(t); e jsonb;
begin
  select x into e from jsonb_array_elements(r -> 'requisitos') x where x ->> 'requisito_id' = t ->> 'req';
  if e is null then raise exception '%: la vista previa no trae el requisito: %', p_que, r; end if;
  if (e ->> 'cumplido')::boolean is distinct from p_cumplido or e -> 'detalle' is distinct from p_detalle then
    raise exception '%: debía dar cumplido=% con % y dio %', p_que, p_cumplido, p_detalle, e;
  end if;
  if (r -> 'codigos' ? 'requisitos') = p_cumplido then
    raise exception '%: el código requisitos no coincide con cumplido=%: %', p_que, p_cumplido, r -> 'codigos';
  end if;
end $f$;

-- @test repuestos: un ítem que no llegó frena al vehículo; el detalle cuenta hijos, llegaron y sin_llegar (E1)
begin;
do $$
declare t jsonb := pg_temp.rpe_terreno();
begin
  perform pg_temp.rpe_item(t, (t ->> 'recibido')::uuid);
  perform pg_temp.rpe_item(t, (t ->> 'transito')::uuid);
  perform pg_temp.rpe_es('E1', t, false, '{"hijos": 2, "llegaron": 1, "sin_llegar": 0}');
end $$;
rollback;

-- @test repuestos: cuando el que faltaba llega, cumple (E2)
begin;
do $$
declare t jsonb := pg_temp.rpe_terreno(); i2 uuid;
begin
  perform pg_temp.rpe_item(t, (t ->> 'recibido')::uuid);
  i2 := pg_temp.rpe_item(t, (t ->> 'transito')::uuid);
  perform pg_temp.rpe_mover(t, i2, (t ->> 'recibido')::uuid);
  perform pg_temp.rpe_es('E2', t, true, '{"hijos": 2, "llegaron": 2, "sin_llegar": 0}');
end $$;
rollback;

-- @test repuestos: un ítem perdido (final, sin llegar) no frena al vehículo (E3)
begin;
do $$
declare t jsonb := pg_temp.rpe_terreno(); i2 uuid;
begin
  perform pg_temp.rpe_item(t, (t ->> 'recibido')::uuid);
  i2 := pg_temp.rpe_item(t, (t ->> 'transito')::uuid);
  perform pg_temp.rpe_mover(t, i2, (t ->> 'perdido')::uuid);
  perform pg_temp.rpe_es('E3', t, true, '{"hijos": 2, "llegaron": 1, "sin_llegar": 1}');
end $$;
rollback;

-- @test repuestos: un ítem en stock no cuenta para la espera (E4)
begin;
do $$
declare t jsonb := pg_temp.rpe_terreno();
begin
  perform pg_temp.rpe_item(t, (t ->> 'recibido')::uuid);
  perform pg_temp.rpe_item(t, (t ->> 'transito')::uuid, true);
  perform pg_temp.rpe_es('E4', t, true, '{"hijos": 1, "llegaron": 1, "sin_llegar": 0}');
end $$;
rollback;

-- @test repuestos: el único ítem perdido deja pasar al vehículo (E5)
begin;
do $$
declare t jsonb := pg_temp.rpe_terreno();
begin
  perform pg_temp.rpe_item(t, (t ->> 'perdido')::uuid);
  perform pg_temp.rpe_es('E5', t, true, '{"hijos": 1, "llegaron": 0, "sin_llegar": 1}');
end $$;
rollback;

-- @test repuestos: los ítems que la espera de un vehículo aguarda, según quién pregunta y desde qué fase (E6)
begin;
do $$
declare
  t jsonb := pg_temp.rpe_terreno(); i2 uuid; r jsonb; e jsonb; otra uuid;
  log uuid := pg_temp.rp_persona(array['logistica.ver@' || (t ->> 'origen')]);
  rep uuid := pg_temp.rp_persona(array['repuestos.ver']);
  nadie uuid := pg_temp.rp_persona(array['vehiculos.ver']);
  q text := format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]'') from public.repuestos_pendientes_de_vehiculo(%L) x', t ->> 'v');
begin
  perform pg_temp.rpe_item(t, (t ->> 'recibido')::uuid);
  i2 := pg_temp.rpe_item(t, (t ->> 'transito')::uuid);
  perform pg_temp.rpe_item(t, (t ->> 'perdido')::uuid);
  perform pg_temp.rpe_item(t, (t ->> 'transito')::uuid, true);
  r := pg_temp.rp_corre(log, q);
  if jsonb_array_length(r) <> 1 then raise exception 'E6: con logistica.ver debía traer sólo i2 y trajo %', r; end if;
  e := r -> 0;
  if (e ->> 'item_id')::uuid <> i2 or e ->> 'requisito_id' <> t ->> 'req' or e ->> 'fase_destino_id' <> t ->> 'listo'
     or e ->> 'espera_fase_id' <> t ->> 'recibido' or e ->> 'fase_nombre' <> 'rpe tránsito'
     or e ->> 'fase_destino_nombre' <> 'rpe listo' or e ->> 'espera_fase_nombre' <> 'rpe recibido' then
    raise exception 'E6: la fila de i2 no es la esperada: %', e;
  end if;
  r := pg_temp.rp_corre(rep, q);
  if jsonb_array_length(r) <> 1 or (r -> 0 ->> 'item_id')::uuid <> i2 or r -> 0 ->> 'fase_destino_nombre' is not null
     or r -> 0 ->> 'espera_fase_nombre' is not null or r -> 0 ->> 'fase_nombre' <> 'rpe tránsito' then
    raise exception 'E6: sólo con repuestos.ver debía traer i2 sin los nombres de las fases del vehículo: %', r;
  end if;
  if pg_temp.rp_corre(nadie, q) <> '[]'::jsonb then raise exception 'E6: sin repuestos.ver ni logistica.ver trajo filas'; end if;
  -- Desde una fase sin transición hacia una espera: nada.
  insert into public.fases (flujo_id, nombre, orden) values ((select flujo_id from public.fases where id = (t ->> 'taller')::uuid), 'rpe sin salida', 30)
  returning id into otra;
  update public.vehiculos set fase_id = otra where id = (t ->> 'v')::uuid;
  if pg_temp.rp_corre(log, q) <> '[]'::jsonb then raise exception 'E6: desde una fase sin transición a una espera trajo filas'; end if;
  perform pg_temp.rp_es('E6 _repuesto_ante_espera', pg_temp.rp_corre(log, format('select to_jsonb(public._repuesto_ante_espera(%L, %L))', i2, t ->> 'recibido')),
    '42501', null);
end $$;
rollback;
