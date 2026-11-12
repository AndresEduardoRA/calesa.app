-- Mover un lote (paso 6.02-1): `cambiar_fase_lote(p_unidades jsonb, …)` con la fase esperada de cada unidad y un código por unidad, y
-- `previsualizar_cambio_fase_lote`. No depende de otro archivo (`SOLO=areas/mover/lote.sql`). Cada bloque abre su transacción y la revierte. Dos lotes a
-- la vez con los mismos vehículos: `carreras.mjs` (K2).
--
-- Qué asegura:
--   L1. Uno con la esperada vieja: `codigo = conflicto` y no se mueve; los otros, `ok` con su `historial_id`; el resultado, en el orden de entrada.
--   L2. Uno sin su requisito bloqueante: `codigo = requisitos`; los otros se mueven.
--   L3. Un lote vacío, que no es un arreglo, de 201, con un elemento sin `vehiculo`, un id inválido o un vehículo repetido: 22023 hint `p_unidades`.
--   L4. La vista previa del lote: un objeto por vehículo con `vehiculo_id` y `codigos`, en el orden de entrada; más de 200, 22023.
--   L5. La firma de `uuid[]` ya no existe; `anon` no ejecuta las nuevas.

-- La primera cuenta de una base vacía queda dueña (con `SOLO=` sin `humo.sql`): una de relleno antes, para que ninguna de la prueba lo sea.
create or replace function pg_temp.ml_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-ml@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio: cada concesión es `clave` o `clave@origen`, todas con el mismo alcance.
create or replace function pg_temp.ml_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.ml_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('ml_' || substr(v_id::text, 1, 8), 'ml ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.ml_rol_de(p_persona uuid) returns uuid language sql as $f$
  select rol_id from public.usuarios_roles where usuario_id = p_persona and es_principal;
$f$;

create or replace function pg_temp.ml_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('ml_' || s, 'ml origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.ml_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.ml_fase(p_flujo uuid, p_nombre text, p_orden int, p_inicial boolean default false) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (p_flujo, p_nombre, p_orden, p_inicial) returning id;
$f$;

create or replace function pg_temp.ml_transicion(p_flujo uuid, p_de uuid, p_a uuid, p_nota boolean default false) returns uuid language sql as $f$
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id, nota_obligatoria) values (p_flujo, p_de, p_a, p_nota) returning id;
$f$;

create or replace function pg_temp.ml_vehiculo(p_flujo uuid, p_fase uuid, p_creado_por uuid default null) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, creado_por) values (pg_temp.ml_origen_de(p_flujo), 'ml vehículo', p_fase, p_creado_por) returning id;
$f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.ml_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.ml_mover(p_quien uuid, p_v uuid, p_a uuid, p_esperada uuid, p_nota text default null) returns jsonb language sql as $f$
  select pg_temp.ml_corre(p_quien, format('select jsonb_build_object(''historial'', public.cambiar_fase(%L, null, %L, %L, %L))', p_v, p_a, p_nota, p_esperada));
$f$;

create or replace function pg_temp.ml_ver(p_quien uuid, p_v uuid, p_a uuid) returns jsonb language sql as $f$
  select pg_temp.ml_corre(p_quien, format('select public.previsualizar_cambio_fase(%L, null, %L)', p_v, p_a));
$f$;

-- Da ese error con ese hint (y ese mensaje, si se pide).
create or replace function pg_temp.ml_es(p_que text, p_r jsonb, p_estado text, p_hint text, p_mensaje text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint
     or (p_mensaje is not null and p_r ->> 'mensaje' is distinct from p_mensaje) then
    raise exception '%: debía dar % (hint %) «%» y dio %', p_que, p_estado, p_hint, coalesce(p_mensaje, '…'), p_r;
  end if;
end $f$;

create or replace function pg_temp.ml_pasa(p_que text, p_r jsonb) returns bigint language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'historial' is null then raise exception '%: debía mover y dio %', p_que, p_r; end if;
  return (p_r ->> 'historial')::bigint;
end $f$;

create or replace function pg_temp.ml_fase_de(p_v uuid) returns uuid language sql as $f$
  select fase_id from public.vehiculos where id = p_v;
$f$;

create or replace function pg_temp.ml_historial(p_v uuid) returns int language sql as $f$
  select count(*)::int from public.historial_fases where vehiculo_id = p_v;
$f$;

create or replace function pg_temp.ml_lote(p_quien uuid, p_unidades jsonb, p_a uuid) returns jsonb language sql as $f$
  select pg_temp.ml_corre(p_quien, format('select public.cambiar_fase_lote(%L::jsonb, %L, null)', p_unidades, p_a));
$f$;

create or replace function pg_temp.ml_u(p_v uuid, p_esperada uuid) returns jsonb language sql as $f$
  select jsonb_build_object('vehiculo', p_v, 'fase_esperada', p_esperada);
$f$;

-- @test mover lote: uno con la esperada vieja da conflicto y los otros se mueven, en el orden de entrada (L1)
begin;
do $$
declare
  a uuid := pg_temp.ml_flujo(); o uuid := pg_temp.ml_origen_de(a);
  f uuid := pg_temp.ml_fase(a, 'ml uno', 10, true); g uuid := pg_temp.ml_fase(a, 'ml dos', 20);
  t uuid := pg_temp.ml_transicion(a, f, g);
  v1 uuid := pg_temp.ml_vehiculo(a, f); v2 uuid := pg_temp.ml_vehiculo(a, f); v3 uuid := pg_temp.ml_vehiculo(a, g);
  mueve uuid := pg_temp.ml_persona(array['logistica.ver', 'flujos.mover@' || o]); r jsonb;
begin
  r := pg_temp.ml_lote(mueve, jsonb_build_array(pg_temp.ml_u(v3, f), pg_temp.ml_u(v1, f), pg_temp.ml_u(v2, f)), g);
  if r ? 'error' or jsonb_array_length(r) <> 3
     or r -> 0 ->> 'vehiculo_id' is distinct from v3::text or (r -> 0 ->> 'ok')::boolean is distinct from false
     or r -> 0 ->> 'codigo' is distinct from 'conflicto' or r -> 0 ->> 'motivo' is distinct from 'Esta unidad ya no está en esa fase.'
     or r -> 0 -> 'historial_id' is distinct from 'null'::jsonb
     or r -> 1 ->> 'vehiculo_id' is distinct from v1::text or (r -> 1 ->> 'ok')::boolean is distinct from true
     or r -> 1 -> 'codigo' is distinct from 'null'::jsonb or r -> 1 ->> 'historial_id' is null
     or r -> 2 ->> 'vehiculo_id' is distinct from v2::text or (r -> 2 ->> 'ok')::boolean is distinct from true then
    raise exception 'L1: debía dar [conflicto, ok, ok] en el orden de entrada y dio %', r;
  end if;
  if pg_temp.ml_historial(v1) <> 1 or pg_temp.ml_historial(v2) <> 1 or pg_temp.ml_historial(v3) <> 0 or pg_temp.ml_fase_de(v1) is distinct from g then
    raise exception 'L1: debían quedar dos historiales nuevos y el del conflicto sin mover';
  end if;
  if (r -> 1 ->> 'historial_id')::bigint is distinct from (select max(id) from public.historial_fases where vehiculo_id = v1) then
    raise exception 'L1: historial_id no es el del cambio';
  end if;
end $$;
rollback;

-- @test mover lote: uno sin su requisito bloqueante da codigo requisitos y los otros se mueven (L2)
begin;
do $$
declare
  a uuid := pg_temp.ml_flujo(); o uuid := pg_temp.ml_origen_de(a);
  f uuid := pg_temp.ml_fase(a, 'ml uno', 10, true); g uuid := pg_temp.ml_fase(a, 'ml dos', 20);
  t uuid := pg_temp.ml_transicion(a, f, g); v1 uuid := pg_temp.ml_vehiculo(a, f); v2 uuid := pg_temp.ml_vehiculo(a, f);
  mueve uuid := pg_temp.ml_persona(array['logistica.ver', 'flujos.mover@' || o]); td uuid; r jsonb;
begin
  insert into public.tipos_documento (nombre) values ('ml factura ' || substr(gen_random_uuid()::text, 1, 6)) returning id into td;
  insert into public.fases_requisitos (fase_id, tipo, tipo_documento_id, bloqueante) values (g, 'documento', td, true);
  insert into public.documentos (vehiculo_id, tipo_documento_id) values (v2, td);   -- nace «subido» (trigger); se aprueba aparte
  update public.documentos set estado = 'aprobado' where vehiculo_id = v2;
  r := pg_temp.ml_lote(mueve, jsonb_build_array(pg_temp.ml_u(v1, f), pg_temp.ml_u(v2, f)), g);
  if r -> 0 ->> 'codigo' is distinct from 'requisitos' or (r -> 1 ->> 'ok')::boolean is distinct from true then
    raise exception 'L2: debía dar [requisitos, ok] y dio %', r;
  end if;
  if pg_temp.ml_fase_de(v1) is distinct from f or pg_temp.ml_fase_de(v2) is distinct from g then raise exception 'L2: movió el que no cumplía'; end if;
end $$;
rollback;

-- @test mover lote: vacío, 201, un elemento sin vehículo, un id inválido o un repetido dan 22023 (hint p_unidades) y nada se mueve (L3)
begin;
do $$
declare
  a uuid := pg_temp.ml_flujo(); o uuid := pg_temp.ml_origen_de(a);
  f uuid := pg_temp.ml_fase(a, 'ml uno', 10, true); g uuid := pg_temp.ml_fase(a, 'ml dos', 20);
  t uuid := pg_temp.ml_transicion(a, f, g); v uuid := pg_temp.ml_vehiculo(a, f);
  mueve uuid := pg_temp.ml_persona(array['logistica.ver', 'flujos.mover@' || o]); malo jsonb;
begin
  foreach malo in array array[
    '[]'::jsonb,
    '{}'::jsonb,
    (select jsonb_agg(pg_temp.ml_u(gen_random_uuid(), null)) from generate_series(1, 200)) || jsonb_build_array(pg_temp.ml_u(v, f)),
    jsonb_build_array(pg_temp.ml_u(v, f), jsonb_build_object('fase_esperada', f)),
    jsonb_build_array(pg_temp.ml_u(v, f), jsonb_build_object('vehiculo', 'no-es-un-id', 'fase_esperada', null)),
    jsonb_build_array(jsonb_build_object('vehiculo', v, 'fase_esperada', 'tampoco')),
    jsonb_build_array(pg_temp.ml_u(v, f), pg_temp.ml_u(v, f))] loop
    perform pg_temp.ml_es('L3 ' || left(malo::text, 60), pg_temp.ml_lote(mueve, malo, g), '22023', 'p_unidades');
  end loop;
  if pg_temp.ml_historial(v) <> 0 or pg_temp.ml_fase_de(v) is distinct from f then raise exception 'L3: un lote mal formado movió algo'; end if;
end $$;
rollback;

-- @test mover lote: la vista previa del lote da un objeto por vehículo con vehiculo_id y codigos; sin acceso, acceso; más de 200, 22023 (L4)
begin;
do $$
declare
  a uuid := pg_temp.ml_flujo(); o uuid := pg_temp.ml_origen_de(a);
  f uuid := pg_temp.ml_fase(a, 'ml uno', 10, true); g uuid := pg_temp.ml_fase(a, 'ml dos', 20);
  t uuid := pg_temp.ml_transicion(a, f, g); v1 uuid := pg_temp.ml_vehiculo(a, f); v2 uuid := pg_temp.ml_vehiculo(a, f);
  propios uuid := pg_temp.ml_persona(array['logistica.ver', 'flujos.mover@' || o], 'propios'); r jsonb;
begin
  update public.vehiculos set creado_por = propios where id = v2;
  r := pg_temp.ml_corre(propios, format('select public.previsualizar_cambio_fase_lote(%L::uuid[], %L)', array[v1, v2], g));
  if jsonb_array_length(r) <> 2 or r -> 0 ->> 'vehiculo_id' is distinct from v1::text or r -> 0 -> 'codigos' is distinct from '["acceso"]'::jsonb
     or r -> 1 ->> 'vehiculo_id' is distinct from v2::text or (r -> 1 ->> 'ok')::boolean is distinct from true or r -> 1 -> 'codigos' is distinct from '[]'::jsonb then
    raise exception 'L4: debía dar [acceso, ok] con vehiculo_id y dio %', r;
  end if;
  perform pg_temp.ml_es('L4 201', pg_temp.ml_corre(propios, format('select public.previsualizar_cambio_fase_lote(%L::uuid[], %L)',
    (select array_agg(gen_random_uuid()) from generate_series(1, 201)), g)), '22023', 'p_vehiculos');
end $$;
rollback;

-- @test mover lote: la firma de uuid[] ya no existe y anon no ejecuta las dos nuevas (L5)
begin;
do $$
begin
  if to_regprocedure('public.cambiar_fase_lote(uuid[],uuid,text)') is not null then raise exception 'L5: sigue la firma vieja del lote'; end if;
  if has_function_privilege('anon', 'public.cambiar_fase_lote(jsonb,uuid,text)', 'execute')
     or has_function_privilege('anon', 'public.previsualizar_cambio_fase_lote(uuid[],uuid)', 'execute') then
    raise exception 'L5: anon ejecuta el lote o su vista previa';
  end if;
  if not has_function_privilege('authenticated', 'public.cambiar_fase_lote(jsonb,uuid,text)', 'execute') then
    raise exception 'L5: authenticated debía ejecutar el lote';
  end if;
end $$;
rollback;
