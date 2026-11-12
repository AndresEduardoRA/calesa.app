-- Poner y quitar vehículos de una declaración y el canal que congela (paso 6.07-2, C7–C16). No depende de otro archivo
-- (`SOLO=areas/aduana/composicion.sql`). Los ayudantes son copia de `guardar.sql`. Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   P1. Sin logistica.aduana.gestionar, poner da 42501; con la clave y sin logistica.ver del origen del vehículo, 42501; en las dos, ninguna fila y la
--       versión igual.
--   P2. Agregar 2: dos filas vivas y la versión se mueve; con la vieja, PT409 y nada cambia; quitar 1 deja removido_en; volver a agregarlo revive la
--       misma fila.
--   P3. Un vehículo vivo en «DUI-OTRA»: 23514 vehiculos con el número; también al revivir; la regla aduana apagada: 23514 aduana; la fase sin
--       permite_aduana: 23514 fase.
--   P4. Canal a una declaración vacía: 23514 canal; con un vehículo, verde pasa; después poner da 23514 canal; null y 'azul', 22023 canal; rojo con la
--       versión pasa; con la vieja, PT409; sin la clave, 42501.

-- La primera cuenta de una base vacía queda dueña (con `SOLO=`): una de relleno antes, para que ninguna de la prueba lo sea.
create or replace function pg_temp.adu_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-adu@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('adu_' || substr(v_id::text, 1, 8), 'adu ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, 'todos');
  end loop;
  return v_id;
end $f$;

-- Un origen `manual` con la regla `aduana` encendida, una fase que permite aduana (con v1, v2, v3) y otra que no (con v4); otro origen, sin la regla aduana, con w.
create or replace function pg_temp.adu_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; fl uuid; fa uuid; fb uuid; v1 uuid; v2 uuid; v3 uuid; v4 uuid; w uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('adu_' || s, 'adu origen ' || s, 'manual') returning id into o;
  insert into public.origenes (clave, nombre, tipo) values ('adu2_' || s, 'adu origen 2 ' || s, 'manual') returning id into o2;
  select id into fl from public.flujos where origen_id = o;
  insert into public.flujos_reglas (flujo_id, regla, activa) values (fl, 'aduana', true)
    on conflict (flujo_id, regla) do update set activa = true;
  insert into public.fases (flujo_id, nombre, orden, es_inicial, permite_aduana) values (fl, 'adu en aduana', 1, true, true) returning id into fa;
  insert into public.fases (flujo_id, nombre, orden, permite_aduana) values (fl, 'adu sin aduana', 2, false) returning id into fb;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v1', fa) returning id into v1;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v2', fa) returning id into v2;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v3', fa) returning id into v3;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v4', fb) returning id into v4;
  insert into public.vehiculos (origen_id, titulo) values (o2, 'adu w') returning id into w;
  return jsonb_build_object('o', o, 'o2', o2, 'flujo', fl, 'fase', fa, 'fase_no', fb, 'v1', v1, 'v2', v2, 'v3', v3, 'v4', v4, 'w', w);
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.adu_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.adu_guardar(p_quien uuid, p_id uuid, p_esperada timestamptz, p_datos jsonb) returns jsonb language sql as $f$
  select pg_temp.adu_corre(p_quien, format('select public.declaracion_guardar(%L, %L, %L)', p_id, p_esperada, p_datos));
$f$;

create or replace function pg_temp.adu_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.adu_pasa(p_que text, p_r jsonb) returns timestamptz language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'actualizado_en' is null then raise exception '%: debía guardar y dio %', p_que, p_r; end if;
  return (p_r ->> 'actualizado_en')::timestamptz;
end $f$;

create or replace function pg_temp.adu_poner(p_quien uuid, p_id uuid, p_esperada timestamptz, p_agregar uuid[], p_quitar uuid[] default '{}')
returns jsonb language sql as $f$
  select pg_temp.adu_corre(p_quien, format('select public.declaracion_vehiculos_poner(%L, %L, %L, %L)', p_id, p_esperada, p_agregar, p_quitar));
$f$;

-- Crea una declaración como `p_quien`: {id, actualizado_en}.
create or replace function pg_temp.adu_crear(p_quien uuid, p_numero text) returns jsonb language plpgsql as $f$
declare r jsonb := pg_temp.adu_guardar(p_quien, null, null, jsonb_build_object('numero', p_numero));
begin
  perform pg_temp.adu_pasa('crear ' || p_numero, r);
  return r;
end $f$;

create or replace function pg_temp.adu_vivos(p_id uuid) returns uuid[] language sql as $f$
  select coalesce(array_agg(vehiculo_id order by vehiculo_id), '{}') from public.declaraciones_vehiculos where declaracion_id = p_id and removido_en is null;
$f$;

-- @test aduana: poner pide logistica.aduana.gestionar y ver el vehículo (P1)
begin;
do $$
declare t jsonb := pg_temp.adu_terreno(); sin uuid; ajena uuid; con uuid; d jsonb; r jsonb;
begin
  con := pg_temp.adu_persona(array['logistica.ver', 'logistica.aduana.gestionar']);
  sin := pg_temp.adu_persona(array['logistica.ver']);
  ajena := pg_temp.adu_persona(array['logistica.ver@' || (t ->> 'o2'), 'logistica.aduana.gestionar']);
  d := pg_temp.adu_crear(con, 'DUI-P1');
  r := pg_temp.adu_poner(sin, (d ->> 'id')::uuid, (d ->> 'actualizado_en')::timestamptz, array[(t ->> 'v1')::uuid]);
  perform pg_temp.adu_es('P1 sin la clave', r, '42501');
  r := pg_temp.adu_poner(ajena, (d ->> 'id')::uuid, (d ->> 'actualizado_en')::timestamptz, array[(t ->> 'v1')::uuid]);
  perform pg_temp.adu_es('P1 sin ver el vehículo', r, '42501');
  if cardinality(pg_temp.adu_vivos((d ->> 'id')::uuid)) <> 0
     or (select actualizado_en from public.declaraciones_aduana where id = (d ->> 'id')::uuid) <> (d ->> 'actualizado_en')::timestamptz then
    raise exception 'P1: no debía cambiar nada';
  end if;
end $$;
rollback;

-- @test aduana: agregar mueve la versión; la vieja da PT409; quitar deja removido_en; volver a agregar revive la misma fila (P2)
begin;
do $$
declare t jsonb := pg_temp.adu_terreno(); p uuid; d jsonb; id uuid; v0 timestamptz; v1 timestamptz; v2 timestamptz; v3 timestamptz; r jsonb; a1 timestamptz;
  x1 uuid := (t ->> 'v1')::uuid; x2 uuid := (t ->> 'v2')::uuid;
begin
  p := pg_temp.adu_persona(array['logistica.ver', 'logistica.aduana.gestionar']);
  d := pg_temp.adu_crear(p, 'DUI-P2'); id := (d ->> 'id')::uuid; v0 := (d ->> 'actualizado_en')::timestamptz;
  v1 := pg_temp.adu_pasa('P2 agregar', pg_temp.adu_poner(p, id, v0, array[x2, x1]));
  if v1 <= v0 or pg_temp.adu_vivos(id) <> (select array_agg(u order by u) from unnest(array[x1, x2]) u) then
    raise exception 'P2: debía haber dos vivos y otra versión';
  end if;
  r := pg_temp.adu_poner(p, id, v0, '{}', array[x1]);
  perform pg_temp.adu_es('P2 versión vieja', r, 'PT409');
  if cardinality(pg_temp.adu_vivos(id)) <> 2 then raise exception 'P2: la vieja no debía quitar'; end if;
  select agregado_en into a1 from public.declaraciones_vehiculos where declaracion_id = id and vehiculo_id = x1;
  v2 := pg_temp.adu_pasa('P2 quitar', pg_temp.adu_poner(p, id, v1, '{}', array[x1]));
  if (select removido_en from public.declaraciones_vehiculos where declaracion_id = id and vehiculo_id = x1) is null then
    raise exception 'P2: quitar debía dejar removido_en';
  end if;
  r := pg_temp.adu_poner(p, id, v2, array[x2]);
  if r -> 'sin_cambios' is distinct from 'true'::jsonb or (r ->> 'actualizado_en')::timestamptz <> v2 then
    raise exception 'P2: agregar uno ya vivo no cambia nada: %', r;
  end if;
  v3 := pg_temp.adu_pasa('P2 revivir', pg_temp.adu_poner(p, id, v2, array[x1]));
  if (select count(*) from public.declaraciones_vehiculos where declaracion_id = id and vehiculo_id = x1) <> 1
     or (select removido_en from public.declaraciones_vehiculos where declaracion_id = id and vehiculo_id = x1) is not null
     or v3 <= v2 then
    raise exception 'P2: revivir debía dejar la misma fila viva y mover la versión';
  end if;
  r := pg_temp.adu_poner(p, id, v3, array[x1], array[x1]);
  perform pg_temp.adu_es('P2 el mismo en las dos', r, '22023', 'vehiculos');
end $$;
rollback;

-- @test aduana: un vehículo vivo en otra declaración, la regla aduana apagada o la fase sin permite_aduana dan 23514 (P3)
begin;
do $$
declare t jsonb := pg_temp.adu_terreno(); p uuid; d jsonb; o jsonb; id uuid; v timestamptz; r jsonb; vo timestamptz;
  x1 uuid := (t ->> 'v1')::uuid; x2 uuid := (t ->> 'v2')::uuid;
begin
  p := pg_temp.adu_persona(array['logistica.ver', 'logistica.aduana.gestionar']);
  o := pg_temp.adu_crear(p, 'DUI-OTRA');
  perform pg_temp.adu_pasa('P3 en la otra', pg_temp.adu_poner(p, (o ->> 'id')::uuid, (o ->> 'actualizado_en')::timestamptz, array[x1]));
  d := pg_temp.adu_crear(p, 'DUI-P3'); id := (d ->> 'id')::uuid; v := (d ->> 'actualizado_en')::timestamptz;
  r := pg_temp.adu_poner(p, id, v, array[x1]);
  perform pg_temp.adu_es('P3 vivo en otra', r, '23514', 'vehiculos');
  if strpos(r ->> 'mensaje', '«DUI-OTRA»') = 0 then raise exception 'P3: el mensaje debía nombrar DUI-OTRA: %', r; end if;
  -- Revivir: x2 vivió en ésta, se quitó y ahora está vivo en la otra.
  v := pg_temp.adu_pasa('P3 x2 entra', pg_temp.adu_poner(p, id, v, array[x2]));
  v := pg_temp.adu_pasa('P3 x2 sale', pg_temp.adu_poner(p, id, v, '{}', array[x2]));
  select x.actualizado_en into vo from public.declaraciones_aduana x where x.id = (o ->> 'id')::uuid;
  perform pg_temp.adu_pasa('P3 x2 a la otra', pg_temp.adu_poner(p, (o ->> 'id')::uuid, vo, array[x2]));
  r := pg_temp.adu_poner(p, id, v, array[x2]);
  perform pg_temp.adu_es('P3 revivir con el vehículo en otra', r, '23514', 'vehiculos');
  if strpos(r ->> 'mensaje', '«DUI-OTRA»') = 0 then raise exception 'P3: al revivir, el mensaje debía nombrar DUI-OTRA: %', r; end if;
  r := pg_temp.adu_poner(p, id, v, array[(t ->> 'v4')::uuid]);
  perform pg_temp.adu_es('P3 fase sin aduana', r, '23514', 'fase');
  r := pg_temp.adu_poner(p, id, v, array[(t ->> 'w')::uuid]);
  perform pg_temp.adu_es('P3 regla apagada', r, '23514', 'aduana');
end $$;
rollback;
