-- Mover de fase con el candado y el conflicto con nombre (paso 6.02-1). No depende de otro archivo (`SOLO=areas/mover/mover.sql`). Cada bloque abre
-- su transacción y la revierte. Quién puede: `permisos.sql`; dos sesiones a la vez: `carreras.mjs` (`pnpm db:carreras`).
--
-- Qué asegura:
--   M1. Sin el documento bloqueante aprobado: 23514 con hint `requisitos` (también subido sin aprobar); aprobado, mueve.
--   M2. Sin transición: hint `transicion`; la nota obligatoria de la transición (no sólo la de la fase), vacía: hint `nota`.
--   M3. La esperada vieja: PT409 hint `conflicto` con quién y cuándo («Rosa Mamani la movió a «X» hace un momento.»; «La moviste…» si fue quien
--       llama; «Otra persona…» sin nombre), sin mover ni escribir historial.
--   M4. La esperada nula sólo vale para una unidad sin fase.

-- La primera cuenta de una base vacía queda dueña (con `SOLO=` sin `humo.sql`): una de relleno antes, para que ninguna de la prueba lo sea.
create or replace function pg_temp.mv_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-mv@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio: cada concesión es `clave` o `clave@origen`, todas con el mismo alcance.
create or replace function pg_temp.mv_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.mv_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('mv_' || substr(v_id::text, 1, 8), 'mv ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.mv_rol_de(p_persona uuid) returns uuid language sql as $f$
  select rol_id from public.usuarios_roles where usuario_id = p_persona and es_principal;
$f$;

create or replace function pg_temp.mv_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('mv_' || s, 'mv origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.mv_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.mv_fase(p_flujo uuid, p_nombre text, p_orden int, p_inicial boolean default false) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (p_flujo, p_nombre, p_orden, p_inicial) returning id;
$f$;

create or replace function pg_temp.mv_transicion(p_flujo uuid, p_de uuid, p_a uuid, p_nota boolean default false) returns uuid language sql as $f$
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id, nota_obligatoria) values (p_flujo, p_de, p_a, p_nota) returning id;
$f$;

create or replace function pg_temp.mv_vehiculo(p_flujo uuid, p_fase uuid, p_creado_por uuid default null) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, creado_por) values (pg_temp.mv_origen_de(p_flujo), 'mv vehículo', p_fase, p_creado_por) returning id;
$f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.mv_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.mv_mover(p_quien uuid, p_v uuid, p_a uuid, p_esperada uuid, p_nota text default null) returns jsonb language sql as $f$
  select pg_temp.mv_corre(p_quien, format('select jsonb_build_object(''historial'', public.cambiar_fase(%L, null, %L, %L, %L))', p_v, p_a, p_nota, p_esperada));
$f$;

create or replace function pg_temp.mv_ver(p_quien uuid, p_v uuid, p_a uuid) returns jsonb language sql as $f$
  select pg_temp.mv_corre(p_quien, format('select public.previsualizar_cambio_fase(%L, null, %L)', p_v, p_a));
$f$;

-- Da ese error con ese hint (y ese mensaje, si se pide).
create or replace function pg_temp.mv_es(p_que text, p_r jsonb, p_estado text, p_hint text, p_mensaje text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint
     or (p_mensaje is not null and p_r ->> 'mensaje' is distinct from p_mensaje) then
    raise exception '%: debía dar % (hint %) «%» y dio %', p_que, p_estado, p_hint, coalesce(p_mensaje, '…'), p_r;
  end if;
end $f$;

create or replace function pg_temp.mv_pasa(p_que text, p_r jsonb) returns bigint language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'historial' is null then raise exception '%: debía mover y dio %', p_que, p_r; end if;
  return (p_r ->> 'historial')::bigint;
end $f$;

create or replace function pg_temp.mv_fase_de(p_v uuid) returns uuid language sql as $f$
  select fase_id from public.vehiculos where id = p_v;
$f$;

create or replace function pg_temp.mv_historial(p_v uuid) returns int language sql as $f$
  select count(*)::int from public.historial_fases where vehiculo_id = p_v;
$f$;

-- @test mover: sin el documento bloqueante aprobado da 23514 con hint requisitos; con él aprobado mueve (M1)
begin;
do $$
declare
  a uuid := pg_temp.mv_flujo(); o uuid := pg_temp.mv_origen_de(a);
  f uuid := pg_temp.mv_fase(a, 'mv uno', 10, true); g uuid := pg_temp.mv_fase(a, 'mv dos', 20);
  t uuid := pg_temp.mv_transicion(a, f, g); v uuid := pg_temp.mv_vehiculo(a, f);
  mueve uuid := pg_temp.mv_persona(array['logistica.ver', 'flujos.mover@' || o]); td uuid; r jsonb;
begin
  insert into public.tipos_documento (nombre) values ('mv factura ' || substr(gen_random_uuid()::text, 1, 6)) returning id into td;
  insert into public.fases_requisitos (fase_id, tipo, tipo_documento_id, bloqueante) values (g, 'documento', td, true);
  r := pg_temp.mv_ver(mueve, v, g);
  if r -> 'codigos' is distinct from '["requisitos"]'::jsonb then raise exception 'M1: la vista previa debía dar codigos = [requisitos] y dio %', r; end if;
  perform pg_temp.mv_es('M1 sin el documento', pg_temp.mv_mover(mueve, v, g, f), '23514', 'requisitos');
  insert into public.documentos (vehiculo_id, tipo_documento_id, estado) values (v, td, 'subido');
  perform pg_temp.mv_es('M1 con el documento sin aprobar', pg_temp.mv_mover(mueve, v, g, f), '23514', 'requisitos');
  update public.documentos set estado = 'aprobado' where vehiculo_id = v;
  perform pg_temp.mv_pasa('M1 con el documento aprobado', pg_temp.mv_mover(mueve, v, g, f));
  if pg_temp.mv_fase_de(v) is distinct from g then raise exception 'M1: con el documento aprobado debía quedar en la fase destino'; end if;
end $$;
rollback;

-- @test mover: sin transición da hint transicion; la nota obligatoria de la transición, vacía, da hint nota (M2)
begin;
do $$
declare
  a uuid := pg_temp.mv_flujo(); o uuid := pg_temp.mv_origen_de(a);
  f uuid := pg_temp.mv_fase(a, 'mv uno', 10, true); g uuid := pg_temp.mv_fase(a, 'mv dos', 20); h uuid := pg_temp.mv_fase(a, 'mv tres', 30);
  t uuid := pg_temp.mv_transicion(a, f, g, true); v uuid := pg_temp.mv_vehiculo(a, f);
  mueve uuid := pg_temp.mv_persona(array['logistica.ver', 'flujos.mover@' || o]); r jsonb;
begin
  perform pg_temp.mv_es('M2 sin transición', pg_temp.mv_mover(mueve, v, h, f), '23514', 'transicion',
    'No se puede mover: No hay transición desde la fase actual.');
  r := pg_temp.mv_ver(mueve, v, g);
  if (r ->> 'nota_obligatoria')::boolean is distinct from true or (r ->> 'ok')::boolean is distinct from true then
    raise exception 'M2: la vista previa debía pedir la nota de la transición y dio %', r;
  end if;
  perform pg_temp.mv_es('M2 nota vacía', pg_temp.mv_mover(mueve, v, g, f, '  '), '23514', 'nota', 'Esta fase pide una nota interna.');
  perform pg_temp.mv_pasa('M2 con nota', pg_temp.mv_mover(mueve, v, g, f, 'Llegó la factura'));
end $$;
rollback;

-- @test mover: la esperada vieja da PT409 con quién y cuándo, de tú, sin «Recarga» (M3)
begin;
do $$
declare
  a uuid := pg_temp.mv_flujo(); o uuid := pg_temp.mv_origen_de(a);
  f uuid := pg_temp.mv_fase(a, 'mv uno', 10, true); g uuid := pg_temp.mv_fase(a, 'mv dos', 20); h uuid := pg_temp.mv_fase(a, 'mv tres', 30);
  v uuid := pg_temp.mv_vehiculo(a, f);
  mueve uuid := pg_temp.mv_persona(array['logistica.ver', 'flujos.mover@' || o]);
  rosa uuid := pg_temp.mv_persona(array['logistica.ver', 'flujos.mover@' || o]);
  sin_nombre uuid := pg_temp.mv_persona(array['logistica.ver', 'flujos.mover@' || o]);
  n int;
begin
  perform pg_temp.mv_transicion(a, f, g); perform pg_temp.mv_transicion(a, g, h); perform pg_temp.mv_transicion(a, h, f);
  update public.perfiles set nombre = 'Rosa Mamani' where id = rosa;
  update public.perfiles set nombre = '  ' where id = sin_nombre;
  perform pg_temp.mv_pasa('M3 Rosa mueve', pg_temp.mv_mover(rosa, v, g, f));
  n := pg_temp.mv_historial(v);
  perform pg_temp.mv_es('M3 movida por otra persona', pg_temp.mv_mover(mueve, v, g, f), 'PT409', 'conflicto',
    'Rosa Mamani la movió a «mv dos» hace un momento.');
  perform pg_temp.mv_pasa('M3 mueve con la buena', pg_temp.mv_mover(mueve, v, h, g));
  perform pg_temp.mv_es('M3 movida por quien llama', pg_temp.mv_mover(mueve, v, h, g), 'PT409', 'conflicto',
    'La moviste a «mv tres» hace un momento desde otra ventana.');
  perform pg_temp.mv_pasa('M3 sin nombre mueve', pg_temp.mv_mover(sin_nombre, v, f, h));
  perform pg_temp.mv_es('M3 movida por alguien sin nombre', pg_temp.mv_mover(mueve, v, f, h), 'PT409', 'conflicto',
    'Otra persona la movió a «mv uno» hace un momento.');
  if pg_temp.mv_historial(v) <> n + 2 or pg_temp.mv_fase_de(v) is distinct from f then raise exception 'M3: un PT409 movió o escribió historial'; end if;
end $$;
rollback;

-- @test mover: la esperada nula vale sólo para una unidad sin fase; con fase da PT409 (M4)
begin;
do $$
declare
  a uuid := pg_temp.mv_flujo(); o uuid := pg_temp.mv_origen_de(a);
  f uuid := pg_temp.mv_fase(a, 'mv uno', 10, true); g uuid := pg_temp.mv_fase(a, 'mv dos', 20);
  t uuid := pg_temp.mv_transicion(a, f, g); con_fase uuid := pg_temp.mv_vehiculo(a, f); sin_fase uuid := pg_temp.mv_vehiculo(a, null);
  mueve uuid := pg_temp.mv_persona(array['logistica.ver', 'flujos.mover@' || o]);
begin
  perform pg_temp.mv_es('M4 nula con fase', pg_temp.mv_mover(mueve, con_fase, g, null), 'PT409', 'conflicto', 'Esta unidad ya no está en esa fase.');
  if pg_temp.mv_fase_de(con_fase) is distinct from f then raise exception 'M4: la esperada nula movió una unidad con fase'; end if;
  perform pg_temp.mv_pasa('M4 nula sin fase', pg_temp.mv_mover(mueve, sin_fase, f, null));
  if pg_temp.mv_fase_de(sin_fase) is distinct from f then raise exception 'M4: sin fase debía entrar a la inicial'; end if;
end $$;
rollback;
