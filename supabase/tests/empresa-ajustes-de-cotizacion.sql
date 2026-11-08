-- Los ajustes de cotización de la empresa (paso 4.20-4a): la vigencia y el vehículo obligatorio al cotizar se cambian con
-- `empresa_guardar_ajustes_de_cotizacion()`, que pide `cotizaciones.configurar` en todos los orígenes (sin origen) y la versión de la fila.
-- Corre después de `humo.sql` (la dueña es `…0001`). Cada bloque abre su transacción y la revierte: otros archivos leen la vigencia de 7.
--
-- Qué asegura:
--   T1. Permiso: con la clave en un solo origen o sin ella, 42501 y nada cambia; con la clave sin origen, cambia; una cuenta bloqueada, el 42501 de assert_activo.
--   T2. Guarda: los dos valores exactos, la versión nueva (la que devuelve), y actualizado_por.
--   T3. Versión: la de antes de otro guardado da PT409; sin versión, el aviso de recargar; nada cambia.
--   T4. Valores: vigencia fuera de 1–365 o nula, y vehículo nulo, dan 22023 con su hint; nada cambia.
--   T5. Separación: empresa_guardar_ajustes() sigue sin aceptarlas, y empresa.ajustes.gestionar no abre la RPC nueva.
--   T6. Definición y catálogo: prosecdef, search_path vacío, execute para authenticated; cotizaciones.configurar nombra la función.

-- Una persona activa con un rol propio; cada concesión es 'clave' (todos los orígenes) o 'clave@<origen>'.
create or replace function pg_temp.eac_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('eac_' || substr(v_id::text, 1, 8), 'EAC ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, 'todos');
  end loop;
  return v_id;
end $f$;

-- Un origen nuevo.
create or replace function pg_temp.eac_origen() returns uuid language plpgsql as $f$
declare o uuid;
begin
  insert into public.origenes (clave, nombre) values ('eac_' || substr(gen_random_uuid()::text, 1, 8), 'EAC origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  return o;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.eac_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return v;
end $f$;

-- La llamada a la RPC nueva, como texto para eac_corre.
create or replace function pg_temp.eac_guardar(p_vigencia integer, p_vehiculo boolean, p_version timestamptz) returns text language sql as $f$
  select format('select to_jsonb(public.empresa_guardar_ajustes_de_cotizacion(%s, %s, %s))',
    coalesce(p_vigencia::text, 'null'), coalesce(p_vehiculo::text, 'null'), coalesce(quote_literal(p_version) || '::timestamptz', 'null'))
$f$;

-- Da ese error (sqlstate y mensaje exactos; el hint, si se pide).
create or replace function pg_temp.eac_da_error(p_que text, p_r jsonb, p_estado text, p_mensaje text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje
     or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % «%» (hint %) y dio %', p_que, p_estado, p_mensaje, p_hint, p_r;
  end if;
end $f$;

-- Los dos ajustes y la versión, tal como están.
create or replace function pg_temp.eac_fila() returns jsonb language sql as $f$
  select jsonb_build_object('vigencia_dias', e.vigencia_dias, 'vehiculo', e.vehiculo_obligatorio_al_cotizar, 'actualizado_en', e.actualizado_en)
  from public.ajustes_empresa e where e.id = 1
$f$;

-- @test ajustes de cotización: sólo cotizaciones.configurar sin origen los cambia; un origen, ninguna clave o una cuenta bloqueada no (T1)
begin;
do $$
declare
  o uuid := pg_temp.eac_origen(); antes jsonb := pg_temp.eac_fila(); v_ver timestamptz := (pg_temp.eac_fila() ->> 'actualizado_en')::timestamptz;
  en_uno uuid; sin_clave uuid; en_todos uuid; bloqueada uuid; r jsonb;
begin
  en_uno := pg_temp.eac_persona(array['cotizaciones.configurar@' || o]);
  sin_clave := pg_temp.eac_persona(array['cotizaciones.ver']);
  en_todos := pg_temp.eac_persona(array['cotizaciones.configurar']);
  bloqueada := pg_temp.eac_persona(array['cotizaciones.configurar']);
  update public.perfiles set bloqueado = true where id = bloqueada;

  perform pg_temp.eac_da_error('la clave en un solo origen', pg_temp.eac_corre(en_uno, pg_temp.eac_guardar(30, false, v_ver)),
    '42501', 'No tienes el permiso «cotizaciones.configurar» en todos los orígenes.');
  perform pg_temp.eac_da_error('sin la clave', pg_temp.eac_corre(sin_clave, pg_temp.eac_guardar(30, false, v_ver)),
    '42501', 'No tienes el permiso «cotizaciones.configurar» en todos los orígenes.');
  perform pg_temp.eac_da_error('una cuenta bloqueada', pg_temp.eac_corre(bloqueada, pg_temp.eac_guardar(30, false, v_ver)),
    '42501', 'Tu cuenta está bloqueada o dada de baja.');
  if pg_temp.eac_fila() is distinct from antes then raise exception 'sin el permiso la fila cambió: % → %', antes, pg_temp.eac_fila(); end if;

  r := pg_temp.eac_corre(en_todos, pg_temp.eac_guardar(30, false, v_ver));
  if r ? 'error' then raise exception 'con la clave sin origen debía guardar y dio %', r; end if;
  if (pg_temp.eac_fila() ->> 'vigencia_dias')::int is distinct from 30 or (pg_temp.eac_fila() ->> 'vehiculo')::boolean is distinct from false then
    raise exception 'con la clave sin origen no quedó guardado: %', pg_temp.eac_fila();
  end if;
end $$;
rollback;

-- @test ajustes de cotización: la dueña guarda los dos valores, la versión se mueve y la devuelve, con actualizado_por (T2)
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  v_ver timestamptz := (pg_temp.eac_fila() ->> 'actualizado_en')::timestamptz; r jsonb; f jsonb;
begin
  r := pg_temp.eac_corre(duena, pg_temp.eac_guardar(30, false, v_ver));
  if r ? 'error' then raise exception 'la dueña no pudo guardar: %', r; end if;
  f := pg_temp.eac_fila();
  if (f ->> 'vigencia_dias')::int is distinct from 30 then raise exception 'la vigencia no es 30: %', f; end if;
  if (f ->> 'vehiculo')::boolean is distinct from false then raise exception 'el vehículo obligatorio no es false: %', f; end if;
  if (f ->> 'actualizado_en')::timestamptz is not distinct from v_ver then raise exception 'la versión no se movió: %', f; end if;
  if (r #>> '{}')::timestamptz is distinct from (f ->> 'actualizado_en')::timestamptz then
    raise exception 'devolvió % y la versión es %', r, f ->> 'actualizado_en';
  end if;
  if (select e.actualizado_por from public.ajustes_empresa e where e.id = 1) is distinct from duena then
    raise exception 'actualizado_por no es la dueña';
  end if;
end $$;
rollback;

-- @test ajustes de cotización: con la versión de antes de otro guardado da PT409, sin versión pide recargar, y nada cambia (T3)
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  v_vieja timestamptz := (pg_temp.eac_fila() ->> 'actualizado_en')::timestamptz; r jsonb; despues jsonb;
begin
  r := pg_temp.eac_corre(duena, pg_temp.eac_guardar(20, true, v_vieja));
  if r ? 'error' then raise exception 'el primer guardado falló: %', r; end if;
  despues := pg_temp.eac_fila();
  perform pg_temp.eac_da_error('con la versión vieja', pg_temp.eac_corre(duena, pg_temp.eac_guardar(40, false, v_vieja)),
    'PT409', 'Otra persona cambió los ajustes de la empresa mientras los editabas.');
  perform pg_temp.eac_da_error('sin versión', pg_temp.eac_corre(duena, pg_temp.eac_guardar(40, false, null)),
    'P0001', 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.');
  if pg_temp.eac_fila() is distinct from despues then raise exception 'un guardado rechazado cambió la fila: % → %', despues, pg_temp.eac_fila(); end if;
end $$;
rollback;

-- @test ajustes de cotización: vigencia 0, 366 o nula y vehículo nulo dan 22023 con su hint, y nada cambia (T4)
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  antes jsonb := pg_temp.eac_fila(); v_ver timestamptz := (pg_temp.eac_fila() ->> 'actualizado_en')::timestamptz;
begin
  perform pg_temp.eac_da_error('vigencia 0', pg_temp.eac_corre(duena, pg_temp.eac_guardar(0, true, v_ver)),
    '22023', 'La vigencia va de 1 a 365 días.', 'vigencia_dias');
  perform pg_temp.eac_da_error('vigencia 366', pg_temp.eac_corre(duena, pg_temp.eac_guardar(366, true, v_ver)),
    '22023', 'La vigencia va de 1 a 365 días.', 'vigencia_dias');
  perform pg_temp.eac_da_error('vigencia nula', pg_temp.eac_corre(duena, pg_temp.eac_guardar(null, true, v_ver)),
    '22023', 'La vigencia va de 1 a 365 días.', 'vigencia_dias');
  perform pg_temp.eac_da_error('vehículo nulo', pg_temp.eac_corre(duena, pg_temp.eac_guardar(10, null, v_ver)),
    '22023', 'Falta decir si el vehículo es obligatorio al cotizar.', 'vehiculo_obligatorio_al_cotizar');
  if pg_temp.eac_fila() is distinct from antes then raise exception 'un valor rechazado cambió la fila: % → %', antes, pg_temp.eac_fila(); end if;
end $$;
rollback;

-- @test ajustes de cotización: empresa_guardar_ajustes sigue sin aceptarlos y empresa.ajustes.gestionar no abre la RPC nueva (T5)
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  antes jsonb := pg_temp.eac_fila(); v_ver timestamptz := (pg_temp.eac_fila() ->> 'actualizado_en')::timestamptz; gestor uuid;
begin
  perform pg_temp.eac_da_error('la RPC de Empresa con la vigencia', pg_temp.eac_corre(duena,
      format('select to_jsonb(public.empresa_guardar_ajustes(%L::jsonb, %L::timestamptz))', '{"vigencia_dias": 9}', v_ver)),
    'P0001', 'El dato «vigencia_dias» no se cambia desde los ajustes de la empresa.');
  perform pg_temp.eac_da_error('la RPC de Empresa con el vehículo', pg_temp.eac_corre(duena,
      format('select to_jsonb(public.empresa_guardar_ajustes(%L::jsonb, %L::timestamptz))', '{"vehiculo_obligatorio_al_cotizar": false}', v_ver)),
    'P0001', 'El dato «vehiculo_obligatorio_al_cotizar» no se cambia desde los ajustes de la empresa.');
  gestor := pg_temp.eac_persona(array['empresa.ajustes.gestionar']);
  perform pg_temp.eac_da_error('empresa.ajustes.gestionar en la RPC nueva', pg_temp.eac_corre(gestor, pg_temp.eac_guardar(30, false, v_ver)),
    '42501', 'No tienes el permiso «cotizaciones.configurar» en todos los orígenes.');
  if pg_temp.eac_fila() is distinct from antes then raise exception 'la fila cambió: % → %', antes, pg_temp.eac_fila(); end if;
end $$;
rollback;

-- @test ajustes de cotización: la RPC lleva prosecdef con search_path vacío y execute para authenticated; el catálogo la nombra (T6)
do $$
declare v_p record; v_c record;
begin
  select p.prosecdef, p.proconfig, has_function_privilege('authenticated', p.oid, 'execute') as auth_ejecuta into v_p
    from pg_proc p where p.oid = 'public.empresa_guardar_ajustes_de_cotizacion(integer, boolean, timestamptz)'::regprocedure;
  if not v_p.prosecdef then raise exception 'la RPC no lleva prosecdef'; end if;
  if v_p.proconfig is distinct from array['search_path=""'] then raise exception 'la RPC no fija search_path vacío: %', v_p.proconfig; end if;
  if not v_p.auth_ejecuta then raise exception 'authenticated no puede ejecutar la RPC'; end if;
  select p.descripcion, p.aplicado_en into v_c from public.permisos p where p.clave = 'cotizaciones.configurar';
  if v_c.aplicado_en not like '%empresa_guardar_ajustes_de_cotizacion%' then raise exception 'aplicado_en no nombra la RPC: %', v_c.aplicado_en; end if;
  if v_c.descripcion not like '%la vigencia y el vehículo obligatorio al cotizar%' then raise exception 'la descripción no dice la vigencia: %', v_c.descripcion; end if;
end $$;
