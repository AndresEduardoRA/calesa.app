-- Quién mueve de fase (paso 6.02-1): el acceso y los permisos de `cambiar_fase` y `previsualizar_cambio_fase`. No depende de otro archivo
-- (`SOLO=areas/mover/permisos.sql`). Cada bloque abre su transacción y la revierte. El candado y el conflicto: `mover.sql` y `carreras.mjs`.
--
-- Qué asegura:
--   P1. Con `logistica.ver` y sin `flujos.mover` del origen: 23514 con hint `rol`, y la vista previa `codigos = [rol]`; nada se escribe.
--   P2. Un rol fuera de `fases_roles` del destino: 23514 hint `rol`; con `flujos.mover.cualquiera` del origen mueve.
--   P3. Sin `logistica.ver` (también con la esperada vieja: no el PT409 con el nombre), una inexistente o una en la papelera: 42501 hint `acceso`
--       con el mismo texto, y la vista previa sin nada de la unidad.
--   P4. `logistica.ver` con alcance `propios`: la propia sí; la de otra persona, acceso.
--   P5. Un ítem de repuesto sin `repuestos.ver`: acceso (antes la vista previa del repuesto no miraba permiso); con `repuestos.ver` y
--       `repuestos.mover`, entra a la inicial.

-- La primera cuenta de una base vacía queda dueña (con `SOLO=` sin `humo.sql`): una de relleno antes, para que ninguna de la prueba lo sea.
create or replace function pg_temp.mp_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-mp@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio: cada concesión es `clave` o `clave@origen`, todas con el mismo alcance.
create or replace function pg_temp.mp_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.mp_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('mp_' || substr(v_id::text, 1, 8), 'mp ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.mp_rol_de(p_persona uuid) returns uuid language sql as $f$
  select rol_id from public.usuarios_roles where usuario_id = p_persona and es_principal;
$f$;

create or replace function pg_temp.mp_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('mp_' || s, 'mp origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.mp_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.mp_fase(p_flujo uuid, p_nombre text, p_orden int, p_inicial boolean default false) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (p_flujo, p_nombre, p_orden, p_inicial) returning id;
$f$;

create or replace function pg_temp.mp_transicion(p_flujo uuid, p_de uuid, p_a uuid, p_nota boolean default false) returns uuid language sql as $f$
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id, nota_obligatoria) values (p_flujo, p_de, p_a, p_nota) returning id;
$f$;

create or replace function pg_temp.mp_vehiculo(p_flujo uuid, p_fase uuid, p_creado_por uuid default null) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, creado_por) values (pg_temp.mp_origen_de(p_flujo), 'mp vehículo', p_fase, p_creado_por) returning id;
$f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.mp_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.mp_mover(p_quien uuid, p_v uuid, p_a uuid, p_esperada uuid, p_nota text default null) returns jsonb language sql as $f$
  select pg_temp.mp_corre(p_quien, format('select jsonb_build_object(''historial'', public.cambiar_fase(%L, null, %L, %L, %L))', p_v, p_a, p_nota, p_esperada));
$f$;

create or replace function pg_temp.mp_ver(p_quien uuid, p_v uuid, p_a uuid) returns jsonb language sql as $f$
  select pg_temp.mp_corre(p_quien, format('select public.previsualizar_cambio_fase(%L, null, %L)', p_v, p_a));
$f$;

-- Da ese error con ese hint (y ese mensaje, si se pide).
create or replace function pg_temp.mp_es(p_que text, p_r jsonb, p_estado text, p_hint text, p_mensaje text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint
     or (p_mensaje is not null and p_r ->> 'mensaje' is distinct from p_mensaje) then
    raise exception '%: debía dar % (hint %) «%» y dio %', p_que, p_estado, p_hint, coalesce(p_mensaje, '…'), p_r;
  end if;
end $f$;

create or replace function pg_temp.mp_pasa(p_que text, p_r jsonb) returns bigint language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'historial' is null then raise exception '%: debía mover y dio %', p_que, p_r; end if;
  return (p_r ->> 'historial')::bigint;
end $f$;

create or replace function pg_temp.mp_fase_de(p_v uuid) returns uuid language sql as $f$
  select fase_id from public.vehiculos where id = p_v;
$f$;

create or replace function pg_temp.mp_historial(p_v uuid) returns int language sql as $f$
  select count(*)::int from public.historial_fases where vehiculo_id = p_v;
$f$;

-- @test mover: con logistica.ver y sin flujos.mover del origen no mueve (23514, hint rol) y no escribe nada (P1)
begin;
do $$
declare
  a uuid := pg_temp.mp_flujo(); f uuid := pg_temp.mp_fase(a, 'mp uno', 10, true); g uuid := pg_temp.mp_fase(a, 'mp dos', 20);
  t uuid := pg_temp.mp_transicion(a, f, g); v uuid := pg_temp.mp_vehiculo(a, f);
  otro uuid := pg_temp.mp_flujo();
  sin_mover uuid := pg_temp.mp_persona(array['logistica.ver', 'flujos.mover@' || pg_temp.mp_origen_de(otro)]);
  r jsonb;
begin
  r := pg_temp.mp_ver(sin_mover, v, g);
  if (r ->> 'ok')::boolean is distinct from false or r -> 'codigos' is distinct from '["rol"]'::jsonb then
    raise exception 'P1: la vista previa debía decir codigos = [rol] y dio %', r;
  end if;
  perform pg_temp.mp_es('P1 sin flujos.mover del origen', pg_temp.mp_mover(sin_mover, v, g, f), '23514', 'rol');
  if pg_temp.mp_fase_de(v) is distinct from f or pg_temp.mp_historial(v) <> 0 then raise exception 'P1: un rechazo movió o escribió historial'; end if;
end $$;
rollback;

-- @test mover: un rol fuera de fases_roles no mueve (hint rol); con flujos.mover.cualquiera del origen sí (P2)
begin;
do $$
declare
  a uuid := pg_temp.mp_flujo(); o uuid := pg_temp.mp_origen_de(a);
  f uuid := pg_temp.mp_fase(a, 'mp uno', 10, true); g uuid := pg_temp.mp_fase(a, 'mp dos', 20);
  t uuid := pg_temp.mp_transicion(a, f, g); v uuid := pg_temp.mp_vehiculo(a, f);
  mueve uuid := pg_temp.mp_persona(array['logistica.ver', 'flujos.mover@' || o]);
  cualquiera uuid := pg_temp.mp_persona(array['logistica.ver', 'flujos.mover@' || o, 'flujos.mover.cualquiera@' || o]);
  dueno_de_la_fase uuid := pg_temp.mp_persona(array['logistica.ver']);
begin
  insert into public.fases_roles (fase_id, rol_id) values (g, pg_temp.mp_rol_de(dueno_de_la_fase));
  perform pg_temp.mp_es('P2 rol fuera de fases_roles', pg_temp.mp_mover(mueve, v, g, f), '23514', 'rol');
  if pg_temp.mp_fase_de(v) is distinct from f then raise exception 'P2: el rol fuera de la lista movió'; end if;
  perform pg_temp.mp_pasa('P2 flujos.mover.cualquiera', pg_temp.mp_mover(cualquiera, v, g, f));
  if pg_temp.mp_fase_de(v) is distinct from g or pg_temp.mp_historial(v) <> 1 then raise exception 'P2: flujos.mover.cualquiera debía mover con su historial'; end if;
end $$;
rollback;

-- @test mover: sin logistica.ver da 42501 (hint acceso) y la vista previa no dice nada de la unidad; igual que una que no existe (P3)
begin;
do $$
declare
  a uuid := pg_temp.mp_flujo(); o uuid := pg_temp.mp_origen_de(a);
  f uuid := pg_temp.mp_fase(a, 'mp uno', 10, true); g uuid := pg_temp.mp_fase(a, 'mp dos', 20);
  t uuid := pg_temp.mp_transicion(a, f, g); v uuid := pg_temp.mp_vehiculo(a, f);
  sin_ver uuid := pg_temp.mp_persona(array['flujos.mover@' || o]);
  ve uuid := pg_temp.mp_persona(array['logistica.ver', 'flujos.mover@' || o]);
  texto constant text := 'Este vehículo ya no está disponible: no existe o ya no tienes acceso.';
  esperado constant jsonb := jsonb_build_object('ok', false, 'motivos', jsonb_build_array(texto), 'codigos', '["acceso"]'::jsonb,
    'fase_actual', null, 'requisitos', '[]'::jsonb, 'faltan', '[]'::jsonb, 'nota_obligatoria', false);
  r jsonb;
begin
  perform pg_temp.mp_es('P3 sin logistica.ver', pg_temp.mp_mover(sin_ver, v, g, f), '42501', 'acceso', texto);
  perform pg_temp.mp_es('P3 inexistente', pg_temp.mp_mover(ve, gen_random_uuid(), g, f), '42501', 'acceso', texto);
  r := pg_temp.mp_ver(sin_ver, v, g);
  if r is distinct from esperado then raise exception 'P3: la vista previa sin acceso debía ser % y dio %', esperado, r; end if;
  r := pg_temp.mp_ver(ve, gen_random_uuid(), g);
  if r is distinct from esperado then raise exception 'P3: la de una inexistente debía ser la misma y dio %', r; end if;
  -- Con la esperada vieja, quien no la ve recibe el mismo 42501, no el PT409 con el nombre de quien la movió.
  update public.perfiles set nombre = 'Rosa Mamani' where id = ve;
  perform pg_temp.mp_pasa('P3 la mueve quien la ve', pg_temp.mp_mover(ve, v, g, f));
  perform pg_temp.mp_es('P3 esperada vieja sin logistica.ver', pg_temp.mp_mover(sin_ver, v, g, f), '42501', 'acceso', texto);
  update public.vehiculos set eliminado_en = now() where id = v;
  perform pg_temp.mp_es('P3 en la papelera', pg_temp.mp_mover(ve, v, g, f), '42501', 'acceso', texto);
  if pg_temp.mp_historial(v) <> 1 then raise exception 'P3: un 42501 escribió historial'; end if;
end $$;
rollback;

-- @test mover: logistica.ver con alcance propios previsualiza el que creó y el de otra persona da acceso (P4)
begin;
do $$
declare
  a uuid := pg_temp.mp_flujo(); o uuid := pg_temp.mp_origen_de(a);
  f uuid := pg_temp.mp_fase(a, 'mp uno', 10, true); g uuid := pg_temp.mp_fase(a, 'mp dos', 20);
  t uuid := pg_temp.mp_transicion(a, f, g);
  propios uuid := pg_temp.mp_persona(array['logistica.ver', 'flujos.mover@' || o], 'propios');
  otra uuid := pg_temp.mp_persona(array['logistica.ver']);
  mio uuid := pg_temp.mp_vehiculo(a, f, propios); ajeno uuid := pg_temp.mp_vehiculo(a, f, otra); r jsonb;
begin
  r := pg_temp.mp_ver(propios, mio, g);
  if (r ->> 'ok')::boolean is distinct from true or r ->> 'fase_actual' is distinct from f::text then
    raise exception 'P4: el propio debía poder previsualizarse y dio %', r;
  end if;
  r := pg_temp.mp_ver(propios, ajeno, g);
  if r -> 'codigos' is distinct from '["acceso"]'::jsonb then raise exception 'P4: el de otra persona debía dar acceso y dio %', r; end if;
  perform pg_temp.mp_es('P4 mover el ajeno', pg_temp.mp_mover(propios, ajeno, g, f), '42501', 'acceso');
end $$;
rollback;

-- @test mover: un ítem de repuesto sin repuestos.ver da acceso en la vista previa y en mover; con repuestos.ver y repuestos.mover entra (P5)
begin;
do $$
declare
  rep uuid := (select id from public.flujos where ambito = 'repuestos'); f uuid; pr uuid; item uuid; r jsonb;
  sin_ver uuid := pg_temp.mp_persona(array['logistica.ver', 'flujos.mover']);
  con_ver uuid := pg_temp.mp_persona(array['repuestos.ver', 'repuestos.mover']);
  texto constant text := 'Este repuesto ya no está disponible: no existe o ya no tienes acceso.';
begin
  f := pg_temp.mp_fase(rep, 'mp rep uno', 1000, true);
  insert into public.repuestos_proyectos (vehiculo_etiqueta) values ('mp proyecto') returning id into pr;
  insert into public.repuestos_items (proyecto_id, descripcion) values (pr, 'mp ítem') returning id into item;
  r := pg_temp.mp_corre(sin_ver, format('select public.previsualizar_cambio_fase(null, %L, %L)', item, f));
  if r -> 'codigos' is distinct from '["acceso"]'::jsonb or r -> 'motivos' ->> 0 is distinct from texto then
    raise exception 'P5: sin repuestos.ver la vista previa debía dar acceso y dio %', r;
  end if;
  perform pg_temp.mp_es('P5 mover sin repuestos.ver',
    pg_temp.mp_corre(sin_ver, format('select jsonb_build_object(''h'', public.cambiar_fase(null, %L, %L, null, null))', item, f)), '42501', 'acceso', texto);
  -- Con repuestos.ver y repuestos.mover, el ítem sin fase entra a la inicial (la clave del acceso del repuesto existe y abre).
  r := pg_temp.mp_corre(con_ver, format('select public.previsualizar_cambio_fase(null, %L, %L)', item, f));
  if (r ->> 'ok')::boolean is distinct from true or r -> 'codigos' is distinct from '[]'::jsonb then
    raise exception 'P5: con repuestos.ver la vista previa debía dejar pasar y dio %', r;
  end if;
  r := pg_temp.mp_corre(con_ver, format('select jsonb_build_object(''historial'', public.cambiar_fase(null, %L, %L, null, null))', item, f));
  perform pg_temp.mp_pasa('P5 mover con repuestos.ver', r);
  if (select fase_id from public.repuestos_items where id = item) is distinct from f then raise exception 'P5: el ítem debía quedar en la inicial'; end if;
end $$;
rollback;
