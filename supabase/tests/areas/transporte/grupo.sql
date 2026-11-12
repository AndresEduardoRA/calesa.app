-- Leer y aplicar a un grupo de transporte (paso 6.07-1, C14–C19, D13, D18). No depende de otro archivo (`SOLO=areas/transporte/grupo.sql`). Los
-- ayudantes son copia de `guardar.sql`. Cada bloque abre su transacción y la revierte. Dos sesiones a la vez: `carreras.mjs`.
--
-- Qué asegura:
--   G1. Grupo de 3 con una versión cambiada: PT409 y ninguna de las 3 cambia.
--   G2. Una del grupo en un origen sin la clave: 42501 y ninguna cambia; quien la ve la recibe en `transporte_grupo` con `editable = false`. Con la clave
--       de editar en ese origen pero sin `logistica.ver` ahí, también 42501.
--   G3. El grupo ganó una unidad después de leerlo: PT409.
--   G4. Aplicar la naviera a las 3: las 3 la tienen y mueven su versión; las versiones devueltas sirven para aplicar otra vez.
--   G5. Quien ve 2 de 3: dos unidades, `hay_ocultas = true` y ninguna clave con un número; sin `logistica.ver` ni `repuestos.ver`, 42501 al leer, y sin
--       la clave de editar, 42501 al aplicar, exista o no el booking.
--   G6. Una unidad del grupo en la papelera no es del grupo (D19): no cuenta como oculta y el grupo se sigue aplicando sin ella.

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

-- Tres vehículos del origen `o` en su fase, con el mismo booking y contenedor (por la RPC, como `p`). Devuelve sus ids en orden de transporte.
create or replace function pg_temp.trn_grupo(t jsonb, p uuid, p_booking text, p_contenedor text) returns uuid[] language plpgsql as $f$
declare v uuid; i int;
begin
  for i in 1..3 loop
    insert into public.vehiculos (origen_id, titulo, fase_id) values ((t ->> 'o')::uuid, 'tr grupo ' || i, (t ->> 'fase')::uuid) returning id into v;
    perform pg_temp.trn_pasa('grupo ' || i, pg_temp.trn_guardar(p, v, null, jsonb_build_object('booking', p_booking, 'contenedor', p_contenedor)));
  end loop;
  return (select array_agg(x.vehiculo_id order by x.id) from public.transportes x where x.booking = upper(p_booking));
end $f$;

create or replace function pg_temp.trn_leer(p_quien uuid, p_tipo text, p_clave text) returns jsonb language sql as $f$
  select pg_temp.trn_corre(p_quien, format('select public.transporte_grupo(%L, %L)', p_tipo, p_clave));
$f$;

-- Las versiones de lo leído: {transporte_id: actualizado_en}.
create or replace function pg_temp.trn_esperadas(g jsonb) returns jsonb language sql as $f$
  select coalesce(jsonb_object_agg(u ->> 'transporte_id', u ->> 'actualizado_en'), '{}'::jsonb) from jsonb_array_elements(g -> 'unidades') u;
$f$;

create or replace function pg_temp.trn_aplicar(p_quien uuid, p_tipo text, p_clave text, p_esperadas jsonb, p_cambios jsonb) returns jsonb language sql as $f$
  select pg_temp.trn_corre(p_quien, format('select public.transporte_grupo_aplicar(%L, %L, %L, %L)', p_tipo, p_clave, p_esperadas, p_cambios));
$f$;

-- Las filas del grupo, para comparar antes y después.
create or replace function pg_temp.trn_foto(p_booking text) returns jsonb language sql as $f$
  select jsonb_agg(jsonb_build_object('id', x.id, 'naviera_id', x.naviera_id, 'contenedor', x.contenedor, 'eta_el', x.eta_el, 'v', x.actualizado_en)
                   order by x.id)
    from public.transportes x where x.booking = p_booking;
$f$;

-- @test transporte: aplicar a un grupo de 3 con una versión cambiada no cambia ninguna (G1)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p uuid; g jsonb; e jsonb; antes jsonb; r jsonb; k text;
begin
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  perform pg_temp.trn_grupo(t, p, 'BKG1', 'CONT1');
  g := pg_temp.trn_leer(p, 'booking', ' bkg1 ');
  if jsonb_array_length(g -> 'unidades') <> 3 then raise exception 'G1: debía leer 3 y leyó %', g; end if;
  e := pg_temp.trn_esperadas(g);
  k := (select min(x) from jsonb_object_keys(e) x);
  e := jsonb_set(e, array[k], to_jsonb((e ->> k)::timestamptz - interval '1 second'));
  antes := pg_temp.trn_foto('BKG1');
  r := pg_temp.trn_aplicar(p, 'booking', 'BKG1', e, '{"eta_el": "2026-12-24"}');
  perform pg_temp.trn_es('G1 una cambiada', r, 'PT409');
  if pg_temp.trn_foto('BKG1') is distinct from antes then raise exception 'G1: ninguna debía cambiar'; end if;
end $$;
rollback;

-- @test transporte: una unidad que no puedo editar frena todo el grupo con 42501 (G2)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); duena uuid; p uuid; g jsonb; antes jsonb; r jsonb; v_ajeno uuid;
begin
  duena := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar@' || (t ->> 'o')]);
  perform pg_temp.trn_grupo(t, duena, 'BKG2', null);
  insert into public.vehiculos (origen_id, titulo) values ((t ->> 'o2')::uuid, 'tr ajeno') returning id into v_ajeno;
  perform pg_temp.trn_pasa('G2 ajeno', pg_temp.trn_guardar(duena, v_ajeno, null, '{"booking": "BKG2"}'));
  g := pg_temp.trn_leer(p, 'booking', 'BKG2');
  if jsonb_array_length(g -> 'unidades') <> 4 or g -> 'hay_ocultas' <> 'false'::jsonb then raise exception 'G2: debía ver las 4: %', g; end if;
  if (select u -> 'editable' from jsonb_array_elements(g -> 'unidades') u where u ->> 'vehiculo_id' = v_ajeno::text) is distinct from 'false'::jsonb then
    raise exception 'G2: la ajena debía llegar con editable = false: %', g;
  end if;
  antes := pg_temp.trn_foto('BKG2');
  r := pg_temp.trn_aplicar(p, 'booking', 'BKG2', pg_temp.trn_esperadas(g), '{"eta_el": "2026-12-24"}');
  perform pg_temp.trn_es('G2 sin la clave de una', r, '42501');
  if pg_temp.trn_foto('BKG2') is distinct from antes then raise exception 'G2: ninguna debía cambiar'; end if;
  -- Edita en los dos orígenes pero no ve el segundo: con las versiones de quien ve todo, igual 42501.
  p := pg_temp.trn_persona(array['logistica.ver@' || (t ->> 'o'), 'logistica.transporte.editar']);
  r := pg_temp.trn_aplicar(p, 'booking', 'BKG2', pg_temp.trn_esperadas(pg_temp.trn_leer(duena, 'booking', 'BKG2')), '{"eta_el": "2026-12-24"}');
  perform pg_temp.trn_es('G2 edita y no ve una', r, '42501');
  if pg_temp.trn_foto('BKG2') is distinct from antes then raise exception 'G2: ninguna debía cambiar'; end if;
end $$;
rollback;

-- @test transporte: si el grupo ganó una unidad después de leerlo, PT409 (G3)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p uuid; g jsonb; r jsonb; v4 uuid;
begin
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  perform pg_temp.trn_grupo(t, p, 'BKG3', null);
  g := pg_temp.trn_leer(p, 'booking', 'BKG3');
  insert into public.vehiculos (origen_id, titulo, fase_id) values ((t ->> 'o')::uuid, 'tr cuarto', (t ->> 'fase')::uuid) returning id into v4;
  perform pg_temp.trn_pasa('G3 cuarto', pg_temp.trn_guardar(p, v4, null, '{"booking": "BKG3"}'));
  r := pg_temp.trn_aplicar(p, 'booking', 'BKG3', pg_temp.trn_esperadas(g), '{"eta_el": "2026-12-24"}');
  perform pg_temp.trn_es('G3 ganó una', r, 'PT409');
  if exists (select 1 from public.transportes where booking = 'BKG3' and eta_el is not null) then raise exception 'G3: ninguna debía cambiar'; end if;
end $$;
rollback;

-- @test transporte: aplicar la naviera a las 3 y otra vez con las versiones devueltas (G4)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p uuid; g jsonb; r jsonb; nav uuid; e jsonb;
begin
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  insert into public.navieras (nombre) values ('tr naviera') returning id into nav;
  perform pg_temp.trn_grupo(t, p, 'BKG4', null);
  g := pg_temp.trn_leer(p, 'booking', 'BKG4');
  -- Las versiones de antes, corridas un segundo atrás sin triggers: `set_actualizado_en()` pone now(), la misma en toda la transacción, y así se ve
  -- que se movieron.
  set local session_replication_role = replica;
  update public.transportes set actualizado_en = actualizado_en - interval '1 second' where booking = 'BKG4';
  set local session_replication_role = origin;
  g := pg_temp.trn_leer(p, 'booking', 'BKG4');
  r := pg_temp.trn_aplicar(p, 'booking', 'BKG4', pg_temp.trn_esperadas(g), jsonb_build_object('naviera_id', nav));
  if r ? 'error' or r -> 'sin_cambios' <> 'false'::jsonb or jsonb_array_length(r -> 'unidades') <> 3 then raise exception 'G4: debía aplicar: %', r; end if;
  if (select count(*) from public.transportes where booking = 'BKG4' and naviera_id = nav) <> 3 then raise exception 'G4: las 3 debían tener la naviera'; end if;
  if exists (select 1 from jsonb_array_elements(r -> 'unidades') u, jsonb_array_elements(g -> 'unidades') w
              where u ->> 'transporte_id' = w ->> 'transporte_id' and (u ->> 'actualizado_en')::timestamptz = (w ->> 'actualizado_en')::timestamptz) then
    raise exception 'G4: las versiones debían moverse';
  end if;
  e := (select jsonb_object_agg(u ->> 'transporte_id', u ->> 'actualizado_en') from jsonb_array_elements(r -> 'unidades') u);
  r := pg_temp.trn_aplicar(p, 'booking', 'BKG4', e, '{"eta_el": "2026-12-24"}');
  if r ? 'error' then raise exception 'G4: con las versiones devueltas debía aplicar: %', r; end if;
end $$;
rollback;

-- @test transporte: quien ve 2 de 3 lee dos y sólo sabe que hay ocultas; sin ver la logística, 42501 (G5)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); duena uuid; p uuid; nadie uuid; g jsonb; v_ajeno uuid; ids uuid[];
begin
  duena := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  p := pg_temp.trn_persona(array['logistica.ver@' || (t ->> 'o')]);
  nadie := pg_temp.trn_persona(array['leads.ver']);
  ids := pg_temp.trn_grupo(t, duena, 'BKG5', null);
  update public.vehiculos set origen_id = (t ->> 'o2')::uuid, fase_id = null where id = ids[3];
  g := pg_temp.trn_leer(p, 'booking', 'BKG5');
  if (select array_agg(k order by k) from jsonb_object_keys(g) k) is distinct from array['clave', 'hay_mas', 'hay_ocultas', 'tipo', 'unidades'] then
    raise exception 'G5: claves de más o de menos: %', g;
  end if;
  if jsonb_array_length(g -> 'unidades') <> 2 or g -> 'hay_ocultas' <> 'true'::jsonb or g -> 'hay_mas' <> 'false'::jsonb then
    raise exception 'G5: debía leer 2 con hay_ocultas: %', g;
  end if;
  if exists (select 1 from jsonb_array_elements(g -> 'unidades') u where u ->> 'vehiculo_id' = ids[3]::text) then raise exception 'G5: la oculta no debía llegar'; end if;
  perform pg_temp.trn_es('G5 sin ver la logística', pg_temp.trn_leer(nadie, 'booking', 'BKG5'), '42501');
  perform pg_temp.trn_es('G5 aplicar sin la clave', pg_temp.trn_aplicar(nadie, 'booking', 'BKG5', pg_temp.trn_esperadas(pg_temp.trn_leer(duena, 'booking', 'BKG5')),
                                                                    '{"eta_el": "2026-12-24"}'), '42501');
  perform pg_temp.trn_es('G5 aplicar sin la clave a uno que no existe',
                         pg_temp.trn_aplicar(nadie, 'booking', 'NOEXISTE', jsonb_build_object(gen_random_uuid(), now()), '{"eta_el": "2026-12-24"}'), '42501');
end $$;
rollback;

-- @test transporte: una unidad del grupo en la papelera no cuenta ni frena aplicar (G6)
begin;
do $$
declare t jsonb := pg_temp.trn_terreno(); p uuid; g jsonb; r jsonb; ids uuid[];
begin
  p := pg_temp.trn_persona(array['logistica.ver', 'logistica.transporte.editar']);
  ids := pg_temp.trn_grupo(t, p, 'BKG6', null);
  update public.vehiculos set eliminado_en = now() where id = ids[2];
  g := pg_temp.trn_leer(p, 'booking', 'BKG6');
  if jsonb_array_length(g -> 'unidades') <> 2 or g -> 'hay_ocultas' <> 'false'::jsonb then raise exception 'G6: debía leer 2 sin ocultas: %', g; end if;
  r := pg_temp.trn_aplicar(p, 'booking', 'BKG6', pg_temp.trn_esperadas(g), '{"eta_el": "2026-12-24"}');
  if r ? 'error' or jsonb_array_length(r -> 'unidades') <> 2 then raise exception 'G6: debía aplicar a las 2 vivas: %', r; end if;
  if (select eta_el from public.transportes where vehiculo_id = ids[2]) is not null then raise exception 'G6: la de la papelera no debía cambiar'; end if;
end $$;
rollback;
