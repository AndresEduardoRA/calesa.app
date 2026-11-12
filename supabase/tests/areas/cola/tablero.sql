-- El tablero de la cola web (8.04-1, C2–C7). No depende de otro archivo (`SOLO=areas/cola/tablero.sql`). Cada bloque abre su transacción y
-- la revierte.
--
-- Qué asegura:
--   T1. Sin web.cola.gestionar (con web.cola.participar y nada más), cola_web_tablero y cola_web_solicitudes dan 42501.
--   T2. Con web.cola.gestionar: habilitada con un rol sin web.cola.participar → su fila con en_la_rueda = false y cuenta_activa = true; con el
--       permiso en su rol → true; la no habilitada no aparece; la bloqueada habilitada → cuenta_activa = false. Claves exactas; cupo hereda el
--       de la política con max_abiertas nulo; abiertas cuenta una asignada y no una directa; falta_whatsapp.
--   T3. Quien no gestiona no lee solicitudes ajenas: por select directo ve sólo la suya; la RPC le da 42501.
--   T4. Cursor: 3 sin_asignar y 1 asignada, de a 2 → 2 en orden (creado_en desc, id desc) con hay_mas; con el cursor de la 2.ª → 1 sin
--       hay_mas; la asignada nunca; cursor a medias y estado nulo → 22023 con su hint; claves exactas; sin vehículo, vehiculo_titulo nulo.
--   T5. Dos con el mismo creado_en, de a una: el cursor desempata por id desc, sin repetir ni saltar.
--   T6. cola_web_configurar (8.04-3; devuelve void: se llama en el from): sin web.cola.gestionar → 42501 y la fila no cambia; con el permiso, habilitar a alguien cuyo rol no
--       participa deja sus valores, no toca disponible y puede_estar_en_la_rueda da falso; quitar con sus valores y «Deshacer» la dejan igual.

create or replace function pg_temp.ct_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-ct@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('ct_' || substr(v_id::text, 1, 8), 'CT ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- El rol propio de una persona de ct_persona.
create or replace function pg_temp.ct_rol(p_quien uuid) returns uuid language sql as $f$
  select rol_id from public.usuarios_roles where usuario_id = p_quien and es_principal;
$f$;

-- Corre `p_sql` como `p_quien` (authenticated): `{v: <resultado>}` o `{error, mensaje, hint}`.
create or replace function pg_temp.ct_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v text; v_m text; v_e text; v_h text;
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
  return jsonb_build_object('v', v::jsonb);
end $f$;

create or replace function pg_temp.ct_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: se esperaba % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

-- Una solicitud con lo mínimo; `p_creado` fija el orden.
create or replace function pg_temp.ct_solicitud(p_estado public.estado_solicitud_web, p_usuario uuid, p_creado timestamptz,
                                                 p_directa boolean default false) returns uuid language sql as $f$
  insert into public.solicitudes_contacto_web (codigo, token_visitante, usuario_id, estado, es_directa, fuente, creado_en)
  values ('CT-' || substr(gen_random_uuid()::text, 1, 8), 'ct_visitante_0123456789', p_usuario, p_estado, p_directa, 'ficha', p_creado)
  returning id;
$f$;

-- @test T1 · sin web.cola.gestionar, el tablero y las solicitudes dan 42501
begin;
do $$
declare v_p uuid := pg_temp.ct_persona(array['web.cola.participar']);
begin
  perform pg_temp.ct_es('tablero sin gestionar', pg_temp.ct_corre(v_p, 'select public.cola_web_tablero()::text'), '42501');
  perform pg_temp.ct_es('solicitudes sin gestionar',
    pg_temp.ct_corre(v_p, $q$select public.cola_web_solicitudes('sin_asignar')::text$q$), '42501');
end $$;
rollback;

-- @test T2 · el tablero trae a todas las habilitadas, con en_la_rueda según el permiso del rol y cuenta_activa aparte
begin;
do $$
declare
  v_g uuid := pg_temp.ct_persona(array['web.cola.gestionar']);
  v_a uuid := pg_temp.ct_persona(array[]::text[]);
  v_b uuid := pg_temp.ct_persona(array['web.cola.participar']);
  v_c uuid := pg_temp.ct_persona(array['web.cola.participar']);
  v_r jsonb; v_fila jsonb; v_claves text[];
  v_esperadas text[] := array['abiertas', 'asignadas_total', 'contactadas_total', 'cuenta_activa', 'cupo', 'disponible', 'en_la_rueda',
    'falta_whatsapp', 'max_abiertas', 'nombre', 'orden', 'prioridad', 'tasa_contacto_pct', 'ultima_asignacion_en', 'usuario_id', 'vencidas_total'];
begin
  -- Cada persona ya tiene su fila en la cola (la crea un trigger del perfil): se pisa.
  insert into public.cola_web_asesores (usuario_id, habilitado, max_abiertas) values (v_a, true, null), (v_b, false, null), (v_c, true, 7)
  on conflict (usuario_id) do update set habilitado = excluded.habilitado, max_abiertas = excluded.max_abiertas;
  update public.perfiles set whatsapp_web = '+59170000001' where id = v_c;
  update public.perfiles set bloqueado = true where id = v_c;
  perform pg_temp.ct_solicitud('asignada', v_a, now());
  perform pg_temp.ct_solicitud('asignada', v_a, now(), true);

  v_r := pg_temp.ct_corre(v_g, 'select public.cola_web_tablero()::text') -> 'v';
  if v_r is null or v_r -> 'hay_mas' <> 'false'::jsonb then raise exception 'tablero: %', v_r; end if;

  select f into v_fila from jsonb_array_elements(v_r -> 'filas') f where f ->> 'usuario_id' = v_a::text;
  if v_fila is null then raise exception 'la habilitada sin el permiso no aparece: %', v_r; end if;
  select array_agg(k order by k) into v_claves from jsonb_object_keys(v_fila) k;
  if v_claves is distinct from v_esperadas then raise exception 'claves de la fila: %', v_claves; end if;
  if v_fila -> 'en_la_rueda' <> 'false'::jsonb or v_fila -> 'cuenta_activa' <> 'true'::jsonb then
    raise exception 'habilitada sin el permiso: %', v_fila;
  end if;
  if v_fila -> 'falta_whatsapp' <> 'true'::jsonb or v_fila -> 'max_abiertas' <> 'null'::jsonb
     or (v_fila ->> 'cupo')::int is distinct from (select max_abiertas_default from public.ajustes_web where id = 1) then
    raise exception 'whatsapp o cupo heredado: %', v_fila;
  end if;
  if (v_fila ->> 'abiertas')::int <> 1 then raise exception 'abiertas cuenta la directa o no cuenta la asignada: %', v_fila; end if;

  if exists (select 1 from jsonb_array_elements(v_r -> 'filas') f where f ->> 'usuario_id' = v_b::text) then
    raise exception 'la no habilitada aparece en el tablero';
  end if;

  select f into v_fila from jsonb_array_elements(v_r -> 'filas') f where f ->> 'usuario_id' = v_c::text;
  if v_fila is null or v_fila -> 'cuenta_activa' <> 'false'::jsonb or v_fila -> 'en_la_rueda' <> 'false'::jsonb
     or v_fila -> 'falta_whatsapp' <> 'false'::jsonb or (v_fila ->> 'cupo')::int <> 7 then
    raise exception 'la bloqueada habilitada: %', v_fila;
  end if;

  -- Con el permiso en su rol, entra en la rueda.
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (pg_temp.ct_rol(v_a), 'web.cola.participar', 'todos');
  v_r := pg_temp.ct_corre(v_g, 'select public.cola_web_tablero()::text') -> 'v';
  select f into v_fila from jsonb_array_elements(v_r -> 'filas') f where f ->> 'usuario_id' = v_a::text;
  if v_fila -> 'en_la_rueda' <> 'true'::jsonb then raise exception 'con el permiso no entra en la rueda: %', v_fila; end if;
end $$;
rollback;

-- @test T3 · quien no gestiona no lee solicitudes ajenas
begin;
do $$
declare
  v_a uuid := pg_temp.ct_persona(array['web.cola.participar']);
  v_b uuid := pg_temp.ct_persona(array['web.cola.participar']);
  v_mia uuid := pg_temp.ct_solicitud('asignada', v_a, now());
  v_r jsonb;
begin
  perform pg_temp.ct_solicitud('asignada', v_b, now());
  perform pg_temp.ct_solicitud('sin_asignar', null, now());
  v_r := pg_temp.ct_corre(v_a, 'select coalesce(jsonb_agg(id), ''[]'')::text from public.solicitudes_contacto_web') -> 'v';
  if v_r is distinct from jsonb_build_array(v_mia) then raise exception 'lee solicitudes ajenas: %', v_r; end if;
  perform pg_temp.ct_es('solicitudes por rpc sin gestionar',
    pg_temp.ct_corre(v_a, $q$select public.cola_web_solicitudes('asignada')::text$q$), '42501');
end $$;
rollback;

-- @test T4 · las solicitudes de un estado van por cursor, la más nueva primero
begin;
do $$
declare
  v_g uuid := pg_temp.ct_persona(array['web.cola.gestionar']);
  v_s1 uuid := pg_temp.ct_solicitud('sin_asignar', null, '2026-01-01T10:00:00Z');
  v_s2 uuid := pg_temp.ct_solicitud('sin_asignar', null, '2026-01-01T11:00:00Z');
  v_s3 uuid := pg_temp.ct_solicitud('sin_asignar', null, '2026-01-01T12:00:00Z');
  v_r jsonb; v_ult jsonb; v_claves text[];
  v_esperadas text[] := array['asignada_en', 'codigo', 'creado_en', 'estado', 'fuente', 'id', 'intento', 'ruta', 'usuario_id', 'usuario_nombre',
    'vehiculo_id', 'vehiculo_titulo', 'vence_en'];
begin
  -- Sólo las de esta prueba: las sin_asignar que ya hubiera quedan antes de 2026 o se apartan.
  update public.solicitudes_contacto_web set estado = 'cancelada' where estado = 'sin_asignar' and id not in (v_s1, v_s2, v_s3);
  perform pg_temp.ct_solicitud('asignada', v_g, '2026-01-01T13:00:00Z');

  v_r := pg_temp.ct_corre(v_g, $q$select public.cola_web_solicitudes('sin_asignar', null, null, 2)::text$q$) -> 'v';
  if v_r is null or jsonb_path_query_array(v_r, '$.filas[*].id') <> jsonb_build_array(v_s3, v_s2) or v_r -> 'hay_mas' <> 'true'::jsonb then
    raise exception 'primera página: %', v_r;
  end if;
  select array_agg(k order by k) into v_claves from jsonb_object_keys(v_r -> 'filas' -> 0) k;
  if v_claves is distinct from v_esperadas then raise exception 'claves de la solicitud: %', v_claves; end if;
  if v_r -> 'filas' -> 0 -> 'vehiculo_titulo' <> 'null'::jsonb or v_r -> 'filas' -> 0 -> 'usuario_nombre' <> 'null'::jsonb then
    raise exception 'sin vehículo ni persona: %', v_r -> 'filas' -> 0;
  end if;

  v_ult := v_r -> 'filas' -> 1;
  v_r := pg_temp.ct_corre(v_g, format('select public.cola_web_solicitudes(%L, %L, %L, 2)::text', 'sin_asignar',
                                       v_ult ->> 'creado_en', v_ult ->> 'id')) -> 'v';
  if v_r is null or jsonb_path_query_array(v_r, '$.filas[*].id') <> jsonb_build_array(v_s1) or v_r -> 'hay_mas' <> 'false'::jsonb then
    raise exception 'segunda página: %', v_r;
  end if;

  perform pg_temp.ct_es('cursor a medias',
    pg_temp.ct_corre(v_g, format('select public.cola_web_solicitudes(%L, %L, null, 2)::text', 'sin_asignar', v_ult ->> 'creado_en')),
    '22023', 'cursor');
  perform pg_temp.ct_es('estado nulo', pg_temp.ct_corre(v_g, 'select public.cola_web_solicitudes(null)::text'), '22023', 'estado');
end $$;
rollback;

-- @test T5 · con el mismo creado_en, el cursor desempata por id (desc) sin repetir ni saltar
begin;
do $$
declare
  v_g uuid := pg_temp.ct_persona(array['web.cola.gestionar']);
  v_x uuid := pg_temp.ct_solicitud('sin_asignar', null, '2026-02-01T10:00:00Z');
  v_y uuid := pg_temp.ct_solicitud('sin_asignar', null, '2026-02-01T10:00:00Z');
  v_r jsonb; v_primera jsonb; v_vistas jsonb;
begin
  update public.solicitudes_contacto_web set estado = 'cancelada' where estado = 'sin_asignar' and id not in (v_x, v_y);
  v_r := pg_temp.ct_corre(v_g, $q$select public.cola_web_solicitudes('sin_asignar', null, null, 1)::text$q$) -> 'v';
  v_primera := v_r -> 'filas' -> 0;
  if v_r -> 'hay_mas' <> 'true'::jsonb or v_primera ->> 'id' <> greatest(v_x, v_y)::text then raise exception 'primera de a una: %', v_r; end if;
  v_r := pg_temp.ct_corre(v_g, format('select public.cola_web_solicitudes(%L, %L, %L, 1)::text', 'sin_asignar',
                                       v_primera ->> 'creado_en', v_primera ->> 'id')) -> 'v';
  v_vistas := jsonb_path_query_array(v_r, '$.filas[*].id');
  if v_vistas <> jsonb_build_array(least(v_x, v_y)) or v_r -> 'hay_mas' <> 'false'::jsonb then raise exception 'segunda de a una: %', v_r; end if;
end $$;
rollback;

-- @test T6 · cola_web_configurar pide gestionar, no toca disponible, y quitar y deshacer conservan los valores
begin;
do $$
declare
  v_g uuid := pg_temp.ct_persona(array['web.cola.gestionar']);
  v_p uuid := pg_temp.ct_persona(array['web.cola.participar']);
  v_b uuid := pg_temp.ct_persona(array[]::text[]);
  v_antes public.cola_web_asesores; v_fila public.cola_web_asesores; v_habilitada public.cola_web_asesores;
  v_r jsonb;
begin
  insert into public.cola_web_asesores (usuario_id, habilitado, max_abiertas, prioridad, orden, disponible) values (v_b, false, null, 0, 0, false)
  on conflict (usuario_id) do update set habilitado = false, max_abiertas = null, prioridad = 0, orden = 0, disponible = false;
  select * into v_antes from public.cola_web_asesores where usuario_id = v_b;

  -- (a) sin gestionar: 42501 y nada cambia.
  perform pg_temp.ct_es('configurar sin gestionar',
    pg_temp.ct_corre(v_p, format('select ''0'' from public.cola_web_configurar(%L, true, 7, 2::smallint, 3::smallint)', v_b)), '42501');
  select * into v_fila from public.cola_web_asesores where usuario_id = v_b;
  if v_fila is distinct from v_antes then raise exception 'sin gestionar cambió la fila: % → %', v_antes, v_fila; end if;

  -- (b) con gestionar: habilitada con sus valores, disponible intacto y fuera de la rueda (su rol no participa).
  v_r := pg_temp.ct_corre(v_g, format('select ''0'' from public.cola_web_configurar(%L, true, 7, 2::smallint, 3::smallint)', v_b));
  if v_r ? 'error' then raise exception 'configurar con gestionar: %', v_r; end if;
  select * into v_habilitada from public.cola_web_asesores where usuario_id = v_b;
  if v_habilitada.habilitado is distinct from true or v_habilitada.max_abiertas is distinct from 7 or v_habilitada.prioridad is distinct from 2::smallint
     or v_habilitada.orden is distinct from 3::smallint or v_habilitada.disponible is distinct from v_antes.disponible then
    raise exception 'habilitar: %', v_habilitada;
  end if;
  v_r := pg_temp.ct_corre(v_g, format('select public.puede_estar_en_la_rueda(%L)::text', v_b));
  if v_r -> 'v' is distinct from 'false'::jsonb then raise exception 'habilitada sin el permiso entra en la rueda: %', v_r; end if;

  -- (c) quitar con sus valores: sólo cambia habilitado.
  v_r := pg_temp.ct_corre(v_g, format('select ''0'' from public.cola_web_configurar(%L, false, 7, 2::smallint, 3::smallint)', v_b));
  if v_r ? 'error' then raise exception 'quitar: %', v_r; end if;
  select * into v_fila from public.cola_web_asesores where usuario_id = v_b;
  if v_fila.habilitado is distinct from false or v_fila.max_abiertas is distinct from 7 or v_fila.prioridad is distinct from 2::smallint
     or v_fila.orden is distinct from 3::smallint or v_fila.disponible is distinct from v_antes.disponible then
    raise exception 'quitar: %', v_fila;
  end if;

  -- (d) «Deshacer»: la fila vuelve a como quedó al habilitar.
  v_r := pg_temp.ct_corre(v_g, format('select ''0'' from public.cola_web_configurar(%L, true, 7, 2::smallint, 3::smallint)', v_b));
  if v_r ? 'error' then raise exception 'deshacer: %', v_r; end if;
  select * into v_fila from public.cola_web_asesores where usuario_id = v_b;
  if v_fila is distinct from v_habilitada then raise exception 'deshacer: % → %', v_habilitada, v_fila; end if;
end $$;
rollback;
