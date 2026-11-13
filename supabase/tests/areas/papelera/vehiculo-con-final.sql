-- Un vehículo con una cotización final activa y viva no va a la papelera, aunque la final no tenga lead (lo purgaron) y el vehículo no esté vinculado.
-- No depende de otro archivo (`SOLO=areas/papelera/vehiculo-con-final.sql`). Cada bloque que escribe abre su transacción y la revierte.
--
-- Qué asegura:
--   VF1. Con una final activa y viva sin lead, `vehiculos_papelera_enviar` lo deja en `rechazados` con 23514 y su motivo; el vehículo y la final siguen vivos.
--        `_vehiculo_motivo_de_bloqueo` da el mismo motivo al enviar y al purgar.
--   VF2. Una final reportada, inválida o en la papelera no frena: el vehículo se envía.

-- Una persona que ve y manda vehículos a la papelera en todo.
create or replace function pg_temp.vf_persona() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('vf_' || substr(v_id::text, 1, 8), 'VF ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array array['vehiculos.ver', 'vehiculos.eliminar'] loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.vf_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid;
begin
  insert into public.origenes (clave, nombre) values ('vf_' || substr(gen_random_uuid()::text, 1, 8), 'VF origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
            jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen'))),
          '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Un vehículo de ese origen, sin lead, con una final activa sin lead de quien se pase.
create or replace function pg_temp.vf_vehiculo_con_final(e jsonb, p_quien uuid) returns jsonb language plpgsql as $f$
declare v uuid; c uuid;
begin
  insert into public.vehiculos (origen_id, titulo) values ((e ->> 'o')::uuid, 'VF vehículo') returning id into v;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, clase, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, v, 'final', '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into c;
  return jsonb_build_object('v', v, 'c', c);
end $f$;

-- Manda ese vehículo a la papelera como esa persona, con su versión de hoy; devuelve la respuesta o {error, mensaje}.
create or replace function pg_temp.vf_enviar(p_quien uuid, p_v uuid) returns jsonb language plpgsql as $f$
declare r jsonb; v_e text; v_m text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    r := public.vehiculos_papelera_enviar(jsonb_build_array(jsonb_build_object('id', p_v, 'actualizado_en', (select actualizado_en from public.vehiculos where id = p_v))));
  exception when others then
    get stacked diagnostics v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m);
  end;
  reset role;
  return r;
end $f$;

create or replace function pg_temp.vf_motivo(p_v uuid, p_al_enviar boolean) returns text language sql as $f$
  select public._vehiculo_motivo_de_bloqueo(x, p_al_enviar) from public.vehiculos x where x.id = p_v;
$f$;

-- @test papelera de vehículos: una final activa sin lead frena el envío con 23514 y su motivo; el vehículo y la final siguen vivos (VF1)
begin;
do $$
declare
  q uuid; e jsonb := pg_temp.vf_origen(); x jsonb; r jsonb;
  motivo constant text := 'Tiene una cotización final. Mándala a la papelera antes.';
begin
  perform pg_temp.vf_persona();   -- con `SOLO=`, la primera cuenta nace dueña: no puede ser la que prueba
  q := pg_temp.vf_persona();
  x := pg_temp.vf_vehiculo_con_final(e, q);
  if (select lead_id from public.vehiculos where id = (x ->> 'v')::uuid) is not null
     or (select lead_id from public.cotizaciones where id = (x ->> 'c')::uuid) is not null then
    raise exception 'VF1: la prueba debía armar una final sin lead y un vehículo sin vínculo';
  end if;
  if pg_temp.vf_motivo((x ->> 'v')::uuid, true) is distinct from motivo then
    raise exception 'VF1: al enviar debía frenar con «%» y dio %', motivo, pg_temp.vf_motivo((x ->> 'v')::uuid, true);
  end if;
  if pg_temp.vf_motivo((x ->> 'v')::uuid, false) is distinct from motivo then
    raise exception 'VF1: al purgar debía frenar con «%» y dio %', motivo, pg_temp.vf_motivo((x ->> 'v')::uuid, false);
  end if;
  r := pg_temp.vf_enviar(q, (x ->> 'v')::uuid);
  if r ? 'error' then raise exception 'VF1: enviar falló entero: %', r; end if;
  if jsonb_array_length(r -> 'enviados') <> 0
     or (select y ->> 'codigo' from jsonb_array_elements(r -> 'rechazados') y where y ->> 'id' = x ->> 'v') is distinct from '23514'
     or (select y ->> 'motivo' from jsonb_array_elements(r -> 'rechazados') y where y ->> 'id' = x ->> 'v') is distinct from motivo then
    raise exception 'VF1: el vehículo con final debía quedar en rechazados con 23514 «%» y dio %', motivo, r;
  end if;
  if (select eliminado_en from public.vehiculos where id = (x ->> 'v')::uuid) is not null then raise exception 'VF1: el vehículo con final se fue a la papelera'; end if;
  if (select eliminado_en from public.cotizaciones where id = (x ->> 'c')::uuid) is not null then raise exception 'VF1: la final se fue a la papelera con el vehículo'; end if;
end $$;
reset role;
rollback;

-- @test papelera de vehículos: una final reportada, inválida o en la papelera no frena el envío (VF2)
begin;
do $$
declare q uuid; e jsonb := pg_temp.vf_origen(); x jsonb; r jsonb; v_lote uuid; v_estado text;
begin
  perform pg_temp.vf_persona();
  q := pg_temp.vf_persona();
  foreach v_estado in array array['reportada', 'invalida'] loop
    x := pg_temp.vf_vehiculo_con_final(e, q);
    update public.cotizaciones set estado = v_estado::public.estado_cotizacion where id = (x ->> 'c')::uuid;
    if pg_temp.vf_motivo((x ->> 'v')::uuid, true) is not null then
      raise exception 'VF2: una final % no debía frenar y dio %', v_estado, pg_temp.vf_motivo((x ->> 'v')::uuid, true);
    end if;
    r := pg_temp.vf_enviar(q, (x ->> 'v')::uuid);
    if r ? 'error' or jsonb_array_length(r -> 'enviados') <> 1 then raise exception 'VF2: con una final % debía enviarse y dio %', v_estado, r; end if;
  end loop;
  x := pg_temp.vf_vehiculo_con_final(e, q);
  insert into public.lotes_papelera (tipo, creado_por) values ('cotizaciones', q) returning id into v_lote;
  update public.cotizaciones set eliminado_en = now(), lote_papelera_id = v_lote where id = (x ->> 'c')::uuid;
  r := pg_temp.vf_enviar(q, (x ->> 'v')::uuid);
  if r ? 'error' or jsonb_array_length(r -> 'enviados') <> 1 then raise exception 'VF2: con la final en la papelera debía enviarse y dio %', r; end if;
end $$;
reset role;
rollback;
