-- Forma y bordes de las transiciones y de quién mueve (paso 5.05). No depende de otro archivo (`SOLO=humo.sql,areas/flujos/transiciones-datos.sql`).
-- Cada bloque abre su transacción y la revierte. Permisos, versión, quién mueve y escritura directa: `transiciones.sql`.
--
-- Qué asegura:
--   D-1. Crear devuelve la versión del flujo, recorta la acción y guarda la nota; vacía → null; 41 caracteres, de = a, sin id → 22023 con hint;
--        un origen jubilado se acepta.
--   D-2. Guardar: {}, una clave que no es suya, un tipo errado o nota null → 22023 con hint; cambia acción y nota; deja su actividad (trg_auditar).
--   D-3. Eliminar borra la transición y sus roles y devuelve la versión.
--   D-4. Roles: nula, con un nulo, 101 o un rol inexistente → 22023 hint roles y la lista queda intacta; repetidos se colapsan.
--   D-5. La actividad guarda el cambio de roles (antes y después, quién); la misma lista no deja otra fila y sí mueve la versión (el T6 de la fila).

-- La primera cuenta de una base vacía queda dueña (con `SOLO=` sin `humo.sql`): una de relleno antes, para que ninguna de la prueba lo sea.
create or replace function pg_temp.tx_sin_duena_de_prueba() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-tx@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

create or replace function pg_temp.tx_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.tx_sin_duena_de_prueba();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('tx_' || substr(v_id::text, 1, 8), 'TX ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.tx_rol_de(p_persona uuid) returns uuid language sql as $f$
  select rol_id from public.usuarios_roles where usuario_id = p_persona and es_principal;
$f$;

create or replace function pg_temp.tx_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('tx_' || s, 'TX origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.tx_version(p_flujo uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.tx_fase(p_flujo uuid, p_nombre text, p_orden int, p_activa boolean default true) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, activa) values (p_flujo, p_nombre, p_orden, p_activa) returning id;
$f$;

create or replace function pg_temp.tx_transicion(p_flujo uuid, p_de uuid, p_a uuid) returns uuid language sql as $f$
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values (p_flujo, p_de, p_a) returning id;
$f$;

create or replace function pg_temp.tx_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.tx_crear(p_quien uuid, p_id uuid, p_flujo uuid, p_de uuid, p_a uuid, p_accion text, p_nota boolean) returns jsonb
language sql as $f$
  select pg_temp.tx_corre(p_quien, format('select jsonb_build_object(''version'', public.transicion_crear(%L, %L, %L, %L, %L, %L, %L))',
    p_id, p_flujo, pg_temp.tx_version(p_flujo), p_de, p_a, p_accion, p_nota));
$f$;

create or replace function pg_temp.tx_guardar(p_quien uuid, p_t uuid, p_cambios jsonb) returns jsonb language sql as $f$
  select pg_temp.tx_corre(p_quien, format('select jsonb_build_object(''version'', public.transicion_guardar(%L, %L, %L::jsonb))',
    p_t, (select pg_temp.tx_version(flujo_id) from public.fases_transiciones where id = p_t), p_cambios));
$f$;

create or replace function pg_temp.tx_fase_roles(p_quien uuid, p_fase uuid, p_version timestamptz, p_roles uuid[]) returns jsonb language sql as $f$
  select pg_temp.tx_corre(p_quien, format('select jsonb_build_object(''version'', public.fase_roles_poner(%L, %L, %L::uuid[]))', p_fase, p_version, p_roles));
$f$;

create or replace function pg_temp.tx_transicion_roles(p_quien uuid, p_t uuid, p_version timestamptz, p_roles uuid[]) returns jsonb language sql as $f$
  select pg_temp.tx_corre(p_quien, format('select jsonb_build_object(''version'', public.transicion_roles_poner(%L, %L, %L::uuid[]))', p_t, p_version, p_roles));
$f$;

create or replace function pg_temp.tx_es(p_que text, p_r jsonb, p_estado text, p_mensaje text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje or p_r ->> 'hint' is distinct from p_hint then
    raise exception '%: debía dar % «%» (hint %) y dio %', p_que, p_estado, p_mensaje, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.tx_pasa(p_que text, p_r jsonb) returns timestamptz language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'version' is null then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return (p_r ->> 'version')::timestamptz;
end $f$;

-- @test transiciones: crear devuelve la versión, recorta la acción, guarda la nota y rechaza la forma errada con hint (D-1)
begin;
do $$
declare
  a uuid := pg_temp.tx_flujo(); config uuid := pg_temp.tx_persona(array['flujos.configurar']);
  f uuid := pg_temp.tx_fase(a, 'TX uno', 10); g uuid := pg_temp.tx_fase(a, 'TX dos', 20);
  jubilada uuid := pg_temp.tx_fase(a, 'TX jubilada', 30, false);
  id1 uuid := gen_random_uuid(); id2 uuid := gen_random_uuid(); v0 timestamptz := pg_temp.tx_version(a); v timestamptz; fila public.fases_transiciones;
begin
  v := pg_temp.tx_pasa('D-1 crear', pg_temp.tx_crear(config, id1, a, f, g, '  Despachar  ', true));
  if not v > v0 or v is distinct from pg_temp.tx_version(a) then raise exception 'D-1: la versión devuelta % no es la nueva del flujo', v; end if;
  select * into strict fila from public.fases_transiciones where id = id1;
  if fila.accion is distinct from 'Despachar' or not fila.nota_obligatoria or fila.flujo_id is distinct from a then
    raise exception 'D-1: la transición guardada no es la esperada: %', to_jsonb(fila);
  end if;
  perform pg_temp.tx_pasa('D-1 acción vacía y origen jubilado', pg_temp.tx_crear(config, id2, a, jubilada, f, '   ', null));
  select * into strict fila from public.fases_transiciones where id = id2;
  if fila.accion is not null or fila.nota_obligatoria then raise exception 'D-1: la acción vacía o la nota nula no quedaron así: %', to_jsonb(fila); end if;
  perform pg_temp.tx_es('D-1 acción larga', pg_temp.tx_crear(config, gen_random_uuid(), a, g, f, repeat('x', 41), false), '22023',
    'La acción tiene hasta 40 caracteres.', 'accion');
  perform pg_temp.tx_es('D-1 misma fase', pg_temp.tx_crear(config, gen_random_uuid(), a, g, g, null, false), '22023',
    'Una transición no puede volver a la misma fase.', 'a_fase_id');
  perform pg_temp.tx_es('D-1 sin id', pg_temp.tx_crear(config, null, a, g, f, null, false), '22023', 'Falta el id de la transición.', 'id');
  perform pg_temp.tx_es('D-1 sin origen', pg_temp.tx_crear(config, gen_random_uuid(), a, null, f, null, false), '22023', 'Elige la fase de origen.', 'de_fase_id');
  perform pg_temp.tx_es('D-1 sin destino', pg_temp.tx_crear(config, gen_random_uuid(), a, g, null, null, false), '22023', 'Elige la fase destino.', 'a_fase_id');
end $$;
rollback;

-- @test transiciones: guardar rechaza la forma errada con hint, cambia acción y nota y deja su actividad (D-2)
begin;
do $$
declare
  a uuid := pg_temp.tx_flujo(); config uuid := pg_temp.tx_persona(array['flujos.configurar']);
  f uuid := pg_temp.tx_fase(a, 'TX uno', 10); g uuid := pg_temp.tx_fase(a, 'TX dos', 20); t uuid := pg_temp.tx_transicion(a, f, g);
  v0 timestamptz := pg_temp.tx_version(a); v timestamptz; fila public.fases_transiciones;
begin
  perform pg_temp.tx_es('D-2 vacío', pg_temp.tx_guardar(config, t, '{}'), '22023', 'No hay cambios para guardar.');
  perform pg_temp.tx_es('D-2 no objeto', pg_temp.tx_guardar(config, t, '[]'), '22023', 'Faltan los datos de la transición.');
  perform pg_temp.tx_es('D-2 destino', pg_temp.tx_guardar(config, t, jsonb_build_object('a_fase_id', f)), '22023',
    'El dato «a_fase_id» no se cambia desde una transición.', 'a_fase_id');
  perform pg_temp.tx_es('D-2 nota texto', pg_temp.tx_guardar(config, t, '{"nota_obligatoria": "si"}'), '22023',
    'El dato «nota_obligatoria» no tiene el formato esperado.', 'nota_obligatoria');
  perform pg_temp.tx_es('D-2 nota nula', pg_temp.tx_guardar(config, t, '{"nota_obligatoria": null}'), '22023',
    'El dato «nota_obligatoria» no tiene el formato esperado.', 'nota_obligatoria');
  perform pg_temp.tx_es('D-2 acción número', pg_temp.tx_guardar(config, t, '{"accion": 3}'), '22023',
    'El dato «accion» no tiene el formato esperado.', 'accion');
  perform pg_temp.tx_es('D-2 acción larga', pg_temp.tx_guardar(config, t, jsonb_build_object('accion', repeat('x', 41))), '22023',
    'La acción tiene hasta 40 caracteres.', 'accion');
  if pg_temp.tx_version(a) is distinct from v0 then raise exception 'D-2: un error de forma movió la versión'; end if;
  v := pg_temp.tx_pasa('D-2 guardar', pg_temp.tx_guardar(config, t, '{"accion": " Cerrar ", "nota_obligatoria": true}'));
  select * into strict fila from public.fases_transiciones where id = t;
  if fila.accion is distinct from 'Cerrar' or not fila.nota_obligatoria or fila.a_fase_id is distinct from g
     or v is distinct from pg_temp.tx_version(a) or not v > v0 then
    raise exception 'D-2: lo guardado no es lo esperado: % (versión %)', to_jsonb(fila), v;
  end if;
  perform pg_temp.tx_pasa('D-2 acción nula', pg_temp.tx_guardar(config, t, '{"accion": null}'));
  if (select accion from public.fases_transiciones where id = t) is not null then raise exception 'D-2: la acción nula no quedó nula'; end if;
  if not exists (select 1 from public.actividad where accion = 'fases_transiciones.update' and registro_id = t::text and actor_id = config) then
    raise exception 'D-2: guardar no dejó la actividad de trg_auditar';
  end if;
end $$;
rollback;

-- @test transiciones: eliminar borra la transición y sus roles y devuelve la versión (D-3)
begin;
do $$
declare
  a uuid := pg_temp.tx_flujo(); config uuid := pg_temp.tx_persona(array['flujos.configurar']);
  f uuid := pg_temp.tx_fase(a, 'TX uno', 10); g uuid := pg_temp.tx_fase(a, 'TX dos', 20); t uuid := pg_temp.tx_transicion(a, f, g);
  v0 timestamptz; v timestamptz;
begin
  insert into public.fases_transiciones_roles (transicion_id, rol_id) values (t, pg_temp.tx_rol_de(config));
  v0 := pg_temp.tx_version(a);
  v := pg_temp.tx_pasa('D-3 eliminar', pg_temp.tx_corre(config, format('select jsonb_build_object(''version'', public.transicion_eliminar(%L, %L))', t, v0)));
  if exists (select 1 from public.fases_transiciones where id = t) or exists (select 1 from public.fases_transiciones_roles where transicion_id = t) then
    raise exception 'D-3: la transición o sus roles siguen';
  end if;
  if not v > v0 or v is distinct from pg_temp.tx_version(a) then raise exception 'D-3: la versión devuelta % no es la nueva del flujo', v; end if;
end $$;
rollback;

-- @test transiciones: una lista de roles errada da 22023 hint roles sin tocar la anterior, y los repetidos se colapsan (D-4)
begin;
do $$
declare
  a uuid := pg_temp.tx_flujo(); config uuid := pg_temp.tx_persona(array['flujos.configurar']);
  f uuid := pg_temp.tx_fase(a, 'TX uno', 10); g uuid := pg_temp.tx_fase(a, 'TX dos', 20); t uuid := pg_temp.tx_transicion(a, f, g);
  r uuid := pg_temp.tx_rol_de(config); muchos uuid[]; v timestamptz;
  poner_fase constant text := 'select jsonb_build_object(''version'', public.fase_roles_poner(%L, %L, %L::uuid[]))';
  poner_trans constant text := 'select jsonb_build_object(''version'', public.transicion_roles_poner(%L, %L, %L::uuid[]))';
begin
  insert into public.roles (clave, nombre) select 'tx_muchos_' || n, 'TX muchos ' || n from generate_series(1, 101) n;
  muchos := array(select id from public.roles where clave like 'tx\_muchos\_%');
  v := pg_temp.tx_pasa('D-4 primera', pg_temp.tx_corre(config, format(poner_fase, g, pg_temp.tx_version(a), array[r, r])));
  if (select array_agg(rol_id) from public.fases_roles where fase_id = g) is distinct from array[r] then
    raise exception 'D-4: los repetidos no se colapsaron en una fila';
  end if;
  perform pg_temp.tx_es('D-4 nula', pg_temp.tx_corre(config, format(poner_fase, g, v, null)), '22023', 'Faltan los roles.', 'roles');
  perform pg_temp.tx_es('D-4 con un nulo', pg_temp.tx_corre(config, format(poner_fase, g, v, array[r, null])), '22023', 'Hay un rol vacío en la lista.', 'roles');
  perform pg_temp.tx_es('D-4 101', pg_temp.tx_corre(config, format(poner_fase, g, v, muchos)), '22023', 'Elige hasta 100 roles.', 'roles');
  perform pg_temp.tx_es('D-4 inexistente', pg_temp.tx_corre(config, format(poner_fase, g, v, array[gen_random_uuid()])), '22023',
    'Uno de los roles elegidos ya no existe. Recarga e intenta de nuevo.', 'roles');
  perform pg_temp.tx_es('D-4 inexistente en la transición', pg_temp.tx_corre(config, format(poner_trans, t, v, array[r, gen_random_uuid()])), '22023',
    'Uno de los roles elegidos ya no existe. Recarga e intenta de nuevo.', 'roles');
  if (select array_agg(rol_id) from public.fases_roles where fase_id = g) is distinct from array[r]
     or exists (select 1 from public.fases_transiciones_roles where transicion_id = t) or pg_temp.tx_version(a) is distinct from v then
    raise exception 'D-4: una lista errada tocó los roles o movió la versión';
  end if;
  perform pg_temp.tx_pasa('D-4 cien', pg_temp.tx_corre(config, format(poner_trans, t, v, muchos[1:100])));
  if (select count(*) from public.fases_transiciones_roles where transicion_id = t) <> 100 then raise exception 'D-4: cien roles debían caber'; end if;
end $$;
rollback;

-- @test transiciones: la actividad guarda el cambio de roles con antes, después y quién; la misma lista no deja fila y mueve la versión (D-5)
begin;
do $$
declare
  a uuid := pg_temp.tx_flujo(); config uuid := pg_temp.tx_persona(array['flujos.configurar']);
  f uuid := pg_temp.tx_fase(a, 'TX uno', 10); g uuid := pg_temp.tx_fase(a, 'TX dos', 20); t uuid := pg_temp.tx_transicion(a, f, g);
  r uuid := pg_temp.tx_rol_de(config); v timestamptz := pg_temp.tx_version(a); v2 timestamptz; fila public.actividad;
begin
  v := pg_temp.tx_pasa('D-5 fase', pg_temp.tx_fase_roles(config, g, v, array[r]));
  select * into strict fila from public.actividad where accion = 'fase.roles_cambiados' and registro_id = g::text;
  if fila.tabla is distinct from 'fases' or fila.actor_id is distinct from config
     or fila.antes is distinct from '{"roles": []}'::jsonb or fila.despues is distinct from jsonb_build_object('roles', jsonb_build_array(r)) then
    raise exception 'D-5: la actividad de la fase no es la esperada: %', to_jsonb(fila);
  end if;
  v2 := pg_temp.tx_pasa('D-5 fase igual', pg_temp.tx_fase_roles(config, g, v, array[r, r]));
  if not v2 > v or (select count(*) from public.actividad where accion = 'fase.roles_cambiados' and registro_id = g::text) <> 1 then
    raise exception 'D-5: la misma lista debía mover la versión sin dejar otra fila';
  end if;
  v := pg_temp.tx_pasa('D-5 transición', pg_temp.tx_transicion_roles(config, t, v2, array[r]));
  select * into strict fila from public.actividad where accion = 'transicion.roles_cambiados' and registro_id = t::text;
  if fila.tabla is distinct from 'fases_transiciones' or fila.actor_id is distinct from config
     or fila.antes is distinct from '{"roles": []}'::jsonb or fila.despues is distinct from jsonb_build_object('roles', jsonb_build_array(r)) then
    raise exception 'D-5: la actividad de la transición no es la esperada: %', to_jsonb(fila);
  end if;
  v := pg_temp.tx_pasa('D-5 transición vacía', pg_temp.tx_transicion_roles(config, t, v, '{}'));
  if not exists (select 1 from public.actividad where accion = 'transicion.roles_cambiados' and registro_id = t::text
                 and antes = jsonb_build_object('roles', jsonb_build_array(r)) and despues = '{"roles": []}'::jsonb) then
    raise exception 'D-5: vaciar la lista de la transición no dejó su actividad';
  end if;
end $$;
rollback;
