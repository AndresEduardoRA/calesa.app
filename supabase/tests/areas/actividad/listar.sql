-- La página de la actividad (paso 9.01-1): `actividad_listar()` pide `actividad.ver`, recorta cada fila como `actividad_diff()` (sin un solo valor:
-- la cabecera, si se ve y los nombres de hasta 5 campos), va por cursor sobre `id` con su tope y ancla «Ir a una fecha» sin perder filas.
-- Corre en PGlite (`SOLO=areas/actividad/listar.sql pnpm db:probar`); no depende de `actividad.sql`: repite sus ayudantes.

-- @test actividad: los ayudantes de la página
reset role;
-- Lo que devuelve un SQL corrido como esa persona (un jsonb).
create or replace function pg_temp.act_como(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- El sqlstate (con «/hint» si trae) de un SQL corrido como esa persona, u «ok».
create or replace function pg_temp.act_error(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v_hint text;
begin
  perform pg_temp.act_como(p_quien, p_sql);
  return 'ok';
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  reset role;
  return sqlstate || coalesce('/' || nullif(v_hint, ''), '');
end $f$;

-- A (…a): actividad.ver, leads.ver «todos». B (…b): actividad.ver, leads.ver «propios», leads.crear. C (…c): leads.ver «todos», sin actividad.ver.
-- D (…d): actividad.ver, leads.ver «propios». E (…e): actividad.ver, logistica.ver. F (…f): actividad.ver, logistica.ver, logistica.gastos.ver,
-- logistica.pagos.ver, vehiculos.ver. Todo sin origen (vale en todos). La primera cuenta nace dueña: se le quita.
create or replace function pg_temp.act_preparar() returns void language plpgsql as $f$
declare p uuid; v_rol uuid; i int := 0; v_permisos text[];
begin
  foreach p in array array['00000000-0000-4000-8000-00000009901a', '00000000-0000-4000-8000-00000009901b', '00000000-0000-4000-8000-00000009901c',
                           '00000000-0000-4000-8000-00000009901d', '00000000-0000-4000-8000-00000009901e', '00000000-0000-4000-8000-00000009901f']::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'ACT ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('act_rol_' || i, 'ACT rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    v_permisos := case i
      when 1 then array['actividad.ver', 'leads.ver@todos']
      when 2 then array['actividad.ver', 'leads.ver@propios', 'leads.crear@todos']
      when 3 then array['leads.ver@todos']
      when 4 then array['actividad.ver', 'leads.ver@propios']
      when 5 then array['actividad.ver', 'logistica.ver@todos']
      else array['actividad.ver', 'logistica.ver@todos', 'logistica.gastos.ver@todos', 'logistica.pagos.ver@todos', 'vehiculos.ver@todos']
    end;
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    select v_rol, split_part(x, '@', 1), null, coalesce(nullif(split_part(x, '@', 2), ''), 'todos')::public.alcance_permiso
      from unnest(v_permisos) x;
  end loop;
end $f$;

-- Un origen con una fase inicial y un vehículo vivo (su alta deja `vehiculos.insert` en la actividad). Devuelve el id del vehículo.
create or replace function pg_temp.act_vehiculo() returns uuid language plpgsql as $f$
declare o uuid; fl uuid; fa uuid; v uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('act_' || s, 'act origen ' || s, 'manual') returning id into o;
  select id into fl from public.flujos where origen_id = o;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fl, 'act fase', 1, true) returning id into fa;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'act v1', fa) returning id into v;
  return v;
end $f$;

-- @test actividad: la página pide actividad.ver y recorta igual que el diff: D no ve el lead ajeno, A sin vehiculos.ver no ve el vehículo (T1, T2, T5)
begin;
select pg_temp.act_preparar();
insert into public.leads_campos (clave, etiqueta, tipo, solo_cartera) values ('act_privado', 'ACT privado', 'texto', true);
do $$
declare a uuid := '00000000-0000-4000-8000-00000009901a'; b uuid := '00000000-0000-4000-8000-00000009901b'; c uuid := '00000000-0000-4000-8000-00000009901c';
        d uuid := '00000000-0000-4000-8000-00000009901d'; f uuid := '00000000-0000-4000-8000-00000009901f';
        v_lb uuid := gen_random_uuid(); v_web uuid := (select id from public.origenes_lead where clave = 'web'); v uuid := pg_temp.act_vehiculo();
        v_cambio bigint; v_resp jsonb; v_fila jsonb;
begin
  if pg_temp.act_error(c, 'select public.actividad_listar()') <> '42501' then raise exception 'T1: actividad_listar sin actividad.ver no dio 42501'; end if;
  if has_function_privilege('anon', 'public.actividad_listar(bigint, int, uuid, text, text, timestamptz, text)', 'execute') then
    raise exception 'T1: anon ejecuta actividad_listar'; end if;
  perform pg_temp.act_como(b, format('select public.crear_lead(%L, %L::jsonb)', v_lb, jsonb_build_object('nombre', 'ACT lista', 'telefono_principal', '79199011',
    'origen_lead_id', v_web, 'atributos', jsonb_build_object('act_privado', 'secreto lista'))));
  insert into public.actividad (accion, actor_id, tabla, registro_id, antes, despues) values ('leads.update', b, 'leads', v_lb::text,
    jsonb_build_object('nombre', 'ACT lista', 'atributos', jsonb_build_object('act_privado', 'a'), 'numero', '918233333', 'telefono_principal', '79199011'),
    jsonb_build_object('nombre', 'ACT lista 2', 'atributos', jsonb_build_object('act_privado', 'b'), 'numero', '918244444', 'telefono_principal', '79199012'))
  returning id into v_cambio;

  -- B: el cambio con sus dos campos; A: sólo el nombre; D: la fila sin nada.
  v_resp := pg_temp.act_como(b, format('select public.actividad_listar(p_tabla => %L, p_registro => %L)', 'leads', v_lb));
  v_fila := (select x from jsonb_array_elements(v_resp -> 'filas') x where (x ->> 'id')::bigint = v_cambio);
  if v_fila -> 'campos' <> '["atributos", "nombre"]'::jsonb or (v_fila ->> 'mas_campos')::boolean then raise exception 'T2: la página de B: %', v_fila; end if;
  v_resp := pg_temp.act_como(a, format('select public.actividad_listar(p_tabla => %L, p_registro => %L)', 'leads', v_lb));
  v_fila := (select x from jsonb_array_elements(v_resp -> 'filas') x where (x ->> 'id')::bigint = v_cambio);
  if v_fila -> 'campos' <> '["nombre"]'::jsonb or not (v_fila ->> 'visible')::boolean then raise exception 'T2: la página de A: %', v_fila; end if;
  v_resp := pg_temp.act_como(d, format('select public.actividad_listar(p_tabla => %L, p_registro => %L)', 'leads', v_lb));
  v_fila := (select x from jsonb_array_elements(v_resp -> 'filas') x where (x ->> 'id')::bigint = v_cambio);
  if v_fila is null or (v_fila ->> 'visible')::boolean or v_fila -> 'campos' <> '[]'::jsonb then raise exception 'T2: la página de D: %', v_fila; end if;
  -- T3: ninguna página trae un valor: ni el nombre, ni el campo, ni un número o teléfono.
  if v_resp::text ~ '(ACT lista|secreto|79199|\m9182[0-9]{5}\M)' then raise exception 'T3: la página trajo un valor: %', v_resp; end if;
  v_resp := pg_temp.act_como(a, format('select public.actividad_listar(p_tabla => %L)', 'leads'));
  if v_resp::text ~ '(ACT lista|secreto|79199|\m9182[0-9]{5}\M)' then raise exception 'T3: la página de A trajo un valor: %', v_resp; end if;
  if exists (select 1 from jsonb_path_query(v_resp, 'strict $.filas[*].keyvalue().key') k where k #>> '{}' in ('antes', 'despues', 'detalle', 'cambios')) then
    raise exception 'T3: la página trajo antes, después, detalle o cambios'; end if;

  -- T5: el alta del vehículo, visible para F y no para A.
  v_resp := pg_temp.act_como(a, format('select public.actividad_listar(p_tabla => %L, p_registro => %L)', 'vehiculos', v));
  if jsonb_array_length(v_resp -> 'filas') = 0 or exists (select 1 from jsonb_array_elements(v_resp -> 'filas') x where (x ->> 'visible')::boolean) then
    raise exception 'T5: A sin vehiculos.ver vio el vehículo en la página: %', v_resp; end if;
  v_resp := pg_temp.act_como(f, format('select public.actividad_listar(p_tabla => %L, p_registro => %L)', 'vehiculos', v));
  if not exists (select 1 from jsonb_array_elements(v_resp -> 'filas') x where (x ->> 'visible')::boolean) then
    raise exception 'T5: F con vehiculos.ver no vio el vehículo en la página: %', v_resp; end if;
end $$;
rollback;

-- @test actividad: la página va por cursor, con hay_mas, tope de 100, filtro de acción y registro sólo con su entidad (T7)
begin;
select pg_temp.act_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000009901a'; b uuid := '00000000-0000-4000-8000-00000009901b';
        v_ids bigint[] := '{}'; v_id bigint; v_resp jsonb; i int;
begin
  for i in 1 .. 3 loop
    insert into public.actividad (accion, actor_id, tabla, registro_id, antes, despues)
    values (case when i = 2 then 'categorias.insert' else 'categorias.update' end, b, 'categorias', gen_random_uuid()::text, '{}', '{}') returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;
  v_resp := pg_temp.act_como(a, format('select public.actividad_listar(p_actor => %L, p_tamano => 2)', b));
  if (select array_agg((x ->> 'id')::bigint) from jsonb_array_elements(v_resp -> 'filas') x) <> array[v_ids[3], v_ids[2]]
     or not (v_resp ->> 'hay_mas')::boolean then raise exception 'T7: la primera página: %', v_resp; end if;
  v_resp := pg_temp.act_como(a, format('select public.actividad_listar(p_antes_id => %s, p_actor => %L, p_tamano => 2)', v_ids[2], b));
  if (select array_agg((x ->> 'id')::bigint) from jsonb_array_elements(v_resp -> 'filas') x) <> array[v_ids[1]]
     or (v_resp ->> 'hay_mas')::boolean then raise exception 'T7: la segunda página: %', v_resp; end if;
  v_resp := pg_temp.act_como(a, format('select public.actividad_listar(p_actor => %L, p_accion => %L)', b, 'categorias.insert'));
  if (select array_agg((x ->> 'id')::bigint) from jsonb_array_elements(v_resp -> 'filas') x) <> array[v_ids[2]] then raise exception 'T7: el filtro de acción: %', v_resp; end if;
  v_resp := pg_temp.act_como(a, format('select public.actividad_listar(p_accion => %L)', 'categorias.insert'));
  if not exists (select 1 from jsonb_array_elements(v_resp -> 'filas') x where (x ->> 'id')::bigint = v_ids[2])
     or exists (select 1 from jsonb_array_elements(v_resp -> 'filas') x where x ->> 'accion' <> 'categorias.insert') then
    raise exception 'T7: la ruta de acción: %', v_resp; end if;
  for i in 1 .. 105 loop
    insert into public.actividad (accion, actor_id, tabla, registro_id) values ('act.prueba', b, 'act_inventada', i::text);
  end loop;
  v_resp := pg_temp.act_como(a, format('select public.actividad_listar(p_actor => %L, p_tamano => 1000)', b));
  if jsonb_array_length(v_resp -> 'filas') <> 100 or not (v_resp ->> 'hay_mas')::boolean then raise exception 'T7: el tope de 100 dio % filas', jsonb_array_length(v_resp -> 'filas'); end if;
  if pg_temp.act_error(a, format('select public.actividad_listar(p_registro => %L)', gen_random_uuid())) <> '22023/registro' then
    raise exception 'T7: un registro sin su entidad no dio 22023/registro'; end if;
end $$;
rollback;

-- @test actividad: «Ir a una fecha» empieza por la última fila antes de esa hora, sin perder las que comparten su hora (T8)
begin;
select pg_temp.act_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000009901a'; b uuid := '00000000-0000-4000-8000-00000009901b';
        v_hace3 timestamptz := now() - interval '3 days'; v1 bigint; v2 bigint; v_ayer bigint; v_resp jsonb; v_ids bigint[];
begin
  -- En el orden en que se escriben: dos de una misma transacción de hace 3 días (mismo creado_en) y una de ayer.
  insert into public.actividad (accion, actor_id, tabla, registro_id, creado_en) values ('act.prueba', b, 'act_inventada', '1', v_hace3) returning id into v1;
  insert into public.actividad (accion, actor_id, tabla, registro_id, creado_en) values ('act.prueba', b, 'act_inventada', '2', v_hace3) returning id into v2;
  insert into public.actividad (accion, actor_id, tabla, registro_id, creado_en) values ('act.prueba', b, 'act_inventada', '3', now() - interval '1 day') returning id into v_ayer;
  v_resp := pg_temp.act_como(a, format('select public.actividad_listar(p_actor => %L, p_hasta => %L)', b, now() - interval '2 days'));
  select array_agg((x ->> 'id')::bigint) into v_ids from jsonb_array_elements(v_resp -> 'filas') x;
  if v_ids[1:2] <> array[v2, v1] or v_ayer = any (v_ids) then raise exception 'T8: «Ir a una fecha» dio %, esperaba % y % sin %', v_ids, v2, v1, v_ayer; end if;
  v_resp := pg_temp.act_como(a, format('select public.actividad_listar(p_actor => %L, p_hasta => %L)', b, now() - interval '400 days'));
  if v_resp <> '{"hay_mas": false, "filas": []}'::jsonb then raise exception 'T8: una fecha sin nada antes dio %', v_resp; end if;
end $$;
rollback;
