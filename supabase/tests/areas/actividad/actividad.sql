-- La lectura recortada de la actividad (paso 9.01-1): `actividad_diff()` y `actividad_listar()` piden `actividad.ver` y devuelven sólo lo que
-- quien mira puede ver: de un lead, lo que ve en `leads_vista` (sin `atributos` fuera de su cartera, nada si no lo ve) y nunca su número ni su
-- teléfono; de una entidad, nada sin el permiso de su policy; de la configuración, lo que lee authenticated; de una tabla no declarada, nada.
-- Corre en PGlite (`SOLO=areas/actividad/actividad.sql pnpm db:probar`); cada bloque arma su terreno y lo revierte.

-- @test actividad: los ayudantes
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

-- Las claves de `cambios` de un diff.
create or replace function pg_temp.act_claves(p jsonb) returns text[] language sql as $f$
  select coalesce(array_agg(k #>> '{}' order by k #>> '{}'), '{}') from jsonb_path_query(p, '$.cambios.keyvalue().key') k
$f$;

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

-- @test actividad: sin actividad.ver, 42501 en las dos funciones; nadie de la app ejecuta los ayudantes (T1)
begin;
select pg_temp.act_preparar();
do $$
declare c uuid := '00000000-0000-4000-8000-00000009901c'; v_id bigint; r text; f text;
begin
  insert into public.actividad (accion, tabla, registro_id, antes, despues) values ('categorias.update', 'categorias', gen_random_uuid()::text, '{}', '{}')
  returning id into v_id;
  r := pg_temp.act_error(c, format('select public.actividad_diff(%s)', v_id));
  if r <> '42501' then raise exception 'T1: actividad_diff sin actividad.ver dio %', r; end if;
  foreach f in array array['public._actividad_recorte(text)', 'public._actividad_puede_ver_fila(text, text, jsonb)',
                           'public._actividad_recortar(text, text, jsonb, jsonb)'] loop
    if has_function_privilege('anon', f, 'execute') or has_function_privilege('authenticated', f, 'execute') then
      raise exception 'T1: la app ejecuta el ayudante %', f; end if;
  end loop;
  if has_function_privilege('anon', 'public.actividad_diff(bigint)', 'execute') then raise exception 'T1: anon ejecuta actividad_diff'; end if;
  if not has_function_privilege('authenticated', 'public.actividad_diff(bigint)', 'execute') then raise exception 'T1: authenticated no ejecuta actividad_diff'; end if;
end $$;
rollback;

-- @test actividad: de un lead, B en su cartera ve el campo de sólo cartera, A fuera no y D, que no lo ve, nada; nunca números ni teléfono (T2, T3)
begin;
select pg_temp.act_preparar();
insert into public.leads_campos (clave, etiqueta, tipo, solo_cartera) values ('act_privado', 'ACT privado', 'texto', true), ('act_publico', 'ACT público', 'texto', false);
do $$
declare a uuid := '00000000-0000-4000-8000-00000009901a'; b uuid := '00000000-0000-4000-8000-00000009901b'; d uuid := '00000000-0000-4000-8000-00000009901d';
        v_lb uuid := gen_random_uuid(); v_web uuid := (select id from public.origenes_lead where clave = 'web');
        v_alta bigint; v_cambio bigint; v_resp jsonb; v_tel text; v_id bigint; v_todo jsonb := '[]';
begin
  perform pg_temp.act_como(b, format('select public.crear_lead(%L, %L::jsonb)', v_lb, jsonb_build_object('nombre', 'ACT de Bea', 'telefono_principal', '79199001',
    'origen_lead_id', v_web, 'atributos', jsonb_build_object('act_privado', 'secreto alta', 'act_publico', 'abierto'))));
  select telefono_principal into v_tel from public.leads where id = v_lb;
  select max(x.id) into v_alta from public.actividad x where x.tabla = 'leads' and x.registro_id = v_lb::text and x.accion = 'leads.insert';
  if v_tel is null or v_alta is null then raise exception 'T2: el terreno no creó el lead o su alta'; end if;
  if not exists (select 1 from public.leads_asesores la where la.lead_id = v_lb and la.usuario_id = b and la.revocado_en is null) then
    raise exception 'T2: el lead no quedó en la cartera de B'; end if;
  -- Un cambio con todo lo que nunca sale metido en la foto (aunque `lead_auditar` ya no lo guarde): el recorte lo quita igual.
  insert into public.actividad (accion, actor_id, tabla, registro_id, antes, despues) values ('leads.update', b, 'leads', v_lb::text,
    jsonb_build_object('nombre', 'ACT de Bea', 'atributos', jsonb_build_object('act_privado', 'secreto viejo'), 'numero', '918211111', 'numero_propio', '000000123',
      'telefono_principal', v_tel, 'cartera', jsonb_build_array(b), 'actualizado_en', now() - interval '1 hour', 'cliente_desde', null),
    jsonb_build_object('nombre', 'ACT Bea nueva', 'atributos', jsonb_build_object('act_privado', 'secreto B'), 'numero', '918222222', 'numero_propio', '000000124',
      'telefono_principal', '79199002', 'cartera', jsonb_build_array(b, a), 'actualizado_en', now(), 'cliente_desde', now()))
  returning id into v_cambio;

  -- B, en la cartera: el nombre y los atributos (con el campo de sólo cartera), y nada más.
  v_resp := pg_temp.act_como(b, format('select public.actividad_diff(%s)', v_cambio));
  if pg_temp.act_claves(v_resp) <> array['atributos', 'nombre'] then raise exception 'T2: B debía ver nombre y atributos y vio %', pg_temp.act_claves(v_resp); end if;
  if v_resp #>> '{cambios,atributos,despues,act_privado}' is distinct from 'secreto B' then raise exception 'T2: B no vio el campo de su cartera: %', v_resp; end if;
  v_todo := v_todo || jsonb_build_array(v_resp);
  v_resp := pg_temp.act_como(b, format('select public.actividad_diff(%s)', v_alta));
  if v_resp #>> '{cambios,atributos,despues,act_privado}' is distinct from 'secreto alta' then raise exception 'T2: B no vio el alta con su campo: %', v_resp; end if;
  v_todo := v_todo || jsonb_build_array(v_resp);

  -- A, que ve todos los leads y no tiene este en su cartera: el nombre, sin atributos.
  v_resp := pg_temp.act_como(a, format('select public.actividad_diff(%s)', v_cambio));
  if pg_temp.act_claves(v_resp) <> array['nombre'] then raise exception 'T2: A debía ver sólo nombre y vio %', pg_temp.act_claves(v_resp); end if;
  if v_resp #>> '{cambios,nombre,despues}' is distinct from 'ACT Bea nueva' or not (v_resp ->> 'visible')::boolean then raise exception 'T2: A no vio el nombre: %', v_resp; end if;
  v_todo := v_todo || jsonb_build_array(v_resp);
  v_resp := pg_temp.act_como(a, format('select public.actividad_diff(%s)', v_alta));
  if v_resp::text like '%secreto%' or v_resp -> 'cambios' ? 'atributos' then raise exception 'T2: A vio el campo de sólo cartera en el alta: %', v_resp; end if;
  if not (v_resp -> 'cambios' ? 'atributos_publicos') then raise exception 'T2: A no vio lo público del alta: %', v_resp; end if;
  v_todo := v_todo || jsonb_build_array(v_resp);

  -- D, que sólo ve sus leads: nada, como si no existiera.
  for v_id in select unnest(array[v_cambio, v_alta]) loop
    v_resp := pg_temp.act_como(d, format('select public.actividad_diff(%s)', v_id));
    if v_resp <> jsonb_build_object('id', v_id, 'visible', false) then raise exception 'T2: D, sin el lead, recibió %', v_resp; end if;
  end loop;

  -- T3: en nada de lo que salió hay un número, un teléfono ni la cartera.
  if exists (select 1 from jsonb_path_query(v_todo, 'strict $[*].cambios.keyvalue().key') k
              where k #>> '{}' in ('numero', 'numero_propio', 'telefono_principal', 'cartera', 'cliente_desde', 'actualizado_en')) then
    raise exception 'T3: una respuesta trajo un número, el teléfono o la cartera'; end if;
  if v_todo::text like '%' || v_tel || '%' or v_todo::text like '%79199002%' or v_todo::text ~ '\m9182[0-9]{5}\M' or v_todo::text ~ '00000012[34]' then
    raise exception 'T3: una respuesta trajo un número o un teléfono'; end if;
end $$;
rollback;

-- @test actividad: toda tabla con trigger de auditoría está declarada; una que no, no se muestra (T4)
begin;
select pg_temp.act_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000009901a'; v_faltan text; v_id bigint; v_resp jsonb;
begin
  select string_agg(distinct c.relname, ', ') into v_faltan
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace join pg_proc p on p.oid = t.tgfoid
   where n.nspname = 'public' and not t.tgisinternal and (t.tgname ilike '%auditar%' or p.proname ilike '%auditar%')
     and public._actividad_recorte(c.relname) is null;
  if v_faltan is not null then
    raise exception 'T4: tablas auditadas sin recorte declarado en _actividad_recorte: %', v_faltan; end if;
  insert into public.actividad (accion, tabla, registro_id, antes, despues)
  values ('act_inventada.update', 'act_inventada', gen_random_uuid()::text, '{"x": 1}', '{"x": 2}') returning id into v_id;
  v_resp := pg_temp.act_como(a, format('select public.actividad_diff(%s)', v_id));
  if v_resp <> jsonb_build_object('id', v_id, 'visible', false) then raise exception 'T4: una tabla no declarada se mostró: %', v_resp; end if;
  v_resp := pg_temp.act_como(a, 'select public.actividad_diff(-1)');
  if v_resp <> jsonb_build_object('id', -1, 'visible', false) then raise exception 'T4: un id que no existe dio %', v_resp; end if;
end $$;
rollback;

-- @test actividad: una entidad sólo con el permiso de su policy; el dinero de un gasto y un pago sin foto (T5, T5b)
begin;
select pg_temp.act_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000009901a'; e uuid := '00000000-0000-4000-8000-00000009901e'; f uuid := '00000000-0000-4000-8000-00000009901f';
        v uuid := pg_temp.act_vehiculo(); v_alta bigint; v_gasto bigint; v_pago_id uuid; v_pago bigint; v_resp jsonb;
begin
  select max(x.id) into v_alta from public.actividad x where x.tabla = 'vehiculos' and x.registro_id = v::text;
  if v_alta is null then raise exception 'T5: el alta del vehículo no quedó en la actividad'; end if;
  v_resp := pg_temp.act_como(f, format('select public.actividad_diff(%s)', v_alta));
  if not (v_resp ->> 'visible')::boolean or v_resp #>> '{cambios,titulo,despues}' is distinct from 'act v1' then
    raise exception 'T5: con vehiculos.ver no se vio el vehículo: %', v_resp; end if;
  v_resp := pg_temp.act_como(a, format('select public.actividad_diff(%s)', v_alta));
  if v_resp <> jsonb_build_object('id', v_alta, 'visible', false) then raise exception 'T5: sin vehiculos.ver se vio el vehículo: %', v_resp; end if;

  -- Un gasto del vehículo: el monto sólo con logistica.gastos.ver.
  insert into public.actividad (accion, tabla, registro_id, antes, despues) values ('gastos.update', 'gastos', gen_random_uuid()::text,
    jsonb_build_object('vehiculo_id', v, 'repuesto_id', null, 'monto', 10), jsonb_build_object('vehiculo_id', v, 'repuesto_id', null, 'monto', 777.77))
  returning id into v_gasto;
  v_resp := pg_temp.act_como(e, format('select public.actividad_diff(%s)', v_gasto));
  if v_resp <> jsonb_build_object('id', v_gasto, 'visible', false) then raise exception 'T5b: sin logistica.gastos.ver se vio el gasto: %', v_resp; end if;
  v_resp := pg_temp.act_como(f, format('select public.actividad_diff(%s)', v_gasto));
  if (v_resp #>> '{cambios,monto,despues}')::numeric is distinct from 777.77 then raise exception 'T5b: con logistica.gastos.ver no se vio el monto: %', v_resp; end if;

  -- Un pago sin fotos (como los que deja registrar_actividad): se mira la fila vigente.
  insert into public.pagos (vehiculo_id, concepto, moneda, monto, monto_base) values (v, 'ACT seña', 'USD', 5, 5) returning id into v_pago_id;
  insert into public.actividad (accion, tabla, registro_id, detalle) values ('pago.confirmado', 'pagos', v_pago_id::text, '{}') returning id into v_pago;
  v_resp := pg_temp.act_como(f, format('select public.actividad_diff(%s)', v_pago));
  if v_resp ->> 'visible' is distinct from 'true' or v_resp -> 'cambios' <> '{}'::jsonb then raise exception 'T5b: con logistica.pagos.ver no se vio el pago: %', v_resp; end if;
  v_resp := pg_temp.act_como(e, format('select public.actividad_diff(%s)', v_pago));
  if v_resp <> jsonb_build_object('id', v_pago, 'visible', false) then raise exception 'T5b: sin logistica.pagos.ver se vio el pago: %', v_resp; end if;
end $$;
rollback;

-- @test actividad: la configuración se ve entera, sin actualizado_en (T6)
begin;
select pg_temp.act_preparar();
do $$
declare a uuid := '00000000-0000-4000-8000-00000009901a'; v uuid := pg_temp.act_vehiculo(); v_cat uuid; v_id bigint; v_resp jsonb;
begin
  insert into public.categorias (origen_id, nombre) values ((select origen_id from public.vehiculos where id = v), 'ACT cat') returning id into v_cat;
  update public.categorias set nombre = 'ACT cat 2', actualizado_en = now() + interval '1 second' where id = v_cat;
  select max(x.id) into v_id from public.actividad x where x.tabla = 'categorias' and x.registro_id = v_cat::text and x.accion = 'categorias.update';
  if v_id is null then raise exception 'T6: el cambio de la categoría no quedó en la actividad'; end if;
  v_resp := pg_temp.act_como(a, format('select public.actividad_diff(%s)', v_id));
  if pg_temp.act_claves(v_resp) <> array['nombre'] then raise exception 'T6: el cambio de categoría debía traer sólo nombre y trajo %', pg_temp.act_claves(v_resp); end if;
  if v_resp #>> '{cambios,nombre,antes}' is distinct from 'ACT cat' or v_resp #>> '{cambios,nombre,despues}' is distinct from 'ACT cat 2' then
    raise exception 'T6: antes y después mal: %', v_resp; end if;
  select max(x.id) into v_id from public.actividad x where x.tabla = 'categorias' and x.registro_id = v_cat::text and x.accion = 'categorias.insert';
  v_resp := pg_temp.act_como(a, format('select public.actividad_diff(%s)', v_id));
  if not (pg_temp.act_claves(v_resp) @> array['id', 'nombre', 'origen_id']) or 'actualizado_en' = any (pg_temp.act_claves(v_resp)) then
    raise exception 'T6: el alta de la categoría debía venir entera sin actualizado_en: %', pg_temp.act_claves(v_resp); end if;
end $$;
rollback;

