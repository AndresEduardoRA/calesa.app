-- El impacto de jubilar o eliminar una fase (paso 5.01-2): `fase_impacto()` y su regla `_fase_uso()`. No depende de otro archivo
-- (`SOLO=humo.sql,areas/flujos/fases-impacto.sql`). Cada bloque abre su transacción y la revierte. Eliminar: `fases-eliminar.sql`.
--
-- Qué asegura:
--   I1. El asesor y quien configura OTRO origen reciben 42501; `repuestos.configurar` lee el impacto en repuestos y no en A; `_fase_uso` no es de authenticated.
--   I2. Las claves exactas en cada caso: eliminar, jubilar por paradas (con la papelera) o por historial, bloqueada por esperas, por única inicial
--       o por ya jubilada; con 52 vehículos en la fase, `paradas` = 51; la única inicial con historial se jubila y lo dice.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (global) o 'clave@<origen>'.
create or replace function pg_temp.fi_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('fi_' || substr(v_id::text, 1, 8), 'FI ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.fi_asesor() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select v_id, id, true from public.roles where clave = 'asesor';
  return v_id;
end $f$;

-- Un origen nuevo (su flujo, sin fases, lo crea `origen_crear_flujo`); devuelve el id del flujo.
create or replace function pg_temp.fi_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('fi_' || s, 'FI origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.fi_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.fi_version(p_flujo uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.flujos where id = p_flujo;
$f$;

-- Una fase escrita como `postgres`, con su orden.
create or replace function pg_temp.fi_fase(p_flujo uuid, p_nombre text, p_orden int, p_activa boolean default true) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, activa) values (p_flujo, p_nombre, p_orden, p_activa) returning id;
$f$;

create or replace function pg_temp.fi_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.fi_da_error(p_que text, p_r jsonb, p_estado text, p_mensaje text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje then
    raise exception '%: debía dar % «%» y dio %', p_que, p_estado, p_mensaje, p_r;
  end if;
end $f$;


create or replace function pg_temp.fi_impacto(p_quien uuid, p_fase uuid) returns jsonb language sql as $f$
  select pg_temp.fi_corre(p_quien, format('select public.fase_impacto(%L)', p_fase));
$f$;

-- Una unidad parada en la fase (o en la papelera), escrita como `postgres`; devuelve su id.
create or replace function pg_temp.fi_vehiculo(p_flujo uuid, p_fase uuid, p_en_papelera boolean default false) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, eliminado_en)
  values (pg_temp.fi_origen_de(p_flujo), 'FI vehículo', p_fase, case when p_en_papelera then now() end) returning id;
$f$;

create or replace function pg_temp.fi_es(p_que text, p_r jsonb, p_esperado jsonb) returns void language plpgsql as $f$
begin
  if p_r is distinct from p_esperado then raise exception '%: debía dar % y dio %', p_que, p_esperado, p_r; end if;
end $f$;

-- @test fases: fase_impacto da 42501 al asesor y a quien configura otro origen; repuestos.configurar lee sólo en repuestos (I1)
begin;
do $$
declare
  a uuid := pg_temp.fi_flujo(); b uuid := pg_temp.fi_flujo(); rep uuid := (select id from public.flujos where ambito = 'repuestos');
  config_b uuid := pg_temp.fi_persona(array['flujos.configurar@' || pg_temp.fi_origen_de(b)]);
  config_rep uuid := pg_temp.fi_persona(array['repuestos.configurar']);
  asesor uuid := pg_temp.fi_asesor();
  f uuid := pg_temp.fi_fase(a, 'FI uno', 10); fr uuid := pg_temp.fi_fase(rep, 'FI rep', 1000); r jsonb;
begin
  r := pg_temp.fi_impacto(asesor, f);
  perform pg_temp.fi_da_error('I1 asesor', r, '42501', 'No tienes permiso para configurar este flujo.');
  r := pg_temp.fi_impacto(config_b, f);
  perform pg_temp.fi_da_error('I1 otro origen', r, '42501', 'No tienes permiso para configurar este flujo.');
  r := pg_temp.fi_impacto(config_rep, f);
  perform pg_temp.fi_da_error('I1 repuestos en A', r, '42501', 'No tienes permiso para configurar este flujo.');
  r := pg_temp.fi_impacto(config_rep, fr);
  if r ? 'error' or r ->> 'accion' is distinct from 'eliminar' then raise exception 'I1: repuestos.configurar debía leer el impacto y dio %', r; end if;
  r := pg_temp.fi_impacto(config_b, gen_random_uuid());
  perform pg_temp.fi_da_error('I1 inexistente', r, 'PT409', 'Esta fase ya no existe. Recarga e intenta de nuevo.');
  if has_function_privilege('authenticated', 'public._fase_uso(uuid)', 'execute') or has_function_privilege('anon', 'public.fase_impacto(uuid)', 'execute') then
    raise exception 'I1: authenticated ejecuta _fase_uso o anon ejecuta fase_impacto';
  end if;
end $$;
rollback;

-- @test fases: fase_impacto da las claves exactas en cada caso y acota los conteos a 51 (I2)
begin;
do $$
declare
  a uuid := pg_temp.fi_flujo(); c uuid := pg_temp.fi_flujo();
  config uuid := pg_temp.fi_persona(array['flujos.configurar']);
  libre uuid := pg_temp.fi_fase(a, 'FI libre', 10); paradas uuid := pg_temp.fi_fase(a, 'FI paradas', 20);
  papelera uuid := pg_temp.fi_fase(a, 'FI papelera', 30); historial uuid := pg_temp.fi_fase(a, 'FI historial', 40);
  esperada uuid := pg_temp.fi_fase(a, 'FI esperada', 50); inicial uuid := pg_temp.fi_fase(a, 'FI inicial', 60);
  jubilada uuid := pg_temp.fi_fase(a, 'FI jubilada', 70, false); inicial_c uuid := pg_temp.fi_fase(c, 'FI inicial c', 10);
  fb uuid := pg_temp.fi_fase((select id from public.flujos where ambito = 'repuestos'), 'FI de repuestos', 1000); v uuid;
begin
  update public.fases set es_inicial = true where id in (inicial, inicial_c);
  insert into public.fases (flujo_id, nombre, es_inicial, activa) values (a, 'FI inicial jubilada', true, false);
  insert into public.vehiculos (origen_id, titulo, fase_id) select pg_temp.fi_origen_de(a), 'FI ' || g, paradas from generate_series(1, 52) g;
  perform pg_temp.fi_vehiculo(a, papelera, true);
  v := pg_temp.fi_vehiculo(a, libre);
  update public.vehiculos set fase_id = null where id = v;
  insert into public.historial_fases (flujo_id, vehiculo_id, a_fase_id) values (a, v, historial), (a, v, jubilada), (c, v, inicial_c);
  insert into public.fases_requisitos (fase_id, tipo, espera_fase_id, espera_ambito) values (fb, 'espera', esperada, 'padre');

  perform pg_temp.fi_es('I2 libre', pg_temp.fi_impacto(config, libre),
    '{"accion": "eliminar", "motivo": null, "paradas": 0, "hay_historial": false, "esperas": 0, "unica_inicial": false}');
  perform pg_temp.fi_es('I2 paradas', pg_temp.fi_impacto(config, paradas),
    '{"accion": "jubilar", "motivo": "paradas", "paradas": 51, "hay_historial": false, "esperas": 0, "unica_inicial": false}');
  perform pg_temp.fi_es('I2 papelera', pg_temp.fi_impacto(config, papelera),
    '{"accion": "jubilar", "motivo": "paradas", "paradas": 1, "hay_historial": false, "esperas": 0, "unica_inicial": false}');
  perform pg_temp.fi_es('I2 historial', pg_temp.fi_impacto(config, historial),
    '{"accion": "jubilar", "motivo": "historial", "paradas": 0, "hay_historial": true, "esperas": 0, "unica_inicial": false}');
  perform pg_temp.fi_es('I2 esperas', pg_temp.fi_impacto(config, esperada),
    '{"accion": "bloqueada", "motivo": "esperas", "paradas": 0, "hay_historial": false, "esperas": 1, "unica_inicial": false}');
  perform pg_temp.fi_es('I2 única inicial', pg_temp.fi_impacto(config, inicial),
    '{"accion": "bloqueada", "motivo": "unica_inicial", "paradas": 0, "hay_historial": false, "esperas": 0, "unica_inicial": true}');
  perform pg_temp.fi_es('I2 ya jubilada', pg_temp.fi_impacto(config, jubilada),
    '{"accion": "bloqueada", "motivo": "ya_jubilada", "paradas": 0, "hay_historial": true, "esperas": 0, "unica_inicial": false}');
  perform pg_temp.fi_es('I2 única inicial con historial', pg_temp.fi_impacto(config, inicial_c),
    '{"accion": "jubilar", "motivo": "historial", "paradas": 0, "hay_historial": true, "esperas": 0, "unica_inicial": true}');
end $$;
rollback;
