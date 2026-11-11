-- La base de «Transiciones» y de quién mueve (paso 5.05). No depende de otro archivo (`SOLO=humo.sql,areas/flujos/transiciones.sql`). Cada bloque
-- abre su transacción y la revierte. Forma y bordes: `transiciones-datos.sql`; la carrera del candado del flujo: `carreras.mjs` (K1, del 5.01).
--
-- Qué asegura:
--   T1. El asesor y quien configura OTRO origen reciben 42501 en las cinco RPC sin escribir ni mover la versión; `repuestos.configurar` crea en
--       repuestos y recibe 42501 en A.
--   T2. Versión vieja → PT409 en las cinco sin escribir; una transición borrada → PT409 en guardar, eliminar y poner sus roles.
--   T3. Fases de flujos distintos → 22023 con hint (de_fase_id / a_fase_id); destino jubilado → 22023 hint a_fase_id; nada se escribe.
--   T4. (de, a) repetida → 23505 «Ya hay una transición de «X» a «Y».» hint a_fase_id; id repetido → 23505 hint id.
--   T5. Quién mueve: tras `fase_roles_poner` con un rol que la persona no tiene, `previsualizar_cambio_fase` dice «Tu rol no puede mover a esta
--       fase.»; la lista de la transición manda sobre la de la fase; vacías, cualquiera con `flujos.mover`.
--   T6 (la actividad del cambio de roles): `transiciones-datos.sql`, D-5.
--   T7. Escritura directa como authenticated → 42501 en las tres tablas y no quedan policies de escritura.

-- La primera cuenta de una base vacía queda dueña (con `SOLO=` sin `humo.sql`): una de relleno antes, para que ninguna de la prueba lo sea.
create or replace function pg_temp.tr_sin_duena_de_prueba() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-tr@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

create or replace function pg_temp.tr_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.tr_sin_duena_de_prueba();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('tr_' || substr(v_id::text, 1, 8), 'TR ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.tr_rol_de(p_persona uuid) returns uuid language sql as $f$
  select rol_id from public.usuarios_roles where usuario_id = p_persona and es_principal;
$f$;

create or replace function pg_temp.tr_asesor() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  perform pg_temp.tr_sin_duena_de_prueba();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select v_id, id, true from public.roles where clave = 'asesor';
  return v_id;
end $f$;

create or replace function pg_temp.tr_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('tr_' || s, 'TR origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.tr_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.tr_version(p_flujo uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.tr_fase(p_flujo uuid, p_nombre text, p_orden int, p_activa boolean default true) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, activa) values (p_flujo, p_nombre, p_orden, p_activa) returning id;
$f$;

create or replace function pg_temp.tr_transicion(p_flujo uuid, p_de uuid, p_a uuid) returns uuid language sql as $f$
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values (p_flujo, p_de, p_a) returning id;
$f$;

create or replace function pg_temp.tr_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.tr_crear(p_quien uuid, p_id uuid, p_flujo uuid, p_version timestamptz, p_de uuid, p_a uuid) returns jsonb language sql as $f$
  select pg_temp.tr_corre(p_quien, format('select jsonb_build_object(''version'', public.transicion_crear(%L, %L, %L, %L, %L, null, false))',
    p_id, p_flujo, p_version, p_de, p_a));
$f$;

create or replace function pg_temp.tr_guardar(p_quien uuid, p_t uuid, p_version timestamptz, p_cambios jsonb) returns jsonb language sql as $f$
  select pg_temp.tr_corre(p_quien, format('select jsonb_build_object(''version'', public.transicion_guardar(%L, %L, %L::jsonb))', p_t, p_version, p_cambios));
$f$;

create or replace function pg_temp.tr_eliminar(p_quien uuid, p_t uuid, p_version timestamptz) returns jsonb language sql as $f$
  select pg_temp.tr_corre(p_quien, format('select jsonb_build_object(''version'', public.transicion_eliminar(%L, %L))', p_t, p_version));
$f$;

create or replace function pg_temp.tr_fase_roles(p_quien uuid, p_fase uuid, p_version timestamptz, p_roles uuid[]) returns jsonb language sql as $f$
  select pg_temp.tr_corre(p_quien, format('select jsonb_build_object(''version'', public.fase_roles_poner(%L, %L, %L::uuid[]))', p_fase, p_version, p_roles));
$f$;

create or replace function pg_temp.tr_transicion_roles(p_quien uuid, p_t uuid, p_version timestamptz, p_roles uuid[]) returns jsonb language sql as $f$
  select pg_temp.tr_corre(p_quien, format('select jsonb_build_object(''version'', public.transicion_roles_poner(%L, %L, %L::uuid[]))', p_t, p_version, p_roles));
$f$;

-- Da ese error: sqlstate, mensaje y hint exactos (hint null = sin hint).
create or replace function pg_temp.tr_es(p_que text, p_r jsonb, p_estado text, p_mensaje text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje or p_r ->> 'hint' is distinct from p_hint then
    raise exception '%: debía dar % «%» (hint %) y dio %', p_que, p_estado, p_mensaje, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.tr_pasa(p_que text, p_r jsonb) returns timestamptz language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'version' is null then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return (p_r ->> 'version')::timestamptz;
end $f$;

-- Lo que se puede escribir del flujo, en un jsonb comparable: transiciones y las dos listas de roles.
create or replace function pg_temp.tr_foto(p_flujo uuid) returns jsonb language sql as $f$
  select jsonb_build_object(
    'transiciones', (select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]') from public.fases_transiciones t where t.flujo_id = p_flujo),
    'fases_roles', (select coalesce(jsonb_agg(to_jsonb(r) order by r.fase_id, r.rol_id), '[]')
                    from public.fases_roles r join public.fases f on f.id = r.fase_id where f.flujo_id = p_flujo),
    'transiciones_roles', (select coalesce(jsonb_agg(to_jsonb(r) order by r.transicion_id, r.rol_id), '[]')
                           from public.fases_transiciones_roles r join public.fases_transiciones t on t.id = r.transicion_id where t.flujo_id = p_flujo));
$f$;

-- @test transiciones: las cinco RPC dan 42501 al asesor y a quien configura otro origen; repuestos.configurar crea sólo en repuestos (T1)
begin;
do $$
declare
  a uuid := pg_temp.tr_flujo(); b uuid := pg_temp.tr_flujo(); rep uuid := (select id from public.flujos where ambito = 'repuestos');
  config_b uuid := pg_temp.tr_persona(array['flujos.configurar@' || pg_temp.tr_origen_de(b)]);
  config_rep uuid := pg_temp.tr_persona(array['repuestos.configurar']);
  asesor uuid := pg_temp.tr_asesor();
  f uuid := pg_temp.tr_fase(a, 'TR uno', 10); g uuid := pg_temp.tr_fase(a, 'TR dos', 20); h uuid := pg_temp.tr_fase(a, 'TR tres', 30);
  fr uuid := pg_temp.tr_fase(rep, 'TR rep uno', 1000); gr uuid := pg_temp.tr_fase(rep, 'TR rep dos', 1010);
  t uuid := pg_temp.tr_transicion(a, f, g); rol uuid := pg_temp.tr_rol_de(config_b);
  va timestamptz := pg_temp.tr_version(a); foto jsonb := pg_temp.tr_foto(a); quien uuid; nombre text;
begin
  foreach quien in array array[asesor, config_b, config_rep] loop
    nombre := case quien when asesor then 'asesor' when config_b then 'otro origen' else 'repuestos en A' end;
    perform pg_temp.tr_es('T1 crear ' || nombre, pg_temp.tr_crear(quien, gen_random_uuid(), a, va, g, h), '42501', 'No tienes permiso para configurar este flujo.');
    perform pg_temp.tr_es('T1 guardar ' || nombre, pg_temp.tr_guardar(quien, t, va, '{"accion": "TR"}'), '42501', 'No tienes permiso para configurar este flujo.');
    perform pg_temp.tr_es('T1 eliminar ' || nombre, pg_temp.tr_eliminar(quien, t, va), '42501', 'No tienes permiso para configurar este flujo.');
    perform pg_temp.tr_es('T1 roles de fase ' || nombre, pg_temp.tr_fase_roles(quien, g, va, array[rol]), '42501', 'No tienes permiso para configurar este flujo.');
    perform pg_temp.tr_es('T1 roles de transición ' || nombre, pg_temp.tr_transicion_roles(quien, t, va, array[rol]), '42501',
      'No tienes permiso para configurar este flujo.');
  end loop;
  perform pg_temp.tr_es('T1 permiso antes que la lista', pg_temp.tr_fase_roles(asesor, g, va, array[gen_random_uuid()]), '42501', 'No tienes permiso para configurar este flujo.');
  if pg_temp.tr_foto(a) is distinct from foto or pg_temp.tr_version(a) is distinct from va then
    raise exception 'T1: un 42501 escribió o movió la versión';
  end if;
  perform pg_temp.tr_pasa('T1 repuestos crea en repuestos', pg_temp.tr_crear(config_rep, gen_random_uuid(), rep, pg_temp.tr_version(rep), fr, gr));
  if not exists (select 1 from public.fases_transiciones where de_fase_id = fr and a_fase_id = gr) then
    raise exception 'T1: repuestos.configurar no creó la transición en repuestos';
  end if;
end $$;
rollback;

-- @test transiciones: con la versión vieja las cinco dan PT409 sin escribir; una transición borrada da PT409 (T2)
begin;
do $$
declare
  a uuid := pg_temp.tr_flujo(); config uuid := pg_temp.tr_persona(array['flujos.configurar']);
  f uuid := pg_temp.tr_fase(a, 'TR uno', 10); g uuid := pg_temp.tr_fase(a, 'TR dos', 20); h uuid := pg_temp.tr_fase(a, 'TR tres', 30);
  t uuid := pg_temp.tr_transicion(a, f, g); rol uuid := pg_temp.tr_rol_de(config);
  vieja timestamptz := pg_temp.tr_version(a); foto jsonb; v timestamptz; c constant text := 'Otra persona cambió este flujo mientras lo editabas.';
  borrada constant text := 'Esta transición ya no existe. Recarga e intenta de nuevo.';
begin
  v := public._flujo_tocar(a);
  foto := pg_temp.tr_foto(a);
  perform pg_temp.tr_es('T2 crear', pg_temp.tr_crear(config, gen_random_uuid(), a, vieja, g, h), 'PT409', c);
  perform pg_temp.tr_es('T2 guardar', pg_temp.tr_guardar(config, t, vieja, '{"accion": "TR"}'), 'PT409', c);
  perform pg_temp.tr_es('T2 eliminar', pg_temp.tr_eliminar(config, t, vieja), 'PT409', c);
  perform pg_temp.tr_es('T2 roles de fase', pg_temp.tr_fase_roles(config, g, vieja, array[rol]), 'PT409', c);
  perform pg_temp.tr_es('T2 roles de transición', pg_temp.tr_transicion_roles(config, t, vieja, array[rol]), 'PT409', c);
  if pg_temp.tr_foto(a) is distinct from foto or pg_temp.tr_version(a) is distinct from v then
    raise exception 'T2: un PT409 escribió o movió la versión';
  end if;
  v := pg_temp.tr_pasa('T2 eliminar con la buena', pg_temp.tr_eliminar(config, t, v));
  perform pg_temp.tr_es('T2 guardar borrada', pg_temp.tr_guardar(config, t, v, '{"accion": "TR"}'), 'PT409', borrada);
  perform pg_temp.tr_es('T2 eliminar borrada', pg_temp.tr_eliminar(config, t, v), 'PT409', borrada);
  perform pg_temp.tr_es('T2 roles de borrada', pg_temp.tr_transicion_roles(config, t, v, array[rol]), 'PT409', borrada);
  perform pg_temp.tr_es('T2 roles de fase inexistente', pg_temp.tr_fase_roles(config, gen_random_uuid(), v, array[rol]), 'PT409',
    'Esta fase ya no existe. Recarga e intenta de nuevo.');
  perform pg_temp.tr_es('T2 crear con fase inexistente', pg_temp.tr_crear(config, gen_random_uuid(), a, v, f, gen_random_uuid()), 'PT409',
    'Esa fase ya no existe. Recarga e intenta de nuevo.');
end $$;
rollback;

-- @test transiciones: fases de flujos distintos y destino jubilado dan 22023 con hint y nada se escribe (T3)
begin;
do $$
declare
  a uuid := pg_temp.tr_flujo(); b uuid := pg_temp.tr_flujo(); config uuid := pg_temp.tr_persona(array['flujos.configurar']);
  fa uuid := pg_temp.tr_fase(a, 'TR en A', 10); fb uuid := pg_temp.tr_fase(b, 'TR en B', 10);
  jubilada uuid := pg_temp.tr_fase(a, 'TR jubilada', 20, false);
  v timestamptz := pg_temp.tr_version(a);
begin
  perform pg_temp.tr_es('T3 destino de otro flujo', pg_temp.tr_crear(config, gen_random_uuid(), a, v, fa, fb), '22023',
    'La fase «TR en B» no es de este flujo.', 'a_fase_id');
  perform pg_temp.tr_es('T3 origen de otro flujo', pg_temp.tr_crear(config, gen_random_uuid(), a, v, fb, fa), '22023',
    'La fase «TR en B» no es de este flujo.', 'de_fase_id');
  perform pg_temp.tr_es('T3 destino jubilado', pg_temp.tr_crear(config, gen_random_uuid(), a, v, fa, jubilada), '22023',
    'La fase «TR jubilada» está jubilada: no puede ser destino.', 'a_fase_id');
  if exists (select 1 from public.fases_transiciones where flujo_id in (a, b)) or pg_temp.tr_version(a) is distinct from v then
    raise exception 'T3: un 22023 escribió o movió la versión';
  end if;
end $$;
rollback;

-- @test transiciones: una transición repetida da 23505 humano, por (de, a) y por id (T4)
begin;
do $$
declare
  a uuid := pg_temp.tr_flujo(); config uuid := pg_temp.tr_persona(array['flujos.configurar']);
  f uuid := pg_temp.tr_fase(a, 'TR uno', 10); g uuid := pg_temp.tr_fase(a, 'TR dos', 20); id1 uuid := gen_random_uuid(); v timestamptz;
begin
  v := pg_temp.tr_pasa('T4 primera', pg_temp.tr_crear(config, id1, a, pg_temp.tr_version(a), f, g));
  perform pg_temp.tr_es('T4 (de, a) repetida', pg_temp.tr_crear(config, gen_random_uuid(), a, v, f, g), '23505',
    'Ya hay una transición de «TR uno» a «TR dos».', 'a_fase_id');
  perform pg_temp.tr_es('T4 id repetido', pg_temp.tr_crear(config, id1, a, v, g, f), '23505', 'Esa transición ya existe.', 'id');
  if (select count(*) from public.fases_transiciones where flujo_id = a) <> 1 or pg_temp.tr_version(a) is distinct from v then
    raise exception 'T4: un 23505 escribió o movió la versión';
  end if;
end $$;
rollback;

-- @test transiciones: con roles en la fase manda esa lista, la de la transición manda sobre ella y vacías mueve cualquiera con flujos.mover (T5)
begin;
do $$
declare
  a uuid := pg_temp.tr_flujo(); config uuid := pg_temp.tr_persona(array['flujos.configurar']);
  mueve uuid := pg_temp.tr_persona(array['logistica.ver', 'flujos.mover@' || pg_temp.tr_origen_de(a)]);
  otro uuid := pg_temp.tr_persona(array['logistica.ver']);
  f uuid := pg_temp.tr_fase(a, 'TR uno', 10); g uuid := pg_temp.tr_fase(a, 'TR dos', 20);
  t uuid := pg_temp.tr_transicion(a, f, g); veh uuid; v timestamptz := pg_temp.tr_version(a);
  motivo constant text := 'Tu rol no puede mover a esta fase.';
begin
  insert into public.vehiculos (origen_id, titulo, fase_id) values (pg_temp.tr_origen_de(a), 'TR vehículo', f) returning id into veh;
  if coalesce(pg_temp.tr_corre(mueve, format('select public.previsualizar_cambio_fase(%L, null, %L)', veh, g)) -> 'motivos' ? motivo, true) then
    raise exception 'T5: sin listas, quien tiene flujos.mover debía poder mover';
  end if;
  v := pg_temp.tr_pasa('T5 roles de la fase', pg_temp.tr_fase_roles(config, g, v, array[pg_temp.tr_rol_de(otro)]));
  if not coalesce(pg_temp.tr_corre(mueve, format('select public.previsualizar_cambio_fase(%L, null, %L)', veh, g)) -> 'motivos' ? motivo, false) then
    raise exception 'T5: con la fase limitada a otro rol, previsualizar_cambio_fase debía decir «%»', motivo;
  end if;
  v := pg_temp.tr_pasa('T5 roles de la transición', pg_temp.tr_transicion_roles(config, t, v, array[pg_temp.tr_rol_de(mueve)]));
  if coalesce(pg_temp.tr_corre(mueve, format('select public.previsualizar_cambio_fase(%L, null, %L)', veh, g)) -> 'motivos' ? motivo, true) then
    raise exception 'T5: la lista de la transición debía mandar sobre la de la fase';
  end if;
  v := pg_temp.tr_pasa('T5 transición vacía', pg_temp.tr_transicion_roles(config, t, v, '{}'));
  if not coalesce(pg_temp.tr_corre(mueve, format('select public.previsualizar_cambio_fase(%L, null, %L)', veh, g)) -> 'motivos' ? motivo, false) then
    raise exception 'T5: con la transición vacía debía volver a mandar la lista de la fase';
  end if;
  v := pg_temp.tr_pasa('T5 fase vacía', pg_temp.tr_fase_roles(config, g, v, '{}'));
  if coalesce(pg_temp.tr_corre(mueve, format('select public.previsualizar_cambio_fase(%L, null, %L)', veh, g)) -> 'motivos' ? motivo, true) then
    raise exception 'T5: con las dos listas vacías debía mover cualquiera con flujos.mover';
  end if;
end $$;
rollback;

-- @test transiciones: authenticated no escribe directo transiciones ni roles (42501) y no quedan policies de escritura (T7)
begin;
do $$
declare
  a uuid := pg_temp.tr_flujo(); config uuid := pg_temp.tr_persona(array['flujos.configurar@' || pg_temp.tr_origen_de(a)]);
  f uuid := pg_temp.tr_fase(a, 'TR uno', 10); g uuid := pg_temp.tr_fase(a, 'TR dos', 20); h uuid := pg_temp.tr_fase(a, 'TR tres', 30);
  t uuid := pg_temp.tr_transicion(a, f, g); rol uuid := pg_temp.tr_rol_de(config); foto jsonb; r jsonb; s text;
begin
  insert into public.fases_roles (fase_id, rol_id) values (g, rol);
  insert into public.fases_transiciones_roles (transicion_id, rol_id) values (t, rol);
  foto := pg_temp.tr_foto(a);
  foreach s in array array[
    format('insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values (%L, %L, %L)', a, g, h),
    format('update public.fases_transiciones set accion = ''TR'' where id = %L', t),
    format('delete from public.fases_transiciones where id = %L', t),
    format('insert into public.fases_roles (fase_id, rol_id) values (%L, %L)', h, rol),
    format('delete from public.fases_roles where fase_id = %L', g),
    format('insert into public.fases_transiciones_roles (transicion_id, rol_id) select id, %L from public.fases_transiciones where id = %L', rol, t),
    format('delete from public.fases_transiciones_roles where transicion_id = %L', t)] loop
    r := pg_temp.tr_corre(config, s);
    if r ->> 'error' is distinct from '42501' then raise exception 'T7: «%» debía dar 42501 y dio %', s, r; end if;
  end loop;
  if exists (select 1 from pg_policies where schemaname = 'public'
             and tablename in ('fases_transiciones', 'fases_roles', 'fases_transiciones_roles') and cmd <> 'SELECT') then
    raise exception 'T7: quedó una policy de escritura en transiciones o roles';
  end if;
  if pg_temp.tr_foto(a) is distinct from foto then raise exception 'T7: una escritura directa cambió algo'; end if;
end $$;
rollback;
