-- Marcar una cotización como favorita por RPC (paso 4.27-1): `cotizacion_favorito_poner()`.
-- No depende de otro archivo (`SOLO=areas/comentarios/favorito.sql`). Cada bloque que escribe abre su transacción y la revierte.
--
-- Qué asegura:
--   F1. Pide ver (42501 de lo inexistente); nulo da 22023; poner, quitar y sin_cambios; el contador sube y baja y la versión no se mueve.
--   F2. Las escrituras directas sobre cotizaciones_favoritos están revocadas; la RPC es definer con search_path vacío, de authenticated.

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

-- @test favoritas: pide ver; poner, quitar y sin_cambios; el contador sí, la versión no (F1)
begin;
do $$
declare
  jefa uuid := pg_temp.cm_persona(array['cotizaciones.ver']);
  e jsonb := pg_temp.cm_origen(); ed uuid; c uuid; v0 timestamptz; r jsonb;
  poner constant text := 'select public.cotizacion_favorito_poner(%L, %s)';
begin
  ed := pg_temp.cm_persona(array['cotizaciones.editar']);
  c := pg_temp.cm_cot(jefa, e);
  v0 := (select actualizado_en from public.cotizaciones where id = c);

  r := pg_temp.cm_corre(ed, format(poner, c, 'true'));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'quien no ve la marcó: %', r; end if;
  r := pg_temp.cm_corre(jefa, format(poner, c, 'null'));
  if r ->> 'error' is distinct from '22023' then raise exception 'un valor nulo no dio 22023: %', r; end if;
  r := pg_temp.cm_corre(jefa, format(poner, c, 'true'));
  if r is distinct from '{"resultado": "puesto", "valor": true}'::jsonb then raise exception 'no la puso: %', r; end if;
  if (select favoritos_count from public.cotizaciones where id = c) <> 1 then raise exception 'el contador no subió'; end if;
  r := pg_temp.cm_corre(jefa, format(poner, c, 'true'));
  if r is distinct from '{"resultado": "sin_cambios", "valor": true}'::jsonb then raise exception 'ponerla otra vez no dio sin_cambios: %', r; end if;
  r := pg_temp.cm_corre(jefa, format(poner, c, 'false'));
  if r is distinct from '{"resultado": "quitado", "valor": false}'::jsonb then raise exception 'no la quitó: %', r; end if;
  if (select favoritos_count from public.cotizaciones where id = c) <> 0 or (select actualizado_en from public.cotizaciones where id = c) is distinct from v0 then
    raise exception 'el contador no bajó, o la versión se movió'; end if;
end $$;
rollback;

-- @test favoritas: las escrituras directas están revocadas y la RPC tiene sus privilegios (F2)
begin;
do $$
declare
  jefa uuid := pg_temp.cm_persona(array['cotizaciones.ver']);
  e jsonb := pg_temp.cm_origen(); c uuid; r jsonb; v_oid oid := 'public.cotizacion_favorito_poner(uuid, boolean)'::regprocedure;
begin
  c := pg_temp.cm_cot(jefa, e);
  r := pg_temp.cm_corre(jefa, format('insert into public.cotizaciones_favoritos (cotizacion_id, usuario_id) values (%L, %L) returning to_jsonb(usuario_id)', c, jefa));
  if r ->> 'error' is distinct from '42501' then raise exception 'un insert directo entró: %', r; end if;
  perform pg_temp.cm_corre(jefa, format('select public.cotizacion_favorito_poner(%L, true)', c));
  r := pg_temp.cm_corre(jefa, format('delete from public.cotizaciones_favoritos where cotizacion_id = %L returning to_jsonb(usuario_id)', c));
  if r ->> 'error' is distinct from '42501' then raise exception 'un delete directo entró: %', r; end if;
  if not (select prosecdef from pg_proc where oid = v_oid) or (select proconfig from pg_proc where oid = v_oid) is distinct from array['search_path=""'] then
    raise exception 'cotizacion_favorito_poner perdió prosecdef o el search_path vacío'; end if;
  if not has_function_privilege('authenticated', v_oid, 'execute') or has_function_privilege('anon', v_oid, 'execute') then
    raise exception 'cotizacion_favorito_poner: execute debía ser de authenticated y no de anon'; end if;
  if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.oid = v_oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
    raise exception 'PUBLIC puede ejecutar cotizacion_favorito_poner'; end if;
end $$;
rollback;
