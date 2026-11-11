-- Las reglas de un flujo (paso 5.10-1): `flujo_regla_cambiar()`, `flujo_regla_impacto()`, su regla única `_flujo_regla_uso()`, el catálogo
-- por ámbito `_flujo_regla_admitida()` y el trigger `flujo_regla_apagar_validar()`. No depende de otro archivo
-- (`SOLO=humo.sql,flujos-reglas.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   R1. 42501 al asesor, a otro origen y a `repuestos.configurar` en vehículos (antes del catálogo); inexistente PT409; ayudantes cerrados.
--   R2. Apagar «aduana» con una fase que la permite → 23514 y el impacto nombra esa fase por id; nada se escribe.
--   R3. Apagar «esperas» con un requisito de espera bloquea: por la RPC y por escritura directa (trigger).
--   R4. Apagar y encender sin uso mueven la versión; encender sin fila la inserta; apagar una regla ya apagada pasa aunque haya uso.
--   R5. Catálogo por ámbito y forma: 22023 con su hint.
--   R6. Dos cambios con la misma versión: el segundo PT409 y no escribe.
--   R7. Escritura directa como authenticated → 42501.
--   R8. Borrar un flujo con uso pasa (la cascada de `origen_eliminar`).

-- Una persona activa con un rol propio y estas concesiones: 'clave' (global) o 'clave@<origen>'.
create or replace function pg_temp.flr_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('flr_' || substr(v_id::text, 1, 8), 'FR ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.flr_asesor() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select v_id, id, true from public.roles where clave = 'asesor';
  return v_id;
end $f$;

-- Un origen manual nuevo (su flujo nace con 9 reglas, sin aduana); devuelve el id del flujo.
create or replace function pg_temp.flr_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('flr_' || s, 'FR origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.flr_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.flr_version(p_flujo uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.flr_activa(p_flujo uuid, p_regla text) returns boolean language sql as $f$
  select activa from public.flujos_reglas where flujo_id = p_flujo and regla = p_regla;
$f$;

create or replace function pg_temp.flr_fase(p_flujo uuid, p_nombre text, p_orden int) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden) values (p_flujo, p_nombre, p_orden) returning id;
$f$;

create or replace function pg_temp.flr_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.flr_cambiar(p_quien uuid, p_flujo uuid, p_version timestamptz, p_regla text, p_activa boolean) returns jsonb language sql as $f$
  select pg_temp.flr_corre(p_quien, format('select to_jsonb(public.flujo_regla_cambiar(%L, %L::timestamptz, %L, %L::boolean))', p_flujo, p_version, p_regla, p_activa));
$f$;

create or replace function pg_temp.flr_impacto(p_quien uuid, p_flujo uuid, p_regla text) returns jsonb language sql as $f$
  select pg_temp.flr_corre(p_quien, format('select public.flujo_regla_impacto(%L, %L)', p_flujo, p_regla));
$f$;

create or replace function pg_temp.flr_da_error(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.flr_es(p_que text, p_r jsonb, p_esperado jsonb) returns void language plpgsql as $f$
begin
  if p_r is distinct from p_esperado then raise exception '%: debía dar % y dio %', p_que, p_esperado, p_r; end if;
end $f$;

-- La versión que devolvió un cambio, o el error.
create or replace function pg_temp.flr_nueva(p_que text, p_r jsonb, p_antes timestamptz) returns timestamptz language plpgsql as $f$
declare v timestamptz;
begin
  if p_r ? 'error' or jsonb_typeof(p_r) <> 'string' then raise exception '%: debía devolver la versión y dio %', p_que, p_r; end if;
  v := (p_r #>> '{}')::timestamptz;
  if v <= p_antes then raise exception '%: la versión no se movió (% ≤ %)', p_que, v, p_antes; end if;
  return v;
end $f$;

-- @test reglas: borrar un flujo con fases marcadas y una espera pasa, la cascada no frena (R8)
begin;
do $$
declare
  a uuid := pg_temp.flr_flujo(); rep uuid := (select id from public.flujos where ambito = 'repuestos');
  f uuid; fb uuid := pg_temp.flr_fase(rep, 'FR de repuestos', 1000);
begin
  insert into public.flujos_reglas (flujo_id, regla, activa) values (a, 'aduana', true);
  insert into public.fases (flujo_id, nombre, orden, permite_aduana) values (a, 'FR aduana', 10, true) returning id into f;
  insert into public.fases_requisitos (fase_id, tipo, espera_fase_id, espera_ambito) values (f, 'espera', fb, 'hijos');
  delete from public.flujos where id = a;
  if exists (select 1 from public.flujos_reglas where flujo_id = a) then raise exception 'R8: quedaron reglas del flujo borrado'; end if;
end $$;
rollback;
