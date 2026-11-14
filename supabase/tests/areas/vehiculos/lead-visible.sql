-- `vehiculos_con_lead_visible(p_ids)`: de esos vehículos, los que tienen un lead que quien llama puede abrir. No depende de otro archivo
-- (`SOLO=areas/vehiculos/lead-visible.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   LV1. Con «propios» devuelve el vehículo cuyo lead está en su cartera y no el de un lead ajeno.
--   LV2. No devuelve uno sin lead, uno en la papelera ni uno que no ve.
--   LV3. Corta en 200 ids.
--   LV4. `anon` no tiene EXECUTE; `authenticated` sí.

create or replace function pg_temp.lv_persona(p_claves text[], p_alcance public.alcance_permiso) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('lv_' || substr(v_id::text, 1, 8), 'LV ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, p_alcance);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.lv_lead(p_creador uuid) returns uuid language plpgsql as $f$
declare l uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('LV lead', '7291' || lpad((random() * 9999)::int::text, 4, '0'), p_creador, (select id from public.origenes_lead where clave = 'web'), '{}')
  returning id into l;
  return l;
end $f$;

create or replace function pg_temp.lv_vehiculo(p_origen uuid, p_lead uuid, p_creador uuid default null) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, lead_id, creado_por) values (p_origen, 'LV vehículo', p_lead, p_creador) returning id into v;
  return v;
end $f$;

-- Los ids que devuelve la función como esa persona.
create or replace function pg_temp.lv_visibles(p_quien uuid, p_ids uuid[]) returns uuid[] language plpgsql as $f$
declare r uuid[];
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select coalesce(array_agg(x order by x), '{}') into r from public.vehiculos_con_lead_visible(p_ids) x;
  reset role;
  return r;
end $f$;

-- @test vehiculos_con_lead_visible: con «propios» devuelve el vehículo cuyo lead está en su cartera y no el de un lead ajeno (LV1)
begin;
do $$
declare p uuid; ajeno uuid; o uuid; l_mio uuid; l_ajeno uuid; v_mio uuid; v_ajeno uuid;
begin
  perform pg_temp.lv_persona(array['vehiculos.ver'], 'todos');   -- con `SOLO=`, la primera cuenta nace dueña: no puede ser la que prueba
  p := pg_temp.lv_persona(array['vehiculos.ver', 'leads.ver'], 'propios');
  ajeno := pg_temp.lv_persona(array['vehiculos.ver', 'leads.ver'], 'propios');
  insert into public.origenes (clave, nombre) values ('lv_' || substr(gen_random_uuid()::text, 1, 8), 'LV origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  l_mio := pg_temp.lv_lead(p);
  l_ajeno := pg_temp.lv_lead(ajeno);
  -- Con «propios» en vehículos ve lo suyo y lo de sus leads; el vehículo del lead ajeno lo crea P para verlo igual.
  v_mio := pg_temp.lv_vehiculo(o, l_mio, p);
  v_ajeno := pg_temp.lv_vehiculo(o, l_ajeno, p);
  if pg_temp.lv_visibles(p, array[v_mio, v_ajeno]) is distinct from array[v_mio] then
    raise exception 'LV1: debía devolver sólo el del lead de su cartera (%) y dio %', v_mio, pg_temp.lv_visibles(p, array[v_mio, v_ajeno]);
  end if;
end $$;
reset role;
rollback;

-- @test vehiculos_con_lead_visible: no devuelve uno sin lead, uno en la papelera ni uno que no ve (LV2)
begin;
do $$
declare p uuid; ajeno uuid; o uuid; l uuid; l_ajeno uuid; v_sin uuid; v_papelera uuid; v_no_ve uuid; v_ok uuid;
begin
  perform pg_temp.lv_persona(array['vehiculos.ver'], 'todos');
  p := pg_temp.lv_persona(array['vehiculos.ver', 'leads.ver'], 'propios');
  ajeno := pg_temp.lv_persona(array['vehiculos.ver', 'leads.ver'], 'propios');
  insert into public.origenes (clave, nombre) values ('lv_' || substr(gen_random_uuid()::text, 1, 8), 'LV origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  l := pg_temp.lv_lead(p);
  l_ajeno := pg_temp.lv_lead(ajeno);
  v_ok := pg_temp.lv_vehiculo(o, l, p);
  v_sin := pg_temp.lv_vehiculo(o, null, p);
  v_papelera := pg_temp.lv_vehiculo(o, l, p);
  update public.vehiculos set eliminado_en = now() where id = v_papelera;
  -- No lo creó P ni su lead está en su cartera: no lo ve, así que tampoco ve su lead por esta puerta.
  v_no_ve := pg_temp.lv_vehiculo(o, l_ajeno, ajeno);
  if pg_temp.lv_visibles(p, array[v_ok, v_sin, v_papelera, v_no_ve, gen_random_uuid()]) is distinct from array[v_ok] then
    raise exception 'LV2: debía devolver sólo %, y dio %', v_ok, pg_temp.lv_visibles(p, array[v_ok, v_sin, v_papelera, v_no_ve]);
  end if;
  -- Sin `leads.ver` no hay lead que ver, aunque el vehículo sí.
  if pg_temp.lv_visibles(pg_temp.lv_persona(array['vehiculos.ver'], 'todos'), array[v_ok]) <> '{}'::uuid[] then
    raise exception 'LV2: sin leads.ver no debía devolver nada';
  end if;
end $$;
reset role;
rollback;

-- @test vehiculos_con_lead_visible: corta en 200 ids (LV3)
begin;
do $$
declare p uuid; o uuid; l uuid; v_dentro uuid; v_fuera uuid; v_ids uuid[];
begin
  perform pg_temp.lv_persona(array['vehiculos.ver'], 'todos');
  p := pg_temp.lv_persona(array['vehiculos.ver', 'leads.ver'], 'todos');
  insert into public.origenes (clave, nombre) values ('lv_' || substr(gen_random_uuid()::text, 1, 8), 'LV origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  l := pg_temp.lv_lead(p);
  v_dentro := pg_temp.lv_vehiculo(o, l, p);
  v_fuera := pg_temp.lv_vehiculo(o, l, p);
  -- El que cae dentro está en el lugar 200; el de afuera, en el 201.
  select array_agg(gen_random_uuid()) into v_ids from generate_series(1, 199);
  v_ids := v_ids || v_dentro || v_fuera;
  if array_length(v_ids, 1) <> 201 then raise exception 'LV3: la prueba debía armar 201 ids'; end if;
  if pg_temp.lv_visibles(p, v_ids) is distinct from array[v_dentro] then
    raise exception 'LV3: debía devolver sólo el del lugar 200 y dio %', pg_temp.lv_visibles(p, v_ids);
  end if;
end $$;
reset role;
rollback;

-- @test vehiculos_con_lead_visible: anon no tiene EXECUTE y authenticated sí (LV4)
begin;
do $$
begin
  if has_function_privilege('anon', 'public.vehiculos_con_lead_visible(uuid[])', 'execute')
     or not has_function_privilege('authenticated', 'public.vehiculos_con_lead_visible(uuid[])', 'execute') then
    raise exception 'LV4: anon no debía poder ejecutarla y authenticated sí';
  end if;
end $$;
rollback;
