-- Quién da de alta y cómo (B1): `vehiculo_crear(…, p_contexto)` pide `vehiculos.crear` para el alta suelta y `vehiculos.crear.desde_cotizar` para
-- la de la hoja de cotizar, y deja la marca en `creado_desde`. No depende de otro archivo (`SOLO=areas/vehiculos/alta-por-contexto.sql`).
--
-- Qué asegura:
--   AC1. Las cuatro combinaciones de claves: cada contexto entra sólo con su clave; sin ninguna, 42501.
--   AC2. `creado_desde` dice el contexto; un contexto desconocido es 22023.
--   AC4. Traer de una subasta vale para las dos altas: `apibara_contexto.puede_crear` y `vehiculos_repetidos` aceptan la clave de cotizar.
--   AC3. La migración de datos: quien tenía `vehiculos.crear` en un origen tiene también la de cotizar, con el mismo origen y alcance (el dueño).

create or replace function pg_temp.ac_persona(p_claves text[], p_origen uuid) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('ac_' || substr(v_id::text, 1, 8), 'AC ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c, p_origen, 'todos');
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.ac_crear(p_quien uuid, p_origen uuid, p_contexto text) returns text language plpgsql as $f$
declare r jsonb; v_e text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    r := public.vehiculo_crear(gen_random_uuid(), p_origen, jsonb_build_object('titulo', 'AC vehículo'), null, p_contexto);
  exception when others then
    v_e := sqlstate;
    reset role;
    return v_e;
  end;
  reset role;
  return (select creado_desde from public.vehiculos where id = (r ->> 'id')::uuid);
end $f$;

-- @test alta por contexto: cada contexto pide su clave y deja su marca (AC1, AC2)
begin;
do $$
declare o uuid; suelto uuid; cotizar uuid; ambos uuid; nada uuid;
begin
  perform pg_temp.ac_persona(array[]::text[], null);   -- con `SOLO=`, la primera cuenta nace dueña
  insert into public.origenes (clave, nombre) values ('ac_' || substr(gen_random_uuid()::text, 1, 8), 'AC origen') returning id into o;
  suelto := pg_temp.ac_persona(array['vehiculos.ver', 'vehiculos.crear'], o);
  cotizar := pg_temp.ac_persona(array['vehiculos.ver', 'vehiculos.crear.desde_cotizar'], o);
  ambos := pg_temp.ac_persona(array['vehiculos.ver', 'vehiculos.crear', 'vehiculos.crear.desde_cotizar'], o);
  nada := pg_temp.ac_persona(array['vehiculos.ver'], o);
  if pg_temp.ac_crear(suelto, o, 'suelto') is distinct from 'suelto' then raise exception 'AC1 suelto/suelto'; end if;
  if pg_temp.ac_crear(suelto, o, 'cotizar') is distinct from '42501' then raise exception 'AC1 suelto/cotizar'; end if;
  if pg_temp.ac_crear(cotizar, o, 'cotizar') is distinct from 'cotizar' then raise exception 'AC1 cotizar/cotizar'; end if;
  if pg_temp.ac_crear(cotizar, o, 'suelto') is distinct from '42501' then raise exception 'AC1 cotizar/suelto'; end if;
  if pg_temp.ac_crear(ambos, o, 'suelto') is distinct from 'suelto' or pg_temp.ac_crear(ambos, o, 'cotizar') is distinct from 'cotizar' then
    raise exception 'AC1 ambos';
  end if;
  if pg_temp.ac_crear(nada, o, 'suelto') is distinct from '42501' or pg_temp.ac_crear(nada, o, 'cotizar') is distinct from '42501' then
    raise exception 'AC1 nada';
  end if;
  if pg_temp.ac_crear(ambos, o, 'otro') is distinct from '22023' then raise exception 'AC2 contexto desconocido'; end if;
end $$;
rollback;

-- @test alta por contexto: el dueño tiene las dos claves (AC3)
begin;
do $$
begin
  if not exists (select 1 from public.roles_permisos rp join public.roles r on r.id = rp.rol_id
                  where r.clave = 'dueno' and rp.permiso_clave = 'vehiculos.crear.desde_cotizar') then
    raise exception 'AC3: el dueño no recibió la clave de cotizar';
  end if;
end $$;
rollback;

-- @test alta por contexto: traer de una subasta vale con la clave de cotizar (AC4)
begin;
do $$
declare o uuid; cotizar uuid; nada uuid; r jsonb; v_e text;
begin
  perform pg_temp.ac_persona(array[]::text[], null);
  insert into public.origenes (clave, nombre, tipo) values ('ac_' || substr(gen_random_uuid()::text, 1, 8), 'AC subasta', 'subasta') returning id into o;
  cotizar := pg_temp.ac_persona(array['vehiculos.ver', 'vehiculos.crear.desde_cotizar'], o);
  nada := pg_temp.ac_persona(array['vehiculos.ver'], o);
  perform set_config('request.jwt.claim.sub', cotizar::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  r := public.apibara_contexto(o);
  if (r ->> 'puede_crear')::boolean is not true then raise exception 'AC4: puede_crear con la de cotizar: %', r; end if;
  perform * from public.vehiculos_repetidos(o, '[{"vin": "AC000000000000001"}]'::jsonb);
  reset role;
  perform set_config('request.jwt.claim.sub', nada::text, true);
  set local role authenticated;
  begin
    perform * from public.vehiculos_repetidos(o, '[{"vin": "AC000000000000001"}]'::jsonb);
    v_e := 'sin error';
  exception when insufficient_privilege then v_e := '42501';
  end;
  reset role;
  if v_e <> '42501' then raise exception 'AC4: sin ninguna de las dos debía dar 42501, dio %', v_e; end if;
end $$;
rollback;
