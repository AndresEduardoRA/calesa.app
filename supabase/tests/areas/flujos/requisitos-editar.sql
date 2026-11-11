-- Guardar, mover y eliminar requisitos de fase por RPC (paso 5.07-1), con la versión del flujo. No depende de otro archivo
-- (`SOLO=humo.sql,areas/flujos/requisitos-editar.sql`). Cada bloque abre su transacción y la revierte. Crear y permisos: `requisitos.sql`.
--
-- Qué asegura:
--   E1. `requisito_guardar` aplica notas, archivos, formatos y bloqueante y mueve la versión; una clave de otro tipo, max < min, un pct fuera de
--       rango, `{}` o la versión vieja fallan sin escribir.
--   E2. `requisito_mover` deja el tercero primero y renumera 10/20/30; después de sí mismo → 22023; ancla de otra fase → PT409; con una espera
--       cuya regla se apagó después, mover y volverla bloqueante siguen.
--   E3. `requisito_eliminar` borra y mueve la versión; otra vez → PT409; con la versión vieja → PT409.
--   E4. Un UPDATE que cambia `fase_id` (sólo service_role o postgres) revalida todo: la revalidación parcial de D7 es estrecha.

create or replace function pg_temp.re_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('re_' || substr(v_id::text, 1, 8), 'RE ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.re_asesor() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select v_id, id, true from public.roles where clave = 'asesor';
  return v_id;
end $f$;

-- Un origen nuevo (su flujo de vehículos lo crea `origen_crear_flujo`, con la regla `esperas` encendida); devuelve el id del flujo.
create or replace function pg_temp.re_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('re_' || s, 'RE origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.re_repuestos() returns uuid language sql as $f$
  select id from public.flujos where ambito = 'repuestos';
$f$;

create or replace function pg_temp.re_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.re_version(p_flujo uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.re_fase(p_flujo uuid, p_nombre text, p_activa boolean default true) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, activa)
  values (p_flujo, p_nombre || ' ' || substr(gen_random_uuid()::text, 1, 6), 1000, p_activa) returning id;
$f$;

create or replace function pg_temp.re_tipo_doc() returns uuid language sql as $f$
  insert into public.tipos_documento (nombre, formatos) values ('RE doc ' || substr(gen_random_uuid()::text, 1, 8), '{application/pdf,image/png}')
  returning id;
$f$;

create or replace function pg_temp.re_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.re_crear(p_quien uuid, p_fase uuid, p_version timestamptz, p_tipo text, p_datos jsonb, p_id uuid default gen_random_uuid())
returns jsonb language sql as $f$
  select pg_temp.re_corre(p_quien, format('select jsonb_build_object(''version'', public.requisito_crear(%L, %L, %L, %L, %L::jsonb), ''id'', %L::uuid)',
    p_id, p_fase, p_version, p_tipo, p_datos, p_id));
$f$;

-- Falla si `r` no es el error esperado (estado y campo).
create or replace function pg_temp.re_falla(p_que text, p_r jsonb, p_estado text, p_hint text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.re_bien(p_que text, p_r jsonb) returns timestamptz language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'version' is null then raise exception '%: debía andar y dio %', p_que, p_r; end if;
  return (p_r ->> 'version')::timestamptz;
end $f$;

create or replace function pg_temp.re_guardar(p_quien uuid, p_req uuid, p_version timestamptz, p_cambios jsonb) returns jsonb language sql as $f$
  select pg_temp.re_corre(p_quien, format('select jsonb_build_object(''version'', public.requisito_guardar(%L, %L, %L::jsonb))', p_req, p_version, p_cambios));
$f$;

create or replace function pg_temp.re_mover(p_quien uuid, p_req uuid, p_version timestamptz, p_despues_de uuid default null) returns jsonb language sql as $f$
  select pg_temp.re_corre(p_quien, format('select jsonb_build_object(''version'', public.requisito_mover(%L, %L, %L))', p_req, p_version, p_despues_de));
$f$;

create or replace function pg_temp.re_orden(p_fase uuid) returns uuid[] language sql as $f$
  select array_agg(id order by orden) from public.fases_requisitos where fase_id = p_fase;
$f$;

-- @test requisitos: requisito_guardar aplica lo que llega por tipo y mueve la versión; lo inválido o la versión vieja fallan sin escribir (E1)
begin;
do $$
declare
  a uuid := pg_temp.re_flujo(); f uuid := pg_temp.re_fase(a, 'RE fase'); td uuid := pg_temp.re_tipo_doc();
  config uuid := pg_temp.re_persona(array['flujos.configurar@' || pg_temp.re_origen_de(a)]);
  v0 timestamptz := pg_temp.re_version(a); v timestamptz; d uuid; p uuid; x jsonb;
begin
  d := (pg_temp.re_crear(config, f, v0, 'documento', jsonb_build_object('tipo_documento_id', td)) ->> 'id')::uuid;
  v := pg_temp.re_version(a);
  p := (pg_temp.re_crear(config, f, v, 'dato', '{"clave_dato": "pagos.umbral_pct", "config": {"pct": 30}}') ->> 'id')::uuid;
  v0 := pg_temp.re_version(a);
  v := pg_temp.re_bien('E1 documento', pg_temp.re_guardar(config, d, v0,
    '{"notas": "dos hojas", "min_archivos": 2, "max_archivos": 3, "formatos": ["image/png"], "bloqueante": true}'));
  if v <= v0 or v is distinct from pg_temp.re_version(a) then raise exception 'E1: la versión debía avanzar y ser la del flujo'; end if;
  select to_jsonb(r) into x from public.fases_requisitos r where id = d;
  if x -> 'notas' <> '"dos hojas"' or x -> 'min_archivos' <> '2' or x -> 'max_archivos' <> '3' or x -> 'formatos' <> '["image/png"]' or x -> 'bloqueante' <> 'true' then
    raise exception 'E1: el documento debía quedar con lo guardado y quedó %', x;
  end if;
  v := pg_temp.re_bien('E1 config', pg_temp.re_guardar(config, p, v, '{"config": {"pct": 50}}'));
  if (select r.config from public.fases_requisitos r where r.id = p) <> '{"pct": 50}' then raise exception 'E1: config debía quedar en 50'; end if;
  perform pg_temp.re_falla('E1 de otro tipo', pg_temp.re_guardar(config, p, v, '{"min_archivos": 1}'), '22023', 'min_archivos');
  perform pg_temp.re_falla('E1 max < min', pg_temp.re_guardar(config, d, v, '{"max_archivos": 1}'), '22023', 'max_archivos');
  perform pg_temp.re_falla('E1 pct', pg_temp.re_guardar(config, p, v, '{"config": {"pct": 120}}'), '22023', 'config');
  perform pg_temp.re_falla('E1 vacío', pg_temp.re_guardar(config, d, v, '{}'), '22023', null);
  perform pg_temp.re_falla('E1 notas largas', pg_temp.re_guardar(config, d, v, jsonb_build_object('notas', repeat('x', 501))), '22023', 'notas');
  perform pg_temp.re_falla('E1 vieja', pg_temp.re_guardar(config, d, v0, '{"notas": "otra"}'), 'PT409', null);
  perform pg_temp.re_falla('E1 inexistente', pg_temp.re_guardar(config, gen_random_uuid(), v, '{"notas": "otra"}'), 'PT409', null);
  if (select notas || max_archivos from public.fases_requisitos where id = d) <> 'dos hojas3' or pg_temp.re_version(a) <> v then
    raise exception 'E1: lo que falla no debía escribir ni mover la versión';
  end if;
end $$;
rollback;

-- @test requisitos: requisito_mover renumera la fase; después de sí mismo o con ancla de otra fase falla; una espera vieja no lo frena (E2)
begin;
do $$
declare
  a uuid := pg_temp.re_flujo(); f uuid := pg_temp.re_fase(a, 'RE fase'); g uuid := pg_temp.re_fase(a, 'RE otra');
  fr uuid := pg_temp.re_fase(pg_temp.re_repuestos(), 'RE rep');
  config uuid := pg_temp.re_persona(array['flujos.configurar@' || pg_temp.re_origen_de(a)]);
  v timestamptz := pg_temp.re_version(a); uno uuid; dos uuid; tres uuid; otro uuid;
begin
  uno := (pg_temp.re_crear(config, f, v, 'dato', '{"clave_dato": "vehiculo.vin"}') ->> 'id')::uuid;
  dos := (pg_temp.re_crear(config, f, pg_temp.re_version(a), 'dato', '{"clave_dato": "vehiculo.lead"}') ->> 'id')::uuid;
  tres := (pg_temp.re_crear(config, f, pg_temp.re_version(a), 'espera', jsonb_build_object('espera_fase_id', fr)) ->> 'id')::uuid;
  otro := (pg_temp.re_crear(config, g, pg_temp.re_version(a), 'dato', '{"clave_dato": "vehiculo.vin"}') ->> 'id')::uuid;
  v := pg_temp.re_bien('E2 primero', pg_temp.re_mover(config, tres, pg_temp.re_version(a)));
  if pg_temp.re_orden(f) is distinct from array[tres, uno, dos]
     or (select array_agg(orden order by orden) from public.fases_requisitos where fase_id = f) <> array[10, 20, 30]::smallint[] then
    raise exception 'E2: debía quedar tres, uno, dos en 10/20/30';
  end if;
  v := pg_temp.re_bien('E2 tras dos', pg_temp.re_mover(config, tres, v, dos));
  if pg_temp.re_orden(f) is distinct from array[uno, dos, tres] then raise exception 'E2: tres debía quedar tras dos'; end if;
  perform pg_temp.re_falla('E2 sí mismo', pg_temp.re_mover(config, uno, v, uno), '22023', 'despues_de');
  perform pg_temp.re_falla('E2 otra fase', pg_temp.re_mover(config, uno, v, otro), 'PT409', null);
  perform pg_temp.re_falla('E2 vieja', pg_temp.re_mover(config, uno, pg_temp.re_version(a) - interval '1 second'), 'PT409', null);
  -- La regla «esperas» se apaga con la espera ya creada (el trigger de las reglas no las cuenta): mover y volverla bloqueante siguen.
  update public.flujos_reglas set activa = false where flujo_id = a and regla = 'esperas';
  v := pg_temp.re_bien('E2 espera vieja, mover', pg_temp.re_mover(config, tres, v));
  v := pg_temp.re_bien('E2 espera vieja, bloqueante', pg_temp.re_guardar(config, tres, v, '{"bloqueante": true}'));
  if pg_temp.re_orden(f) is distinct from array[tres, uno, dos] then raise exception 'E2: la espera vieja debía moverse'; end if;
end $$;
rollback;

-- @test requisitos: requisito_eliminar borra y mueve la versión; otra vez o con la versión vieja da PT409 (E3)
begin;
do $$
declare
  a uuid := pg_temp.re_flujo(); f uuid := pg_temp.re_fase(a, 'RE fase');
  config uuid := pg_temp.re_persona(array['flujos.configurar@' || pg_temp.re_origen_de(a)]);
  v0 timestamptz; v timestamptz; uno uuid; dos uuid;
begin
  uno := (pg_temp.re_crear(config, f, pg_temp.re_version(a), 'dato', '{"clave_dato": "vehiculo.vin"}') ->> 'id')::uuid;
  dos := (pg_temp.re_crear(config, f, pg_temp.re_version(a), 'dato', '{"clave_dato": "vehiculo.lead"}') ->> 'id')::uuid;
  v0 := pg_temp.re_version(a);
  v := pg_temp.re_bien('E3 borrar', pg_temp.re_corre(config, format('select jsonb_build_object(''version'', public.requisito_eliminar(%L, %L))', uno, v0)));
  if v <= v0 or exists (select 1 from public.fases_requisitos where id = uno) then raise exception 'E3: debía borrar y mover la versión'; end if;
  perform pg_temp.re_falla('E3 otra vez', pg_temp.re_corre(config, format('select to_jsonb(public.requisito_eliminar(%L, %L))', uno, v)), 'PT409', null);
  perform pg_temp.re_falla('E3 vieja', pg_temp.re_corre(config, format('select to_jsonb(public.requisito_eliminar(%L, %L))', dos, v0)), 'PT409', null);
  if not exists (select 1 from public.fases_requisitos where id = dos) then raise exception 'E3: con la versión vieja no debía borrar'; end if;
end $$;
rollback;

-- @test requisitos: cambiar fase_id por fuera de las RPC revalida la clave y la espera aunque nada más cambie (E4)
begin;
do $$
declare
  a uuid := pg_temp.re_flujo(); b uuid := pg_temp.re_flujo(); f uuid := pg_temp.re_fase(a, 'RE fase'); fb uuid := pg_temp.re_fase(b, 'RE b');
  fr uuid := pg_temp.re_fase(pg_temp.re_repuestos(), 'RE rep'); fr2 uuid := pg_temp.re_fase(pg_temp.re_repuestos(), 'RE rep 2');
  dato uuid; espera uuid; v_e text; v_h text;
begin
  insert into public.fases_requisitos (fase_id, tipo, clave_dato) values (f, 'dato', 'vehiculo.vin') returning id into dato;
  insert into public.fases_requisitos (fase_id, tipo, espera_fase_id, espera_ambito) values (f, 'espera', fr, 'hijos') returning id into espera;
  begin
    update public.fases_requisitos set fase_id = fr2 where id = dato;
    raise exception 'E4: el dato de vehículos no debía pasar a una fase de repuestos';
  exception when sqlstate '22023' then
    get stacked diagnostics v_h = pg_exception_hint;
    if v_h is distinct from 'clave_dato' then raise exception 'E4: el hint debía ser clave_dato y fue %', v_h; end if;
  end;
  update public.flujos_reglas set activa = false where flujo_id = b and regla = 'esperas';
  begin
    update public.fases_requisitos set fase_id = fb where id = espera;
    raise exception 'E4: la espera no debía pasar a un flujo con las esperas apagadas';
  exception when sqlstate '23514' then
    get stacked diagnostics v_h = pg_exception_hint;
    if v_h is distinct from 'espera_fase_id' then raise exception 'E4: el hint debía ser espera_fase_id y fue %', v_h; end if;
  end;
end $$;
rollback;
