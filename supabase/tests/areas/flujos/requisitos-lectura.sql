-- La lectura de los requisitos de fase (paso 5.07-2): el impacto de un requisito, las unidades fuera de regla de un flujo y que el cambio de
-- fase frena con un requisito bloqueante. No depende de otro archivo (`SOLO=areas/flujos/requisitos-lectura.sql`). Cada bloque abre su
-- transacción y la revierte. La escritura: `requisitos.sql` y `requisitos-editar.sql`.
--
-- Qué asegura:
--   R11. `requisito_impacto` cuenta las unidades vivas de la fase que no cumplen el requisito (informativo da igual), corta en el tope y dice
--        cuántas revisó; una fase vacía da {0, false, 0}.
--   R12. `flujo_fuera_de_regla` no ve un requisito informativo; al volverlo bloqueante devuelve esas unidades (ids, fase, faltan) y corta en
--        tope + 1.
--   R13. `previsualizar_cambio_fase` deja pasar con el requisito informativo y frena con él bloqueante.
--   R14. El asesor y quien configura otro origen → 42501 en las dos lecturas; quien configura el origen, no.
--   R15. `fuera_de_regla()` ya no existe; anon no ejecuta las dos; un requisito o un flujo inexistentes → PT409.

create or replace function pg_temp.rl_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('rl_' || substr(v_id::text, 1, 8), 'RL ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.rl_asesor() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select v_id, id, true from public.roles where clave = 'asesor';
  return v_id;
end $f$;

-- Un origen nuevo con su flujo de vehículos (lo crea `origen_crear_flujo`); devuelve el id del flujo.
create or replace function pg_temp.rl_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('rl_' || s, 'RL origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.rl_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.rl_version(p_flujo uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.rl_fase(p_flujo uuid, p_nombre text) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden) values (p_flujo, p_nombre || ' ' || substr(gen_random_uuid()::text, 1, 6), 1000) returning id;
$f$;

create or replace function pg_temp.rl_vehiculo(p_flujo uuid, p_fase uuid, p_vin text default null, p_en_papelera boolean default false)
returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, vin, eliminado_en)
  values (pg_temp.rl_origen_de(p_flujo), 'RL vehículo', p_fase, p_vin, case when p_en_papelera then now() end) returning id;
$f$;

create or replace function pg_temp.rl_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.rl_impacto(p_quien uuid, p_req uuid, p_tope int default null) returns jsonb language sql as $f$
  select pg_temp.rl_corre(p_quien, format('select public.requisito_impacto(%L, %L)', p_req, p_tope));
$f$;

-- Las filas de `flujo_fuera_de_regla` como un arreglo jsonb (o el error).
create or replace function pg_temp.rl_fuera(p_quien uuid, p_flujo uuid, p_tope int default null) returns jsonb language sql as $f$
  select pg_temp.rl_corre(p_quien, format(
    'select jsonb_build_object(''filas'', coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb)) from public.flujo_fuera_de_regla(%L, %L) x', p_flujo, p_tope));
$f$;

create or replace function pg_temp.rl_falla(p_que text, p_r jsonb, p_estado text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado then raise exception '%: debía dar % y dio %', p_que, p_estado, p_r; end if;
end $f$;

-- El escenario del assert: un flujo, la fase F con 3 vehículos vivos (uno con VIN, dos sin) y uno sin VIN en la papelera, y un requisito
-- `vehiculo.vin` informativo en F. Devuelve {flujo, fase, req, sin_vin: [id, id]}.
create or replace function pg_temp.rl_escenario() returns jsonb language plpgsql as $f$
declare a uuid := pg_temp.rl_flujo(); f uuid := pg_temp.rl_fase(a, 'RL fase'); q uuid; s1 uuid; s2 uuid;
begin
  perform pg_temp.rl_vehiculo(a, f, 'JH4KA7650MC000001');
  s1 := pg_temp.rl_vehiculo(a, f);
  s2 := pg_temp.rl_vehiculo(a, f);
  perform pg_temp.rl_vehiculo(a, f, null, true);
  insert into public.fases_requisitos (fase_id, tipo, clave_dato, bloqueante) values (f, 'dato', 'vehiculo.vin', false) returning id into q;
  return jsonb_build_object('flujo', a, 'fase', f, 'req', q, 'sin_vin', jsonb_build_array(s1, s2));
end $f$;

create or replace function pg_temp.rl_bloqueante(p_quien uuid, p_esc jsonb) returns void language plpgsql as $f$
declare r jsonb;
begin
  r := pg_temp.rl_corre(p_quien, format('select to_jsonb(public.requisito_guardar(%L, %L, %L::jsonb))',
    p_esc ->> 'req', pg_temp.rl_version((p_esc ->> 'flujo')::uuid), '{"bloqueante": true}'));
  if r ? 'error' then raise exception 'volverlo bloqueante debía andar y dio %', r; end if;
end $f$;

-- @test requisitos: requisito_impacto cuenta las unidades vivas que no cumplen, corta en el tope y dice cuántas revisó (R11)
begin;
do $$
declare
  primera uuid := pg_temp.rl_asesor();
  e jsonb := pg_temp.rl_escenario(); a uuid := (e ->> 'flujo')::uuid;
  config uuid := pg_temp.rl_persona(array['flujos.configurar@' || pg_temp.rl_origen_de(a)]);
  vacia uuid := pg_temp.rl_fase(a, 'RL vacía'); q_vacia uuid; r jsonb;
begin
  r := pg_temp.rl_impacto(config, (e ->> 'req')::uuid);
  if r is distinct from '{"fuera": 2, "hay_mas": false, "revisadas": 3}'::jsonb then raise exception 'R11: debía dar 2 de 3 y dio %', r; end if;
  r := pg_temp.rl_impacto(config, (e ->> 'req')::uuid, 1);
  if r is distinct from '{"fuera": 1, "hay_mas": true, "revisadas": 3}'::jsonb then raise exception 'R11: con tope 1 debía cortar y dio %', r; end if;
  insert into public.fases_requisitos (fase_id, tipo, clave_dato, bloqueante) values (vacia, 'dato', 'vehiculo.vin', false) returning id into q_vacia;
  r := pg_temp.rl_impacto(config, q_vacia);
  if r is distinct from '{"fuera": 0, "hay_mas": false, "revisadas": 0}'::jsonb then raise exception 'R11: la fase vacía debía dar 0 y dio %', r; end if;
end $$;
rollback;

-- @test requisitos: flujo_fuera_de_regla no ve un informativo; al volverlo bloqueante da esas unidades y corta en tope + 1 (R12)
begin;
do $$
declare
  primera uuid := pg_temp.rl_asesor();
  e jsonb := pg_temp.rl_escenario(); a uuid := (e ->> 'flujo')::uuid;
  config uuid := pg_temp.rl_persona(array['flujos.configurar@' || pg_temp.rl_origen_de(a)]);
  r jsonb; esperadas uuid[] := array(select jsonb_array_elements_text(e -> 'sin_vin')::uuid);
begin
  r := pg_temp.rl_fuera(config, a);
  if r -> 'filas' is distinct from '[]'::jsonb then raise exception 'R12: con el requisito informativo no debía dar filas y dio %', r; end if;
  perform pg_temp.rl_bloqueante(config, e);
  r := pg_temp.rl_fuera(config, a);
  if r ? 'error' or jsonb_array_length(r -> 'filas') <> 2
     or (select array_agg((x ->> 'vehiculo_id')::uuid order by x ->> 'vehiculo_id') from jsonb_array_elements(r -> 'filas') x)
        is distinct from (select array_agg(u order by u::text) from unnest(esperadas) u)
     or exists (select 1 from jsonb_array_elements(r -> 'filas') x
                where x -> 'repuesto_id' <> 'null'::jsonb or x ->> 'fase_id' <> e ->> 'fase' or (x ->> 'faltan')::int <> 1) then
    raise exception 'R12: debía dar los dos sin VIN en la fase con faltan 1 y dio %', r;
  end if;
  r := pg_temp.rl_fuera(config, a, 1);
  if jsonb_array_length(r -> 'filas') <> 2 then raise exception 'R12: con tope 1 debía dar tope + 1 = 2 filas y dio %', r; end if;
end $$;
rollback;

-- @test requisitos: previsualizar_cambio_fase deja pasar con el requisito informativo y frena con él bloqueante (R13)
begin;
do $$
declare
  primera uuid := pg_temp.rl_asesor();
  e jsonb := pg_temp.rl_escenario(); a uuid := (e ->> 'flujo')::uuid; f uuid := (e ->> 'fase')::uuid;
  config uuid := pg_temp.rl_persona(array['flujos.configurar@' || pg_temp.rl_origen_de(a)]);
  mueve uuid := pg_temp.rl_persona(array['logistica.ver', 'flujos.mover', 'flujos.mover.cualquiera']);
  antes uuid := pg_temp.rl_fase(a, 'RL antes'); cuarto uuid; r jsonb;
begin
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values (a, antes, f);
  cuarto := pg_temp.rl_vehiculo(a, antes);
  r := pg_temp.rl_corre(mueve, format('select public.previsualizar_cambio_fase(%L, null, %L)', cuarto, f));
  if r ? 'error' or r -> 'faltan' is distinct from '[]'::jsonb or (r ->> 'ok')::boolean is distinct from true then
    raise exception 'R13: con el requisito informativo debía dejar pasar y dio %', r;
  end if;
  perform pg_temp.rl_bloqueante(config, e);
  r := pg_temp.rl_corre(mueve, format('select public.previsualizar_cambio_fase(%L, null, %L)', cuarto, f));
  if (r ->> 'ok')::boolean is distinct from false or not coalesce(r -> 'motivos' ? 'Faltan 1 requisito(s) bloqueante(s).', false)
     or jsonb_array_length(r -> 'faltan') <> 1 or r -> 'faltan' -> 0 ->> 'requisito_id' is distinct from e ->> 'req' then
    raise exception 'R13: con el requisito bloqueante debía frenar por él y dio %', r;
  end if;
end $$;
rollback;

-- @test requisitos: el asesor y quien configura otro origen reciben 42501 en requisito_impacto y flujo_fuera_de_regla (R14)
begin;
do $$
declare
  primera uuid := pg_temp.rl_asesor();
  e jsonb := pg_temp.rl_escenario(); a uuid := (e ->> 'flujo')::uuid; q uuid := (e ->> 'req')::uuid;
  config uuid := pg_temp.rl_persona(array['flujos.configurar@' || pg_temp.rl_origen_de(a)]);
  config_b uuid := pg_temp.rl_persona(array['flujos.configurar@' || pg_temp.rl_origen_de(pg_temp.rl_flujo())]);
  asesor uuid := pg_temp.rl_asesor(); quien uuid;
begin
  foreach quien in array array[asesor, config_b] loop
    perform pg_temp.rl_falla('R14 impacto', pg_temp.rl_impacto(quien, q), '42501');
    perform pg_temp.rl_falla('R14 fuera de regla', pg_temp.rl_fuera(quien, a), '42501');
  end loop;
  if pg_temp.rl_impacto(config, q) ? 'error' or pg_temp.rl_fuera(config, a) ? 'error' then
    raise exception 'R14: quien configura el origen debía poder leer';
  end if;
end $$;
rollback;

-- @test requisitos: fuera_de_regla() ya no existe, anon no ejecuta las lecturas y lo inexistente da PT409 (R15)
begin;
do $$
declare
  primera uuid := pg_temp.rl_asesor();
  config uuid := pg_temp.rl_persona(array['flujos.configurar']);
begin
  if to_regprocedure('public.fuera_de_regla(uuid)') is not null then raise exception 'R15: fuera_de_regla(uuid) debía estar borrada'; end if;
  if has_function_privilege('anon', 'public.requisito_impacto(uuid, int)', 'execute')
     or has_function_privilege('anon', 'public.flujo_fuera_de_regla(uuid, int)', 'execute') then
    raise exception 'R15: anon no debía ejecutar las lecturas';
  end if;
  perform pg_temp.rl_falla('R15 requisito inexistente', pg_temp.rl_impacto(config, gen_random_uuid()), 'PT409');
  perform pg_temp.rl_falla('R15 flujo inexistente', pg_temp.rl_fuera(config, gen_random_uuid()), 'PT409');
end $$;
rollback;
