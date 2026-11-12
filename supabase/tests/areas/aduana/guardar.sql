-- Guardar una declaración de aduana (paso 6.07-2, C1–C6). No depende de otro archivo (`SOLO=areas/aduana/guardar.sql`). Cada bloque abre su
-- transacción y la revierte. La composición y el canal: `composicion.sql`; lo que la fase exige: `exigido.sql`; dos sesiones a la vez: `carreras.mjs`.
--
-- Qué asegura:
--   A1. Con logistica.ver y sin logistica.aduana.gestionar, crear da 42501 y ninguna fila; con la clave (sin origen) crea; el número va sin espacios
--       alrededor; otro con el mismo número, 23505 hint numero.
--   A2. Editar con la versión cambia y la mueve; con la vieja, PT409 y nada cambia (en la misma transacción: la versión propia, D20); sin diferencia,
--       la misma versión y sin_cambios; esperada nula sobre una que existe, PT409; el canal no se guarda aquí; una fecha que no es AAAA-MM-DD, 22023.

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

-- @test aduana: sin logistica.aduana.gestionar no crea; con la clave crea; el número repetido da 23505 (A1)
begin;
do $$
declare sin uuid; con uuid; r jsonb; v_id uuid;
begin
  sin := pg_temp.adu_persona(array['logistica.ver']);
  con := pg_temp.adu_persona(array['logistica.ver', 'logistica.aduana.gestionar']);
  r := pg_temp.adu_guardar(sin, null, null, '{"numero": "DUI-1"}');
  perform pg_temp.adu_es('A1 sin la clave', r, '42501');
  if exists (select 1 from public.declaraciones_aduana where numero = 'DUI-1') then raise exception 'A1: no debía crear'; end if;
  r := pg_temp.adu_guardar(con, null, null, '{"numero": "  DUI-1 ", "despachante": "  "}');
  perform pg_temp.adu_pasa('A1 con la clave', r);
  v_id := (r ->> 'id')::uuid;
  if (select (numero, despachante, creado_por) from public.declaraciones_aduana where id = v_id) is distinct from ('DUI-1'::text, null::text, con) then
    raise exception 'A1: debía guardar DUI-1 sin despachante y con quien la creó';
  end if;
  r := pg_temp.adu_guardar(con, null, null, '{"numero": "DUI-1"}');
  perform pg_temp.adu_es('A1 número repetido', r, '23505', 'numero');
  r := pg_temp.adu_guardar(con, null, null, '{"despachante": "x"}');
  perform pg_temp.adu_es('A1 sin número', r, '22023', 'numero');
  r := pg_temp.adu_guardar(con, null, now(), '{"numero": "DUI-2"}');
  perform pg_temp.adu_es('A1 crear con versión', r, '22023', 'version');
end $$;
rollback;

-- @test aduana: editar con la versión; la vieja da PT409 aun en la misma transacción; sin diferencia no mueve la versión (A2)
begin;
do $$
declare p uuid; r jsonb; v_id uuid; v1 timestamptz; v2 timestamptz;
begin
  p := pg_temp.adu_persona(array['logistica.ver', 'logistica.aduana.gestionar']);
  r := pg_temp.adu_guardar(p, null, null, '{"numero": "DUI-A2"}');
  v1 := pg_temp.adu_pasa('A2 crear', r);
  v_id := (r ->> 'id')::uuid;
  v2 := pg_temp.adu_pasa('A2 editar', pg_temp.adu_guardar(p, v_id, v1, '{"aceptada_el": "2026-11-01", "deposito": "Zofra"}'));
  if v2 <= v1 then raise exception 'A2: la versión debía moverse (% → %)', v1, v2; end if;
  r := pg_temp.adu_guardar(p, v_id, v1, '{"deposito": "Otro"}');
  perform pg_temp.adu_es('A2 versión vieja', r, 'PT409');
  if (select deposito from public.declaraciones_aduana where id = v_id) is distinct from 'Zofra' then raise exception 'A2: la vieja no debía escribir'; end if;
  r := pg_temp.adu_guardar(p, v_id, v2, '{"deposito": "Zofra"}');
  if r -> 'sin_cambios' is distinct from 'true'::jsonb or (r ->> 'actualizado_en')::timestamptz <> v2 then
    raise exception 'A2: sin diferencia debía devolver la misma versión y sin_cambios: %', r;
  end if;
  r := pg_temp.adu_guardar(p, v_id, null, '{"deposito": "Otro"}');
  perform pg_temp.adu_es('A2 esperada nula', r, 'PT409');
  r := pg_temp.adu_guardar(p, v_id, v2, '{"canal": "verde"}');
  perform pg_temp.adu_es('A2 el canal no va aquí', r, '22023', 'canal');
  r := pg_temp.adu_guardar(p, v_id, v2, '{"aceptada_el": "today"}');
  perform pg_temp.adu_es('A2 fecha', r, '22023', 'aceptada_el');
  r := pg_temp.adu_guardar(p, gen_random_uuid(), v2, '{"deposito": "x"}');
  perform pg_temp.adu_es('A2 no existe', r, 'PT409');
end $$;
rollback;
