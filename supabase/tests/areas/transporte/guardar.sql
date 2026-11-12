-- Guardar el transporte de una unidad (paso 6.07-1, C1–C9). No depende de otro archivo (`SOLO=areas/transporte/guardar.sql`). Cada bloque abre su
-- transacción y la revierte. Lo que la fase exige: `exigido.sql`; el grupo: `grupo.sql`; dos sesiones a la vez: `carreras.mjs`.
--
-- Qué asegura:
--   T1. Con `logistica.transporte.editar` sólo en otro origen: 42501 y ninguna fila; con la clave del origen, crea. Un repuesto sin `repuestos.editar`: 42501.
--   T2. Crear con la esperada nula da versión; otra vez con la esperada nula, PT409 (aun sin diferencias); con la vieja tras un cambio, PT409 y el valor
--       no cambia; sin diferencia, la misma versión y `sin_cambios`.
--   T3. El contenedor se normaliza (mayúsculas, sin espacios); un carácter fuera de la lista da 22023 con hint; una clave desconocida, 22023 con la clave.
--   T4. La regla `transporte` apagada: 23514 hint transporte; contenedor nuevo con la fase sin `permite_contenedor`: 23514; el ya guardado no impide
--       cambiar la ETA.
--   T5. Naviera fuera de una oferta no vacía: 23514 hint naviera_id; la guardada que salió de la oferta no impide cambiar otra cosa.

-- La primera cuenta de una base vacía queda dueña (con `SOLO=`): una de relleno antes, para que ninguna de la prueba lo sea.
create or replace function pg_temp.trn_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-tr@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('tr_' || substr(v_id::text, 1, 8), 'tr ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, 'todos');
  end loop;
  return v_id;
end $f$;

-- Un origen (con su flujo y sus reglas encendidas), una fase y un vehículo en ella.
create or replace function pg_temp.trn_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; fl uuid; fa uuid; v uuid; v2 uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('tr_' || s, 'tr origen ' || s, 'manual') returning id into o;
  insert into public.origenes (clave, nombre, tipo) values ('tr2_' || s, 'tr origen 2 ' || s, 'manual') returning id into o2;
  select id into fl from public.flujos where origen_id = o;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fl, 'tr en tránsito', 1, true) returning id into fa;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'tr vehículo', fa) returning id into v;
  insert into public.vehiculos (origen_id, titulo) values (o2, 'tr vehículo 2') returning id into v2;
  return jsonb_build_object('o', o, 'o2', o2, 'flujo', fl, 'fase', fa, 'v', v, 'v2', v2);
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.trn_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.trn_guardar(p_quien uuid, p_v uuid, p_esperada timestamptz, p_cambios jsonb, p_r uuid default null) returns jsonb
language sql as $f$
  select pg_temp.trn_corre(p_quien, format('select public.transporte_guardar(%L, %L, %L, %L)', p_v, p_r, p_esperada, p_cambios));
$f$;

create or replace function pg_temp.trn_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.trn_pasa(p_que text, p_r jsonb) returns timestamptz language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'actualizado_en' is null then raise exception '%: debía guardar y dio %', p_que, p_r; end if;
  return (p_r ->> 'actualizado_en')::timestamptz;
end $f$;

-- @test transporte: sin la clave del origen no guarda; con ella crea; un repuesto sin repuestos.editar no guarda (T1)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); ajena uuid; propia uuid; r jsonb; pr uuid; item uuid;
begin
  ajena := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar@' || (t ->> 'o2')]);
  propia := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar@' || (t ->> 'o')]);
  r := pg_temp.trn_guardar(ajena, (t ->> 'v')::uuid, null, '{"booking": "bk1"}');
  perform pg_temp.trn_es('T1 otro origen', r, '42501');
  if exists (select 1 from public.transportes where vehiculo_id = (t ->> 'v')::uuid) then raise exception 'T1: no debía crear la fila'; end if;
  r := pg_temp.trn_guardar(propia, (t ->> 'v')::uuid, null, '{"booking": "bk1"}');
  perform pg_temp.trn_pasa('T1 su origen', r);
  if (select booking from public.transportes where vehiculo_id = (t ->> 'v')::uuid) is distinct from 'BK1' then raise exception 'T1: no guardó el booking'; end if;
  insert into public.repuestos_proyectos (vehiculo_etiqueta) values ('tr proyecto') returning id into pr;
  insert into public.repuestos_items (proyecto_id, descripcion) values (pr, 'tr ítem') returning id into item;
  r := pg_temp.trn_guardar(propia, null, null, '{"booking": "bk2"}', item);
  perform pg_temp.trn_es('T1 repuesto', r, '42501');
end $$;
rollback;

-- @test transporte: crear con la esperada nula; otra vez nula o con la vieja da PT409; sin diferencia no mueve la versión (T2)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p uuid; r jsonb; v1 timestamptz; v2 timestamptz;
begin
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  v1 := pg_temp.trn_pasa('T2 crear', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, null, '{"booking": "bk1"}'));
  r := pg_temp.trn_guardar(p, (t ->> 'v')::uuid, null, '{"booking": "bk9"}');
  perform pg_temp.trn_es('T2 crear otra vez', r, 'PT409');
  r := pg_temp.trn_guardar(p, (t ->> 'v')::uuid, null, '{"booking": "bk1"}');
  perform pg_temp.trn_es('T2 crear otra vez sin diferencias', r, 'PT409');
  -- La versión la pone el trigger con now(), la misma en toda la transacción: la «vieja» es una distinta de la vigente.
  v2 := pg_temp.trn_pasa('T2 cambiar', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, v1, '{"eta_el": "2026-12-01"}'));
  r := pg_temp.trn_guardar(p, (t ->> 'v')::uuid, v2 - interval '1 second', '{"eta_el": "2026-12-24"}');
  perform pg_temp.trn_es('T2 versión vieja', r, 'PT409');
  if (select eta_el from public.transportes where vehiculo_id = (t ->> 'v')::uuid) <> date '2026-12-01' then raise exception 'T2: la vieja no debía escribir'; end if;
  r := pg_temp.trn_guardar(p, (t ->> 'v')::uuid, v2, '{"eta_el": "2026-12-01"}');
  if r -> 'sin_cambios' is distinct from 'true'::jsonb or (r ->> 'actualizado_en')::timestamptz <> v2 then
    raise exception 'T2: sin diferencia debía devolver la misma versión y sin_cambios: %', r;
  end if;
end $$;
rollback;

-- @test transporte: contenedor normalizado; caracteres y claves fuera de la lista dan 22023 (T3)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p uuid; r jsonb;
begin
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  perform pg_temp.trn_pasa('T3 normalizar', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, null, '{"contenedor": " msku 123\t4567 "}'));
  if (select contenedor from public.transportes where vehiculo_id = (t ->> 'v')::uuid) is distinct from 'MSKU1234567' then
    raise exception 'T3: debía guardar MSKU1234567';
  end if;
  r := pg_temp.trn_guardar(p, (t ->> 'v2')::uuid, null, '{"contenedor": "ab#1"}');
  perform pg_temp.trn_es('T3 carácter', r, '22023', 'contenedor');
  r := pg_temp.trn_guardar(p, (t ->> 'v2')::uuid, null, '{"sigue_al_vehiculo": "true"}');
  perform pg_temp.trn_es('T3 clave desconocida', r, '22023', 'sigue_al_vehiculo');
  r := pg_temp.trn_guardar(p, (t ->> 'v2')::uuid, null, '{"eta_el": "mañana"}');
  perform pg_temp.trn_es('T3 fecha', r, '22023', 'eta_el');
  r := pg_temp.trn_guardar(p, (t ->> 'v2')::uuid, null, '{"eta_el": "today"}');
  perform pg_temp.trn_es('T3 fecha que no es AAAA-MM-DD', r, '22023', 'eta_el');
end $$;
rollback;

-- @test transporte: la regla transporte apagada y la fase sin permite_contenedor frenan lo nuevo, no lo guardado (T4)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p uuid; r jsonb; v1 timestamptz;
begin
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  v1 := pg_temp.trn_pasa('T4 contenedor', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, null, '{"contenedor": "MSKU1"}'));
  update public.fases set permite_contenedor = false where id = (t ->> 'fase')::uuid;
  r := pg_temp.trn_guardar(p, (t ->> 'v')::uuid, v1, '{"contenedor": "MSKU2"}');
  perform pg_temp.trn_es('T4 permite_contenedor', r, '23514', 'contenedor');
  v1 := pg_temp.trn_pasa('T4 la ETA con el guardado', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, v1, '{"eta_el": "2026-12-01"}'));
  update public.flujos_reglas set activa = false where flujo_id = (t ->> 'flujo')::uuid and regla = 'transporte';
  r := pg_temp.trn_guardar(p, (t ->> 'v')::uuid, v1, '{"eta_el": "2026-12-02"}');
  perform pg_temp.trn_es('T4 regla apagada', r, '23514', 'transporte');
end $$;
rollback;

-- @test transporte: la oferta frena una naviera nueva, no la guardada (T5)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p uuid; r jsonb; v1 timestamptz; n1 uuid; n2 uuid; n3 uuid;
begin
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  insert into public.navieras (nombre) values ('tr naviera 1') returning id into n1;
  insert into public.navieras (nombre) values ('tr naviera 2') returning id into n2;
  insert into public.navieras (nombre) values ('tr naviera 3') returning id into n3;
  v1 := pg_temp.trn_pasa('T5 sin oferta', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, null, jsonb_build_object('naviera_id', n1)));
  insert into public.flujos_transporte_oferta (flujo_id, tipo, naviera_id) values ((t ->> 'flujo')::uuid, 'naviera', n2);
  r := pg_temp.trn_guardar(p, (t ->> 'v')::uuid, v1, jsonb_build_object('naviera_id', n3));
  perform pg_temp.trn_es('T5 fuera de la oferta', r, '23514', 'naviera_id');
  v1 := pg_temp.trn_pasa('T5 la guardada no frena', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, v1, '{"booking": "BK7"}'));
  perform pg_temp.trn_pasa('T5 la ofrecida', pg_temp.trn_guardar(p, (t ->> 'v')::uuid, v1, jsonb_build_object('naviera_id', n2)));
end $$;
rollback;
