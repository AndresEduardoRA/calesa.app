-- Reportar una cotización y moderar sus reportes por RPC (paso 4.27-1): `cotizacion_reportar()`, `cotizacion_reporte_retirar()` y `cotizacion_moderar()`.
-- No depende de otro archivo (`SOLO=areas/comentarios/reportar-y-moderar.sql`). Cada bloque que escribe abre su transacción y la revierte.
--
-- Qué asegura:
--   M1. Reportar pide ver y un motivo (1 a 500); uno por persona (el segundo cambia el motivo); no cambia el estado ni la versión. Retirar, el propio.
--   M2. Leer los reportes ajenos pide moderar y ver: quien modera sin ver lee 0 filas; cada persona lee el suyo.
--   M3. Moderar pide ver, moderar y, en una final, final.gestionar del origen; la versión (PT409); `reportada` no se pide (22023). Invalidar mueve la
--       versión y conserva los reportes; activa sobre una activa con reportes los descarta sin mover la versión; sin reportes, sin_cambios. La firma
--       vieja ya no existe y queda la actividad.
--   M4. Las escrituras directas sobre cotizaciones_reportes están revocadas; las tres RPC son definer con search_path vacío, de authenticated.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (alcance «todos») o 'clave:propios'.
create or replace function pg_temp.cm_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('cm_' || substr(v_id::text, 1, 8), 'CM ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje} si falla.
create or replace function pg_temp.cm_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m);
  end;
  reset role;
  return v;
end $f$;

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.cm_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; v_def jsonb;
begin
  insert into public.origenes (clave, nombre) values ('cm_' || substr(gen_random_uuid()::text, 1, 8), 'CM origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Una cotización viva de esa persona; una final lleva un vehículo propio.
create or replace function pg_temp.cm_cot(p_quien uuid, e jsonb, p_clase text default 'preventa') returns uuid language plpgsql as $f$
declare v_c uuid; v_v uuid;
begin
  if p_clase = 'final' then
    insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'CM vehículo', 'toyota') returning id into v_v;
  end if;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, clase, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, v_v, p_clase::public.clase_cotizacion, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into v_c;
  return v_c;
end $f$;

-- La versión de una cotización, como la tiene la pantalla.
create or replace function pg_temp.cm_cot_version(p_c uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.cotizaciones where id = p_c;
$f$;

-- @test reportes: reportar pide ver y un motivo; uno por persona; no mueve el estado ni la versión (M1)
begin;
do $$
declare
  jefa uuid := pg_temp.cm_persona(array['cotizaciones.ver']);
  e jsonb := pg_temp.cm_origen(); ed uuid; ve uuid; c uuid; v0 timestamptz; r jsonb;
  reportar constant text := 'select public.cotizacion_reportar(%L, %L)';
begin
  ed := pg_temp.cm_persona(array['cotizaciones.editar']);
  ve := pg_temp.cm_persona(array['cotizaciones.ver']);
  c := pg_temp.cm_cot(jefa, e);
  v0 := pg_temp.cm_cot_version(c);

  r := pg_temp.cm_corre(ed, format(reportar, c, 'Mal'));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'quien no ve reportó: %', r; end if;
  r := pg_temp.cm_corre(ve, format(reportar, c, '   '));
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' is distinct from 'Cuéntanos qué está mal (hasta 500 caracteres).' then raise exception 'un motivo vacío no dio 22023: %', r; end if;
  r := pg_temp.cm_corre(ve, format(reportar, c, repeat('a', 501)));
  if r ->> 'error' is distinct from '22023' then raise exception 'un motivo de 501 no dio 22023: %', r; end if;
  r := pg_temp.cm_corre(ve, format(reportar, c, ' Precio mal '));
  if r is distinct from '{"resultado": "reportada"}'::jsonb then raise exception 'no reportó: %', r; end if;
  r := pg_temp.cm_corre(ve, format(reportar, c, 'Precio mal'));
  if r is distinct from '{"resultado": "sin_cambios"}'::jsonb then raise exception 'el mismo motivo no dio sin_cambios: %', r; end if;
  r := pg_temp.cm_corre(ve, format(reportar, c, 'Otro motivo'));
  if r is distinct from '{"resultado": "motivo_cambiado"}'::jsonb then raise exception 'el segundo reporte no cambió el motivo: %', r; end if;
  r := pg_temp.cm_corre(jefa, format(reportar, c, 'También'));
  if (select reportes_count from public.cotizaciones where id = c) <> 2
     or (select motivo from public.cotizaciones_reportes where cotizacion_id = c and usuario_id = ve) is distinct from 'Otro motivo' then
    raise exception 'los reportes no quedaron uno por persona con su motivo'; end if;
  if pg_temp.cm_cot_version(c) is distinct from v0 or (select estado from public.cotizaciones where id = c) <> 'activa' then
    raise exception 'reportar movió la versión o el estado'; end if;
  r := pg_temp.cm_corre(ve, format('select public.cotizacion_reporte_retirar(%L)', c));
  if r is distinct from '{"resultado": "retirado"}'::jsonb then raise exception 'no retiró su reporte: %', r; end if;
  r := pg_temp.cm_corre(ve, format('select public.cotizacion_reporte_retirar(%L)', c));
  if r is distinct from '{"resultado": "sin_cambios"}'::jsonb then raise exception 'retirar otra vez no dio sin_cambios: %', r; end if;
  if (select reportes_count from public.cotizaciones where id = c) <> 1 or pg_temp.cm_cot_version(c) is distinct from v0 then raise exception 'retirar no dejó un reporte, o movió la versión'; end if;
end $$;
rollback;

-- @test reportes: leer los ajenos pide moderar y ver la cotización (M2)
begin;
do $$
declare
  jefa uuid := pg_temp.cm_persona(array['cotizaciones.ver']);
  e jsonb := pg_temp.cm_origen(); ve uuid; mo uuid; edmo uuid; c uuid; r jsonb;
  cuantos constant text := 'select to_jsonb(count(*)) from public.cotizaciones_reportes where cotizacion_id = %L';
begin
  ve := pg_temp.cm_persona(array['cotizaciones.ver']);
  mo := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.moderar']);
  edmo := pg_temp.cm_persona(array['cotizaciones.editar', 'cotizaciones.moderar']);
  c := pg_temp.cm_cot(jefa, e);
  perform pg_temp.cm_corre(jefa, format('select public.cotizacion_reportar(%L, ''Uno'')', c));
  perform pg_temp.cm_corre(ve, format('select public.cotizacion_reportar(%L, ''Dos'')', c));

  r := pg_temp.cm_corre(edmo, format(cuantos, c));
  if r is distinct from '0'::jsonb then raise exception 'quien modera sin ver leyó reportes: %', r; end if;
  r := pg_temp.cm_corre(mo, format(cuantos, c));
  if r is distinct from '2'::jsonb then raise exception 'quien modera y ve no leyó los dos reportes: %', r; end if;
  r := pg_temp.cm_corre(ve, format(cuantos, c));
  if r is distinct from '1'::jsonb then raise exception 'quien reportó no leyó sólo el suyo: %', r; end if;
end $$;
rollback;

-- @test moderar: pide ver, moderar y en una final final.gestionar; la versión; invalidar y descartar los reportes (M3)
begin;
do $$
declare
  jefa uuid := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.final.gestionar']);
  e jsonb := pg_temp.cm_origen(); ve uuid; mo uuid; edmo uuid; mof uuid; c uuid; f uuid; v0 timestamptz; r jsonb;
  moderar constant text := 'select public.cotizacion_moderar(%L, %L, %L)';
  permiso constant text := 'No tienes permiso para moderar esta cotización.';
begin
  ve := pg_temp.cm_persona(array['cotizaciones.ver']);
  mo := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.moderar']);
  edmo := pg_temp.cm_persona(array['cotizaciones.editar', 'cotizaciones.moderar']);
  mof := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.moderar', 'cotizaciones.final.gestionar']);
  c := pg_temp.cm_cot(jefa, e);
  f := pg_temp.cm_cot(jefa, e, 'final');
  perform pg_temp.cm_corre(jefa, format('select public.cotizacion_reportar(%L, ''Uno'')', c));
  perform pg_temp.cm_corre(ve, format('select public.cotizacion_reportar(%L, ''Dos'')', c));
  v0 := pg_temp.cm_cot_version(c);

  r := pg_temp.cm_corre(ve, format(moderar, c, v0, 'invalida'));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from permiso then raise exception 'quien no modera moderó: %', r; end if;
  r := pg_temp.cm_corre(edmo, format(moderar, c, v0, 'invalida'));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'quien modera sin ver moderó: %', r; end if;
  r := pg_temp.cm_corre(mo, format(moderar, f, pg_temp.cm_cot_version(f), 'invalida'));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from permiso then raise exception 'quien modera sin final.gestionar moderó una final: %', r; end if;
  r := pg_temp.cm_corre(mof, format(moderar, f, pg_temp.cm_cot_version(f), 'invalida'));
  if r ? 'error' or r ->> 'estado' is distinct from 'invalida' then raise exception 'quien modera y gestiona finales no invalidó la final: %', r; end if;
  r := pg_temp.cm_corre(mo, format(moderar, c, '2000-01-01T00:00:00Z', 'activa'));
  if r ->> 'error' is distinct from 'PT409' then raise exception 'una versión vieja no dio PT409: %', r; end if;
  r := pg_temp.cm_corre(mo, format(moderar, c, v0, 'reportada'));
  if r ->> 'error' is distinct from '22023' then raise exception 'pedir reportada no dio 22023: %', r; end if;

  -- Descartar los reportes de una activa: se borran, la versión no se mueve.
  r := pg_temp.cm_corre(mo, format(moderar, c, v0, 'activa'));
  if r ->> 'resultado' is distinct from 'moderada' or r ->> 'estado' is distinct from 'activa' then raise exception 'descartar los reportes no moderó: %', r; end if;
  if (select reportes_count from public.cotizaciones where id = c) <> 0 or exists (select 1 from public.cotizaciones_reportes where cotizacion_id = c) then raise exception 'los reportes no se descartaron'; end if;
  if pg_temp.cm_cot_version(c) is distinct from v0 or (r ->> 'actualizado_en')::timestamptz is distinct from v0 then raise exception 'descartar los reportes movió la versión'; end if;
  if not exists (select 1 from public.actividad where accion = 'cotizacion.moderada' and registro_id = c::text and actor_id = mo
                  and despues = jsonb_build_object('estado', 'activa', 'reportes', 2)) then raise exception 'moderar no dejó su actividad'; end if;
  r := pg_temp.cm_corre(mo, format(moderar, c, v0, 'activa'));
  if r ->> 'resultado' is distinct from 'sin_cambios' then raise exception 'activa sin reportes no dio sin_cambios: %', r; end if;

  -- Invalidar: mueve la versión y conserva los reportes.
  perform pg_temp.cm_corre(ve, format('select public.cotizacion_reportar(%L, ''Tres'')', c));
  r := pg_temp.cm_corre(mo, format(moderar, c, v0, 'invalida'));
  if r ->> 'estado' is distinct from 'invalida' or (r ->> 'actualizado_en')::timestamptz <= v0 or pg_temp.cm_cot_version(c) <= v0 then raise exception 'invalidar no movió la versión: %', r; end if;
  if (select reportes_count from public.cotizaciones where id = c) <> 1 then raise exception 'invalidar no conservó los reportes'; end if;
  if to_regprocedure('public.cotizacion_moderar(uuid, public.estado_cotizacion)') is not null then raise exception 'la firma vieja de cotizacion_moderar sigue'; end if;
end $$;
rollback;

-- @test reportes: las escrituras directas están revocadas y las tres RPC tienen sus privilegios (M4)
begin;
do $$
declare
  jefa uuid := pg_temp.cm_persona(array['cotizaciones.ver']);
  e jsonb := pg_temp.cm_origen(); c uuid; r jsonb; f record;
begin
  c := pg_temp.cm_cot(jefa, e);
  r := pg_temp.cm_corre(jefa, format('insert into public.cotizaciones_reportes (cotizacion_id, usuario_id, motivo) values (%L, %L, ''x'') returning to_jsonb(motivo)', c, jefa));
  if r ->> 'error' is distinct from '42501' then raise exception 'un insert directo entró: %', r; end if;
  perform pg_temp.cm_corre(jefa, format('select public.cotizacion_reportar(%L, ''x'')', c));
  r := pg_temp.cm_corre(jefa, format('delete from public.cotizaciones_reportes where cotizacion_id = %L returning to_jsonb(motivo)', c));
  if r ->> 'error' is distinct from '42501' then raise exception 'un delete directo entró: %', r; end if;
  for f in select p.oid, p.proname, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('cotizacion_reportar', 'cotizacion_reporte_retirar', 'cotizacion_moderar') loop
    if not f.prosecdef or f.proconfig is distinct from array['search_path=""'] then raise exception '% perdió prosecdef o el search_path vacío', f.proname; end if;
    if not has_function_privilege('authenticated', f.oid, 'execute') or has_function_privilege('anon', f.oid, 'execute') then
      raise exception '%: execute debía ser de authenticated y no de anon', f.proname; end if;
    if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.oid = f.oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'PUBLIC puede ejecutar %', f.proname; end if;
  end loop;
end $$;
rollback;
