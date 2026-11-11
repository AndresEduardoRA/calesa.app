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

-- @test reglas: 42501 al asesor, a otro origen y a repuestos.configurar en vehículos; inexistente PT409; ayudantes cerrados (R1)
begin;
do $$
declare
  a uuid := pg_temp.flr_flujo(); b uuid := pg_temp.flr_flujo(); rep uuid := (select id from public.flujos where ambito = 'repuestos');
  config_b uuid := pg_temp.flr_persona(array['flujos.configurar@' || pg_temp.flr_origen_de(b)]);
  config_rep uuid := pg_temp.flr_persona(array['repuestos.configurar']);
  asesor uuid := pg_temp.flr_asesor(); r jsonb;
begin
  perform pg_temp.flr_da_error('R1 asesor cambia', pg_temp.flr_cambiar(asesor, a, pg_temp.flr_version(a), 'gastos', false), '42501');
  perform pg_temp.flr_da_error('R1 asesor impacto', pg_temp.flr_impacto(asesor, a, 'gastos'), '42501');
  perform pg_temp.flr_da_error('R1 otro origen cambia', pg_temp.flr_cambiar(config_b, a, pg_temp.flr_version(a), 'gastos', false), '42501');
  perform pg_temp.flr_da_error('R1 otro origen impacto', pg_temp.flr_impacto(config_b, a, 'gastos'), '42501');
  perform pg_temp.flr_da_error('R1 repuestos en vehículos', pg_temp.flr_cambiar(config_rep, a, pg_temp.flr_version(a), 'gastos', false), '42501');
  -- El catálogo va después del permiso: el asesor no se entera de qué admite repuestos.
  perform pg_temp.flr_da_error('R1 asesor y catálogo', pg_temp.flr_cambiar(asesor, rep, pg_temp.flr_version(rep), 'aduana', true), '42501');
  r := pg_temp.flr_cambiar(config_rep, rep, pg_temp.flr_version(rep), 'gastos', false);
  perform pg_temp.flr_nueva('R1 repuestos en repuestos', r, '-infinity');
  if pg_temp.flr_activa(rep, 'gastos') is distinct from false then raise exception 'R1: repuestos.configurar no apagó gastos'; end if;
  r := pg_temp.flr_impacto(config_b, b, 'gastos');
  if r ? 'error' then raise exception 'R1: quien configura B debía leer el impacto de B y dio %', r; end if;
  perform pg_temp.flr_da_error('R1 inexistente cambia', pg_temp.flr_cambiar(config_b, gen_random_uuid(), now(), 'gastos', false), 'PT409');
  perform pg_temp.flr_da_error('R1 inexistente impacto', pg_temp.flr_impacto(config_b, gen_random_uuid(), 'gastos'), 'PT409');
  if has_function_privilege('authenticated', 'public._flujo_regla_uso(uuid, text)', 'execute')
     or has_function_privilege('authenticated', 'public._flujo_regla_admitida(public.ambito_flujo, text)', 'execute')
     or has_function_privilege('anon', 'public.flujo_regla_impacto(uuid, text)', 'execute')
     or has_function_privilege('anon', 'public.flujo_regla_cambiar(uuid, timestamptz, text, boolean)', 'execute') then
    raise exception 'R1: authenticated ejecuta un ayudante o anon una RPC de reglas';
  end if;
end $$;
rollback;

-- @test reglas: apagar «aduana» con una fase que la permite da 23514 y el impacto la nombra por id (R2)
begin;
do $$
declare
  a uuid := pg_temp.flr_flujo(); config uuid := pg_temp.flr_persona(array['flujos.configurar']);
  f uuid; v timestamptz; r jsonb;
begin
  insert into public.flujos_reglas (flujo_id, regla, activa) values (a, 'aduana', true);
  insert into public.fases (flujo_id, nombre, orden, permite_aduana) values (a, 'FR aduana', 10, true) returning id into f;
  perform pg_temp.flr_fase(a, 'FR libre', 20);
  r := pg_temp.flr_impacto(config, a, 'aduana');
  perform pg_temp.flr_es('R2 impacto', r, jsonb_build_object('bloquea', true, 'fases', jsonb_build_array(jsonb_build_object('id', f, 'nombre', 'FR aduana')),
    'requisitos', '[]'::jsonb));
  v := pg_temp.flr_version(a);
  perform pg_temp.flr_da_error('R2 apagar', pg_temp.flr_cambiar(config, a, v, 'aduana', false), '23514', 'regla');
  if pg_temp.flr_activa(a, 'aduana') is distinct from true or pg_temp.flr_version(a) <> v then raise exception 'R2: escribió al bloquear'; end if;
end $$;
rollback;

-- @test reglas: apagar «esperas» con un requisito de espera bloquea, por la RPC y por escritura directa (R3)
begin;
do $$
declare
  a uuid := pg_temp.flr_flujo(); rep uuid := (select id from public.flujos where ambito = 'repuestos');
  config uuid := pg_temp.flr_persona(array['flujos.configurar']);
  f uuid := pg_temp.flr_fase(a, 'FR espera', 10); fb uuid := pg_temp.flr_fase(rep, 'FR de repuestos', 1000); q uuid; r jsonb;
begin
  insert into public.fases_requisitos (fase_id, tipo, espera_fase_id, espera_ambito) values (f, 'espera', fb, 'hijos') returning id into q;
  r := pg_temp.flr_impacto(config, a, 'esperas');
  perform pg_temp.flr_es('R3 impacto', r, jsonb_build_object('bloquea', true, 'fases', '[]'::jsonb,
    'requisitos', jsonb_build_array(jsonb_build_object('id', q, 'fase', f, 'fase_nombre', 'FR espera'))));
  perform pg_temp.flr_da_error('R3 apagar', pg_temp.flr_cambiar(config, a, pg_temp.flr_version(a), 'esperas', false), '23514', 'regla');
  begin
    update public.flujos_reglas set activa = false where flujo_id = a and regla = 'esperas';
    raise exception 'R3: el trigger dejó apagar esperas con un requisito de espera';
  exception when check_violation then null;
  end;
  begin
    delete from public.flujos_reglas where flujo_id = a and regla = 'esperas';
    raise exception 'R3: el trigger dejó borrar esperas con un requisito de espera';
  exception when check_violation then null;
  end;
  begin
    update public.flujos_reglas set regla = 'alerta_demora' where flujo_id = a and regla = 'esperas';
    raise exception 'R3: el trigger dejó renombrar esperas con un requisito de espera';
  exception when check_violation then null;
  end;
  -- La espera de repuestos: el impacto de esperas en el flujo de repuestos no ve el requisito del flujo A.
  perform pg_temp.flr_es('R3 otro flujo', (public._flujo_regla_uso(rep, 'esperas')) -> 'requisitos', '[]'::jsonb);
end $$;
rollback;

-- @test reglas: apagar y encender sin uso mueven la versión; apagar una regla ya apagada pasa (R4)
begin;
do $$
declare
  a uuid := pg_temp.flr_flujo(); rep uuid := (select id from public.flujos where ambito = 'repuestos');
  config uuid := pg_temp.flr_persona(array['flujos.configurar']);
  v timestamptz; f uuid; fb uuid; q uuid;
begin
  v := pg_temp.flr_version(a);
  v := pg_temp.flr_nueva('R4 apagar', pg_temp.flr_cambiar(config, a, v, 'vitrina_web', false), v);
  if pg_temp.flr_activa(a, 'vitrina_web') is distinct from false or pg_temp.flr_version(a) <> v then raise exception 'R4: no apagó vitrina_web'; end if;
  v := pg_temp.flr_nueva('R4 encender', pg_temp.flr_cambiar(config, a, v, 'vitrina_web', true), v);
  if pg_temp.flr_activa(a, 'vitrina_web') is distinct from true then raise exception 'R4: no encendió vitrina_web'; end if;
  v := pg_temp.flr_nueva('R4 encender sin fila', pg_temp.flr_cambiar(config, a, v, 'aduana', true), v);
  if pg_temp.flr_activa(a, 'aduana') is distinct from true then raise exception 'R4: no insertó aduana'; end if;
  -- Apagar sin fila tampoco escribe, pero mueve la versión.
  delete from public.flujos_reglas where flujo_id = a and regla = 'pagos';
  v := pg_temp.flr_version(a);
  v := pg_temp.flr_nueva('R4 apagar sin fila', pg_temp.flr_cambiar(config, a, v, 'pagos', false), v);
  if exists (select 1 from public.flujos_reglas where flujo_id = a and regla = 'pagos') then raise exception 'R4: apagar sin fila la insertó'; end if;

  -- Transporte no tiene uso que bloquee, aunque el flujo tenga de todo.
  f := pg_temp.flr_fase(a, 'FR todo', 10);
  update public.fases set permite_aduana = true, publica_web = true, es_logistica = true where id = f;
  fb := pg_temp.flr_fase(rep, 'FR de repuestos', 1000);
  insert into public.fases_requisitos (fase_id, tipo, espera_fase_id, espera_ambito) values (f, 'espera', fb, 'hijos') returning id into q;
  perform pg_temp.flr_es('R4 transporte', pg_temp.flr_impacto(config, a, 'transporte'), '{"bloquea": false, "fases": [], "requisitos": []}');

  -- «Esperas» ya apagada con un requisito vivo (lo que dejaba la base de antes del 5.10, que no miraba las esperas al apagar):
  -- el impacto no bloquea y apagarla otra vez pasa.
  alter table public.flujos_reglas disable trigger trg_flujo_regla_apagar_validar;
  update public.flujos_reglas set activa = false where flujo_id = a and regla = 'esperas';
  alter table public.flujos_reglas enable trigger trg_flujo_regla_apagar_validar;
  perform pg_temp.flr_es('R4 ya apagada', pg_temp.flr_impacto(config, a, 'esperas'), jsonb_build_object('bloquea', false, 'fases', '[]'::jsonb,
    'requisitos', jsonb_build_array(jsonb_build_object('id', q, 'fase', f, 'fase_nombre', 'FR todo'))));
  v := pg_temp.flr_version(a);
  perform pg_temp.flr_nueva('R4 apagar ya apagada', pg_temp.flr_cambiar(config, a, v, 'esperas', false), v);
  if pg_temp.flr_activa(a, 'esperas') is distinct from false then raise exception 'R4: apagar otra vez cambió la fila'; end if;
end $$;
rollback;

-- @test reglas: catálogo por ámbito y forma dan 22023 con su hint (R5)
begin;
do $$
declare
  a uuid := pg_temp.flr_flujo(); rep uuid := (select id from public.flujos where ambito = 'repuestos');
  config uuid := pg_temp.flr_persona(array['flujos.configurar', 'repuestos.configurar']); x text; v timestamptz;
begin
  foreach x in array array['aduana', 'vitrina_web', 'portal_cliente'] loop
    perform pg_temp.flr_da_error('R5 ' || x || ' en repuestos', pg_temp.flr_cambiar(config, rep, pg_temp.flr_version(rep), x, true), '22023', 'regla');
    if exists (select 1 from public.flujos_reglas where flujo_id = rep and regla = x) then raise exception 'R5: escribió % en repuestos', x; end if;
  end loop;
  perform pg_temp.flr_da_error('R5 xyz cambia', pg_temp.flr_cambiar(config, a, pg_temp.flr_version(a), 'xyz', true), '22023', 'regla');
  perform pg_temp.flr_da_error('R5 nula cambia', pg_temp.flr_cambiar(config, a, pg_temp.flr_version(a), null, true), '22023', 'regla');
  perform pg_temp.flr_da_error('R5 xyz impacto', pg_temp.flr_impacto(config, a, 'xyz'), '22023', 'regla');
  perform pg_temp.flr_da_error('R5 activa nula', pg_temp.flr_cambiar(config, a, pg_temp.flr_version(a), 'gastos', null), '22023', 'activa');
  -- Apagar no mira el catálogo: limpia una fila heredada.
  alter table public.flujos_reglas disable trigger trg_flujo_regla_apagar_validar;
  insert into public.flujos_reglas (flujo_id, regla, activa) values (rep, 'aduana', true);
  alter table public.flujos_reglas enable trigger trg_flujo_regla_apagar_validar;
  v := pg_temp.flr_version(rep);
  perform pg_temp.flr_nueva('R5 apagar heredada', pg_temp.flr_cambiar(config, rep, v, 'aduana', false), v);
  if pg_temp.flr_activa(rep, 'aduana') is distinct from false then raise exception 'R5: no apagó la heredada'; end if;
end $$;
rollback;

-- @test reglas: dos cambios con la misma versión, el segundo PT409 y no escribe (R6)
begin;
do $$
declare
  a uuid := pg_temp.flr_flujo(); config uuid := pg_temp.flr_persona(array['flujos.configurar']); v timestamptz := pg_temp.flr_version(a); v2 timestamptz;
begin
  v2 := pg_temp.flr_nueva('R6 primero', pg_temp.flr_cambiar(config, a, v, 'gastos', false), v);
  perform pg_temp.flr_da_error('R6 segundo', pg_temp.flr_cambiar(config, a, v, 'pagos', false), 'PT409');
  if pg_temp.flr_activa(a, 'pagos') is distinct from true or pg_temp.flr_version(a) <> v2 then raise exception 'R6: el segundo escribió'; end if;
end $$;
rollback;

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
