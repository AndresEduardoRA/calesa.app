-- Exportar todo, vehículos de un origen (9.05-2b): la consulta del route handler (`datos/infra/vehiculos.ts`) lee la tabla `vehiculos` con la sesión de
-- quien exporta, sin ninguna función nueva. Es una guarda de regresión: cae si la lectura pasa a una función definer o si la policy «vehiculos: leer» se
-- afloja (lo que no ves no sale, tampoco la papelera). Corre en PGlite (`SOLO=areas/datos/exportar-vehiculos.sql pnpm db:probar`); cada bloque arma su
-- terreno y lo revierte.

-- @test exportar vehículos: los ayudantes
reset role;
-- Lo que devuelve un SQL corrido como esa persona (una fila jsonb).
create or replace function pg_temp.dexv_como(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute p_sql into v;
  reset role;
  return v;
end $f$;

-- Ada (…a): datos.exportar.todo y vehiculos.ver «todos». Bea (…b): vehiculos.ver «propios». Ceci (…c): nada de vehículos. La primera cuenta nace
-- dueña: se le quita. Dos orígenes manuales: en A, v1 de Bea, v2 de Ada (con precio) y v4 de Ada en la papelera; en B, v3 de Ada.
create or replace function pg_temp.dexv_preparar() returns jsonb language plpgsql as $f$
declare p uuid; v_rol uuid; i int := 0; a uuid; b uuid; v1 uuid; v2 uuid; v3 uuid; v4 uuid;
        s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  foreach p in array array['00000000-0000-4000-8000-00000009915a', '00000000-0000-4000-8000-00000009915b', '00000000-0000-4000-8000-00000009915c']::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'DEXV ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('dexv_rol_' || i, 'DEXV rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    if i = 1 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values
        (v_rol, 'datos.exportar.todo', null, 'todos'), (v_rol, 'vehiculos.ver', null, 'todos');
    elsif i = 2 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'vehiculos.ver', null, 'propios');
    end if;
  end loop;
  insert into public.origenes (clave, nombre, tipo) values ('dexv_a_' || s, 'dexv A ' || s, 'manual') returning id into a;
  insert into public.origenes (clave, nombre, tipo) values ('dexv_b_' || s, 'dexv B ' || s, 'manual') returning id into b;
  insert into public.vehiculos (origen_id, titulo, creado_por, creado_en) values (a, 'dexv v1', '00000000-0000-4000-8000-00000009915b', now() - interval '3 minutes')
    returning id into v1;
  insert into public.vehiculos (origen_id, titulo, precio, creado_por, creado_en) values (a, 'dexv v2', 12500.50, '00000000-0000-4000-8000-00000009915a', now() - interval '2 minutes')
    returning id into v2;
  insert into public.vehiculos (origen_id, titulo, creado_por, creado_en) values (b, 'dexv v3', '00000000-0000-4000-8000-00000009915a', now() - interval '1 minute')
    returning id into v3;
  insert into public.vehiculos (origen_id, titulo, creado_por, creado_en) values (a, 'dexv v4', '00000000-0000-4000-8000-00000009915a', now() - interval '4 minutes')
    returning id into v4;
  update public.vehiculos set eliminado_en = now() where id = v4;
  return jsonb_build_object('a', a, 'b', b, 'v1', v1, 'v2', v2, 'v3', v3, 'v4', v4);
end $f$;

-- La consulta del route handler (la primera página de un origen, con sus columnas de verdad): los ids en su orden y el precio de cada uno.
create or replace function pg_temp.dexv_consulta(p_origen uuid) returns text language sql as $f$
  select format($q$select jsonb_build_object('ids', coalesce(jsonb_agg(id order by creado_en desc, id desc), '[]'), 'precios', coalesce(jsonb_object_agg(id, precio), '{}'))
    from (select id, numero, titulo, marca, modelo, anio, vin, lote, plataforma, url_origen, precio, precio_negociable, acepta_permuta, placado, kilometraje,
                 categoria_id, fase_id, atributos, creado_en, actualizado_en
            from public.vehiculos where origen_id = %L and creado_en <= now() order by creado_en desc, id desc limit 1000) x$q$, p_origen)
$f$;

-- @test exportar vehículos: la consulta del route handler devuelve lo que ve cada cuenta, el precio intacto y nada de la papelera ni de otro origen
begin;
do $$
declare t jsonb := pg_temp.dexv_preparar(); ada uuid := '00000000-0000-4000-8000-00000009915a'; bea uuid := '00000000-0000-4000-8000-00000009915b';
        ceci uuid := '00000000-0000-4000-8000-00000009915c'; r jsonb;
begin
  r := pg_temp.dexv_como(ada, pg_temp.dexv_consulta((t ->> 'a')::uuid));
  if r -> 'ids' is distinct from jsonb_build_array(t -> 'v2', t -> 'v1') then
    raise exception 'Ada («todos») debía ver [v2, v1] en A, sin v3 (otro origen) ni v4 (papelera): %', r -> 'ids';
  end if;
  if (r -> 'precios' ->> (t ->> 'v2'))::numeric is distinct from 12500.50 then
    raise exception 'el precio de v2 no llegó tal como está en la tabla: %', r -> 'precios';
  end if;
  r := pg_temp.dexv_como(bea, pg_temp.dexv_consulta((t ->> 'a')::uuid));
  if r -> 'ids' is distinct from jsonb_build_array(t -> 'v1') then
    raise exception 'Bea («propios») debía ver sólo v1, el suyo: %', r -> 'ids';
  end if;
  r := pg_temp.dexv_como(ceci, pg_temp.dexv_consulta((t ->> 'a')::uuid));
  if r -> 'ids' is distinct from '[]'::jsonb then
    raise exception 'Ceci (sin vehiculos.ver) no debía ver nada: %', r -> 'ids';
  end if;
end $$;
rollback;

-- @test exportar vehículos: ninguna función datos_exportar_* es definer (la lectura va con la sesión de quien exporta)
begin;
do $$
declare v_definer text;
begin
  select string_agg(p.proname, ', ') into v_definer
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname like 'datos\_exportar\_%' and p.prosecdef;
  if v_definer is not null then raise exception 'una lectura de exportar es definer (saltaría la RLS de quien exporta): %', v_definer; end if;
end $$;
rollback;
