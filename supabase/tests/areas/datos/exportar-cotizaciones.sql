-- Exportar todo, cotizaciones (9.05-2c): la consulta del route handler (`datos/infra/cotizaciones.ts`) lee la tabla `cotizaciones` con la sesión de quien
-- exporta, sin ninguna función nueva. Es una guarda de regresión: cae si la policy «cotizaciones: leer» se afloja (lo que no ves no sale, tampoco la
-- papelera), si el total deja de llegar tal como se guarda o si una de las columnas que lee pierde su `grant select`. Corre en PGlite
-- (`SOLO=areas/datos/exportar-cotizaciones.sql pnpm db:probar`); cada bloque arma su terreno y lo revierte. Que ninguna `datos_exportar_*` sea
-- definer ya lo prueba `exportar-vehiculos.sql`.

-- @test exportar cotizaciones: los ayudantes
reset role;
-- Lo que devuelve un SQL corrido como esa persona (una fila jsonb).
create or replace function pg_temp.dexc_como(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- Ada (…a): datos.exportar.todo y cotizaciones.ver «todos». Bea (…b): cotizaciones.ver «propios». Ceci (…c): nada de cotizaciones. La primera
-- cuenta nace dueña: se le quita. Dos orígenes manuales con su fórmula publicada: en A, c1 de Bea, c2 de Ada (con su total), c4 de Ada en la
-- papelera y c5 de Ada sobre un lead de la cartera de Bea; en B, c3 de Ada.
create or replace function pg_temp.dexc_preparar() returns jsonb language plpgsql as $f$
declare p uuid; v_rol uuid; i int := 0; a uuid; b uuid; fa uuid; fb uuid; l uuid; c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid;
        ada constant uuid := '00000000-0000-4000-8000-00000009925a'; bea constant uuid := '00000000-0000-4000-8000-00000009925b';
        s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
        v_definicion constant jsonb := jsonb_build_object('nodos', jsonb_build_array(
          jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible'),
          jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total')));
begin
  foreach p in array array[ada, bea, '00000000-0000-4000-8000-00000009925c']::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'DEXC ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('dexc_rol_' || i, 'DEXC rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    if i = 1 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values
        (v_rol, 'datos.exportar.todo', null, 'todos'), (v_rol, 'cotizaciones.ver', null, 'todos');
    elsif i = 2 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.ver', null, 'propios');
    end if;
  end loop;
  insert into public.origenes (clave, nombre, tipo) values ('dexc_a_' || s, 'dexc A ' || s, 'manual') returning id into a;
  insert into public.origenes (clave, nombre, tipo) values ('dexc_b_' || s, 'dexc B ' || s, 'manual') returning id into b;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (a, 1, 'publicada', v_definicion, '{}', '{}', '{}') returning id into fa;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (b, 1, 'publicada', v_definicion, '{}', '{}', '{}') returning id into fb;
  -- El lead de Bea: entra en su cartera al crearlo.
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('DEXC lead de Bea', '73992501', bea, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  -- Sin triggers: cada una con su hora y c4 directo en la papelera.
  perform set_config('session_replication_role', 'replica', true);
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, tipos_cambio, totales, total_base, creado_en)
  values (a, bea, fa, '{}', '{}', '{}', 10, now() - interval '3 minutes') returning id into c1;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, tipos_cambio, totales, total_base, creado_en)
  values (a, ada, fa, '{}', '{}', '{}', 98765.43, now() - interval '2 minutes') returning id into c2;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, tipos_cambio, totales, total_base, creado_en)
  values (b, ada, fb, '{}', '{}', '{}', 20, now() - interval '1 minute') returning id into c3;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, tipos_cambio, totales, total_base, creado_en, eliminado_en, eliminado_por)
  values (a, ada, fa, '{}', '{}', '{}', 30, now() - interval '4 minutes', now(), ada) returning id into c4;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, valores, tipos_cambio, totales, total_base, creado_en)
  values (a, ada, fa, l, '{}', '{}', '{}', 40, now() - interval '5 minutes') returning id into c5;
  perform set_config('session_replication_role', 'origin', true);
  return jsonb_build_object('a', a, 'b', b, 'c1', c1, 'c2', c2, 'c3', c3, 'c4', c4, 'c5', c5);
end $f$;

-- La consulta del route handler (la primera página, con sus columnas de verdad y, si hay, el origen), acotada a las del terreno: los ids en su
-- orden y el total de cada uno.
create or replace function pg_temp.dexc_consulta(p_t jsonb, p_origen uuid default null) returns text language sql as $f$
  select format($q$select jsonb_build_object('ids', coalesce(jsonb_agg(id order by creado_en desc, id desc), '[]'), 'totales', coalesce(jsonb_object_agg(id, total_base), '{}'))
    from (select id, numero, origen_id, lead_id, vehiculo_id, clase, estado, titulo, total_base, creado_en, actualizado_en
            from public.cotizaciones where eliminado_en is null %s and creado_en <= now() order by creado_en desc, id desc limit 1000) x
   where id = any (%L::uuid[])$q$,
    case when p_origen is null then '' else format('and origen_id = %L', p_origen) end,
    array[p_t ->> 'c1', p_t ->> 'c2', p_t ->> 'c3', p_t ->> 'c4', p_t ->> 'c5'])
$f$;

-- @test exportar cotizaciones: la consulta del route handler devuelve lo que ve cada cuenta, el total intacto y nada de la papelera
begin;
do $$
declare t jsonb := pg_temp.dexc_preparar(); ada uuid := '00000000-0000-4000-8000-00000009925a'; bea uuid := '00000000-0000-4000-8000-00000009925b';
        ceci uuid := '00000000-0000-4000-8000-00000009925c'; r jsonb;
begin
  r := pg_temp.dexc_como(ada, pg_temp.dexc_consulta(t));
  if r -> 'ids' is distinct from jsonb_build_array(t -> 'c3', t -> 'c2', t -> 'c1', t -> 'c5') then
    raise exception 'Ada («todos») debía ver [c3, c2, c1, c5], sin c4 (papelera): %', r -> 'ids';
  end if;
  r := pg_temp.dexc_como(ada, pg_temp.dexc_consulta(t, (t ->> 'a')::uuid));
  if r -> 'ids' is distinct from jsonb_build_array(t -> 'c2', t -> 'c1', t -> 'c5') then
    raise exception 'Ada con el origen A debía ver [c2, c1, c5], sin c3 (otro origen): %', r -> 'ids';
  end if;
  if (r -> 'totales' ->> (t ->> 'c2'))::numeric is distinct from 98765.43 then
    raise exception 'el total de c2 no llegó tal como está en la tabla: %', r -> 'totales';
  end if;
  r := pg_temp.dexc_como(bea, pg_temp.dexc_consulta(t));
  if r -> 'ids' is distinct from jsonb_build_array(t -> 'c1', t -> 'c5') then
    raise exception 'Bea («propios») debía ver c1 (la suya) y c5 (de Ada, sobre un lead de su cartera): %', r -> 'ids';
  end if;
  r := pg_temp.dexc_como(ceci, pg_temp.dexc_consulta(t));
  if r -> 'ids' is distinct from '[]'::jsonb then
    raise exception 'Ceci (sin cotizaciones.ver) no debía ver nada: %', r -> 'ids';
  end if;
end $$;
rollback;

-- @test exportar cotizaciones: cada columna que lee el route handler tiene su grant (si una lo pierde, la exportación da 42501)
begin;
do $$
declare v_sin text;
begin
  select string_agg(c, ', ') into v_sin
    from unnest(array['id', 'numero', 'origen_id', 'lead_id', 'vehiculo_id', 'clase', 'estado', 'titulo', 'total_base', 'creado_en', 'actualizado_en',
                      'eliminado_en']) c
   where not has_column_privilege('authenticated', 'public.cotizaciones', c, 'select');
  if v_sin is not null then raise exception 'authenticated no puede leer de cotizaciones: %', v_sin; end if;
end $$;
rollback;
