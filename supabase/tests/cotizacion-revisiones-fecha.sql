-- `cotizacion_revisiones()` desde una fecha (paso 4.17-5a, 4-75): el cuarto argumento, `p_hasta`, es un instante EXCLUSIVO que elige desde qué revisión empieza
-- la página (la más nueva de ESA cotización con `creado_en < p_hasta`); de ahí, la página por id de siempre. Sin ancla, la respuesta vacía de siempre
-- (si la persona ve la cotización) o el 42501 de una cotización que no existe (si no la ve). Lo que el recorte por nivel hace con cada diff lo prueba
-- `cotizaciones-visibilidad.sql`; el autor y las etiquetas, `cotizacion-revisiones-autor.sql`; acá va lo nuevo: el ancla, el cursor, la guarda y la firma.
-- Corre después de `cotizacion-revisiones-autor.sql`; la dueña es `…0001` (la crea `humo.sql`). Cada bloque abre su transacción y la revierte.
--
-- El terreno: dos cotizaciones con 6 revisiones cada una. La PROBADA (`p`) tiene la i-ésima a T0 + i horas (i = 1..6); la OTRA (`o`), creada DESPUÉS (todos sus
-- ids son mayores que los de `p`), tiene la j-ésima a T0 + (j - 1) horas y media (0:30, 1:30, 2:30, 3:30, 4:30, 5:30): una entre cada dos de las de `p`, y la 4.ª
-- de `o` (3:30) entre la 3.ª y la 4.ª de `p`.

create or replace function pg_temp.rf_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true), set_config('request.jwt.claim.role', 'authenticated', true),
          set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    reset role;
    return jsonb_build_object('error', sqlstate, 'mensaje', sqlerrm);
  end;
  reset role;
  return v;
end $f$;

create or replace function pg_temp.rf_persona(p_id uuid, p_nombre text, p_claves text[]) returns uuid language plpgsql as $f$
declare v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = p_nombre where id = p_id;
  insert into public.roles (clave, nombre) values ('rf_' || substr(p_id::text, 25, 12), 'RF ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c, null, 'todos');
  end loop;
  return p_id;
end $f$;

-- T0, el instante del que cuelgan todas las horas.
create or replace function pg_temp.rf_t0() returns timestamptz language sql immutable as $$ select timestamptz '2026-01-01 10:00:00+00' $$;

-- Las dos cotizaciones con sus 6 revisiones y sus horas. `valores` cambia en cada una (el visible y el oculto, del nivel «costos»).
create or replace function pg_temp.rf_terreno(out p uuid, out o uuid) language plpgsql as $f$
declare org uuid; f uuid; i int;
begin
  insert into public.origenes (clave, nombre) values ('rf_' || substr(gen_random_uuid()::text, 1, 8), 'RF origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into org;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  values (org, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
            jsonb_build_object('id', 'oculto', 'tipo', 'input', 'etiqueta', 'Oculto', 'bucket', 'origen'),
            jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible', 'oculto'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
          'grupos', '[]'::jsonb),
          '{}', '{}', '{"visible": {"ver": "todos", "editar": "todos"}, "oculto": {"ver": "costos", "editar": "costos"}, "total": {"ver": "todos", "editar": null}}', now() - interval '1 day')
  returning id into f;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base)
  values (org, '00000000-0000-0000-0000-000000000001', f, '{"visible": 0, "oculto": 0, "total": 0}', '{"visible": "input", "oculto": "input"}', '{}', '{"usd": 0}', 0)
  returning id into p;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base)
  values (org, '00000000-0000-0000-0000-000000000001', f, '{"visible": 0, "oculto": 0, "total": 0}', '{"visible": "input", "oculto": "input"}', '{}', '{"usd": 0}', 0)
  returning id into o;
  -- Primero las de la probada y DESPUÉS las de la otra: todos los ids de `o` quedan por encima de los de `p`.
  for i in 1..6 loop
    update public.cotizaciones set valores = jsonb_build_object('visible', i, 'oculto', 10 + i, 'total', 10 + 2 * i), total_base = 10 + 2 * i where id = p;
  end loop;
  for i in 1..6 loop
    update public.cotizaciones set valores = jsonb_build_object('visible', i, 'oculto', 20 + i, 'total', 20 + 2 * i), total_base = 20 + 2 * i where id = o;
  end loop;
  update public.cotizaciones_revisiones r set creado_en = pg_temp.rf_t0() + (t.n * interval '1 hour')
    from (select id, row_number() over (order by id) as n from public.cotizaciones_revisiones where cotizacion_id = p) t where r.id = t.id;
  update public.cotizaciones_revisiones r set creado_en = pg_temp.rf_t0() + ((t.n - 1) * interval '1 hour') + interval '30 minutes'
    from (select id, row_number() over (order by id) as n from public.cotizaciones_revisiones where cotizacion_id = o) t where r.id = t.id;
end $f$;

-- Los ids de la respuesta, en su orden; los ids de una cotización, de la más vieja a la más nueva (la i-ésima de `p` es `ids[i]`).
create or replace function pg_temp.rf_ids_de(r jsonb) returns bigint[] language sql as $$
  select coalesce(array_agg((x ->> 'id')::bigint order by ord), '{}') from jsonb_array_elements(r -> 'revisiones') with ordinality t (x, ord)
$$;
create or replace function pg_temp.rf_ids(c uuid) returns bigint[] language sql as $$
  select array_agg(id order by id) from public.cotizaciones_revisiones where cotizacion_id = c
$$;

-- @test cotizacion_revisiones: F1 con p_hasta después de la más nueva la respuesta es la de sin él, entera (la dueña y quien no ve el nivel «costos»); sin p_hasta nada cambia
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  sin uuid := pg_temp.rf_persona(gen_random_uuid(), 'Sin costos', array['cotizaciones.ver']);
  t record; q uuid; r1 jsonb; r2 jsonb; r3 jsonb;
begin
  select * into t from pg_temp.rf_terreno();
  foreach q in array array[duena, sin] loop
    r1 := pg_temp.rf_corre(q, format('select public.cotizacion_revisiones(%L)', t.p));
    r2 := pg_temp.rf_corre(q, format('select public.cotizacion_revisiones(%L, null, null, %L)', t.p, pg_temp.rf_t0() + interval '7 hours'));
    r3 := pg_temp.rf_corre(q, format('select public.cotizacion_revisiones(%L, null, null, null)', t.p));
    if r1 ? 'error' or jsonb_array_length(r1 -> 'revisiones') <> 6 or (r1 ->> 'hay_mas')::boolean then raise exception 'F1: sin p_hasta, %: %', q, r1; end if;
    if r2 is distinct from r1 then raise exception 'F1: p_hasta después de la más nueva, %: % contra %', q, r2, r1; end if;
    if r3 is distinct from r1 then raise exception 'F1: p_hasta nulo, %: % contra %', q, r3, r1; end if;
  end loop;
end $$;
rollback;

-- @test cotizacion_revisiones: F2 p_hasta entre la 3.ª y la 4.ª empieza en la 3.ª de ESA cotización (no en la de la otra); creado_en = p_hasta no entra; «Ver más» sin p_hasta llega a la 1.ª sin repetir ni saltar
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t record; ids bigint[]; r jsonb; r2 jsonb;
begin
  select * into t from pg_temp.rf_terreno();
  ids := pg_temp.rf_ids(t.p);
  -- 3:45: entre la 3.ª de la probada (3:00) y su 4.ª (4:00); la otra tiene su 4.ª a las 3:30, con un id mayor que todos los de la probada.
  r := pg_temp.rf_corre(duena, format('select public.cotizacion_revisiones(%L, null, null, %L)', t.p, pg_temp.rf_t0() + interval '3 hours 45 minutes'));
  if r ? 'error' or pg_temp.rf_ids_de(r) is distinct from array[ids[3], ids[2], ids[1]] or (r ->> 'hay_mas')::boolean then
    raise exception 'F2: p_hasta a las 3:45: % (esperaba %)', pg_temp.rf_ids_de(r), array[ids[3], ids[2], ids[1]];
  end if;
  -- Exclusivo: una revisión con creado_en = p_hasta no entra (la 3.ª está a las 3:00).
  r := pg_temp.rf_corre(duena, format('select public.cotizacion_revisiones(%L, null, null, %L)', t.p, pg_temp.rf_t0() + interval '3 hours'));
  if r ? 'error' or pg_temp.rf_ids_de(r) is distinct from array[ids[2], ids[1]] then
    raise exception 'F2: p_hasta = creado_en de la 3.ª: % (esperaba %)', pg_temp.rf_ids_de(r), array[ids[2], ids[1]];
  end if;
  -- Con p_tamano 2: la página [3.ª, 2.ª], hay más, el cursor es la 2.ª; «Ver más» (sin p_hasta) trae la 1.ª sola.
  r := pg_temp.rf_corre(duena, format('select public.cotizacion_revisiones(%L, null, 2, %L)', t.p, pg_temp.rf_t0() + interval '3 hours 45 minutes'));
  if r ? 'error' or pg_temp.rf_ids_de(r) is distinct from array[ids[3], ids[2]] or (r ->> 'hay_mas') <> 'true' or (r ->> 'siguiente')::bigint is distinct from ids[2] then
    raise exception 'F2: con p_tamano 2: % hay_mas % siguiente %', pg_temp.rf_ids_de(r), r ->> 'hay_mas', r ->> 'siguiente';
  end if;
  r2 := pg_temp.rf_corre(duena, format('select public.cotizacion_revisiones(%L, %s, 2)', t.p, (r ->> 'siguiente')::bigint));
  if r2 ? 'error' or pg_temp.rf_ids_de(r2) is distinct from array[ids[1]] or (r2 ->> 'hay_mas') <> 'false' or r2 -> 'siguiente' is distinct from 'null'::jsonb then
    raise exception 'F2: «Ver más»: % hay_mas % siguiente %', pg_temp.rf_ids_de(r2), r2 ->> 'hay_mas', r2 -> 'siguiente';
  end if;
  -- La otra, por su cuenta: a las 3:45 su 4.ª (3:30) es el ancla.
  r := pg_temp.rf_corre(duena, format('select public.cotizacion_revisiones(%L, null, null, %L)', t.o, pg_temp.rf_t0() + interval '3 hours 45 minutes'));
  if r ? 'error' or pg_temp.rf_ids_de(r) is distinct from array(select x from unnest(pg_temp.rf_ids(t.o)) with ordinality u (x, n) where n <= 4 order by n desc) then
    raise exception 'F2: la otra: %', pg_temp.rf_ids_de(r);
  end if;
end $$;
rollback;

-- @test cotizacion_revisiones: F3 p_hasta antes de la más vieja da, a quien ve la cotización, la respuesta vacía exacta
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t record; r jsonb;
begin
  select * into t from pg_temp.rf_terreno();
  -- T0 + 1 h es la más vieja de la probada: con p_hasta = T0 + 1 h (exclusivo) y con una hora antes, nada.
  foreach r in array array[
    pg_temp.rf_corre(duena, format('select public.cotizacion_revisiones(%L, null, null, %L)', t.p, pg_temp.rf_t0() + interval '1 hour')),
    pg_temp.rf_corre(duena, format('select public.cotizacion_revisiones(%L, null, null, %L)', t.p, pg_temp.rf_t0() - interval '1 hour'))] loop
    if r is distinct from '{"revisiones": [], "hay_mas": false, "siguiente": null, "etiquetas": {"nodos": {}, "grupos": {}}}'::jsonb then
      raise exception 'F3: la respuesta vacía: %', r;
    end if;
  end loop;
end $$;
rollback;

-- @test cotizacion_revisiones: F4 con p_antes y p_hasta juntos la página empieza en el menor de los dos
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t record; ids bigint[]; r jsonb;
begin
  select * into t from pg_temp.rf_terreno();
  ids := pg_temp.rf_ids(t.p);
  -- p_hasta a las 3:45 (ancla: la 3.ª). p_antes = la 5.ª: gana la fecha → [3.ª, 2.ª, 1.ª].
  r := pg_temp.rf_corre(duena, format('select public.cotizacion_revisiones(%L, %s, null, %L)', t.p, ids[5], pg_temp.rf_t0() + interval '3 hours 45 minutes'));
  if r ? 'error' or pg_temp.rf_ids_de(r) is distinct from array[ids[3], ids[2], ids[1]] then
    raise exception 'F4: gana la fecha: %', pg_temp.rf_ids_de(r);
  end if;
  -- p_antes = la 2.ª: gana el cursor → [1.ª] (con p_hasta a las 3:45 la fecha dejaría la 3.ª y la 2.ª).
  r := pg_temp.rf_corre(duena, format('select public.cotizacion_revisiones(%L, %s, null, %L)', t.p, ids[2], pg_temp.rf_t0() + interval '3 hours 45 minutes'));
  if r ? 'error' or pg_temp.rf_ids_de(r) is distinct from array[ids[1]] then
    raise exception 'F4: gana el cursor: %', pg_temp.rf_ids_de(r);
  end if;
end $$;
rollback;

-- @test cotizacion_revisiones: F5 la guarda va primero con p_hasta: quien no ve la cotización recibe el 42501 de siempre, haya o no ancla; quien no ve el nivel recibe cada diff recortado
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  nover uuid := pg_temp.rf_persona(gen_random_uuid(), 'No ve', '{}');
  sin uuid := pg_temp.rf_persona(gen_random_uuid(), 'Sin costos', array['cotizaciones.ver']);
  t record; r jsonb; sql text;
begin
  select * into t from pg_temp.rf_terreno();
  -- Sin ancla (antes de la más vieja): ni la respuesta vacía de F3 ni nada de la cotización, el mismo 42501.
  foreach sql in array array[
    format('select public.cotizacion_revisiones(%L, null, null, %L)', t.p, pg_temp.rf_t0() - interval '1 hour'),
    format('select public.cotizacion_revisiones(%L, null, null, %L)', t.p, pg_temp.rf_t0() + interval '1 hour'),
    format('select public.cotizacion_revisiones(%L, null, null, %L)', t.p, pg_temp.rf_t0() + interval '7 hours'),
    format('select public.cotizacion_revisiones(%L)', t.p)] loop
    r := pg_temp.rf_corre(nover, sql);
    if r ->> 'error' is distinct from '42501' then raise exception 'F5: quien no la ve: % con %', r, sql; end if;
  end loop;
  -- Un id que no existe, con p_hasta, también.
  r := pg_temp.rf_corre(duena, format('select public.cotizacion_revisiones(%L, null, null, %L)', gen_random_uuid(), pg_temp.rf_t0() + interval '7 hours'));
  if r ->> 'error' is distinct from '42501' then raise exception 'F5: un id que no existe: %', r; end if;
  r := pg_temp.rf_corre(duena, format('select public.cotizacion_revisiones(%L, null, null, %L)', gen_random_uuid(), pg_temp.rf_t0() - interval '1 hour'));
  if r ->> 'error' is distinct from '42501' then raise exception 'F5: un id que no existe, sin ancla: %', r; end if;
  -- Quien ve pero no el nivel «costos»: el nodo oculto no viaja en ningún diff ni en las etiquetas (con p_hasta, como sin él).
  r := pg_temp.rf_corre(sin, format('select public.cotizacion_revisiones(%L, null, null, %L)', t.p, pg_temp.rf_t0() + interval '7 hours'));
  if r ? 'error' or jsonb_array_length(r -> 'revisiones') <> 6 or r::text not like '%"visible"%' then raise exception 'F5: sin costos, con p_hasta: %', r; end if;
  if r::text like '%oculto%' or r::text like '%Oculto%' then raise exception 'F5: sin costos recibe lo oculto: %', r; end if;
  r := pg_temp.rf_corre(duena, format('select public.cotizacion_revisiones(%L, null, null, %L)', t.p, pg_temp.rf_t0() + interval '7 hours'));
  if r::text not like '%"oculto"%' then raise exception 'F5: la dueña no ve lo oculto (el control no mide nada): %', r; end if;
end $$;
rollback;

-- @test cotizacion_revisiones: F6 una sola firma, definidora, search_path vacío, estable; EXECUTE sólo de authenticated y service_role; el índice de p_hasta, exacto
begin;
do $$
declare
  v_n int; v_def record; v_idx text;
begin
  select count(*) into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'cotizacion_revisiones';
  if v_n <> 1 then raise exception 'F6: % sobrecargas de cotizacion_revisiones', v_n; end if;
  select p.prosecdef, p.provolatile, p.proconfig, p.oid, pg_get_function_identity_arguments(p.oid) as args into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'cotizacion_revisiones';
  if not v_def.prosecdef then raise exception 'F6: no es definidora (prosecdef falso)'; end if;
  if v_def.provolatile is distinct from 's' then raise exception 'F6: no es estable: %', v_def.provolatile; end if;
  if v_def.proconfig is null or not ('search_path=""' = any (v_def.proconfig)) then raise exception 'F6: search_path: %', v_def.proconfig; end if;
  if v_def.args is distinct from 'p_cotizacion uuid, p_antes bigint, p_tamano integer, p_hasta timestamp with time zone' then raise exception 'F6: los argumentos: %', v_def.args; end if;
  if not has_function_privilege('authenticated', v_def.oid, 'execute') or not has_function_privilege('service_role', v_def.oid, 'execute') then
    raise exception 'F6: authenticated o service_role sin EXECUTE';
  end if;
  if has_function_privilege('anon', v_def.oid, 'execute') then raise exception 'F6: anon ejecuta'; end if;
  if exists (select 1 from pg_proc p, aclexplode(p.proacl) x where p.oid = v_def.oid and x.grantee = 0) then raise exception 'F6: PUBLIC ejecuta'; end if;
  select pg_get_indexdef(i.indexrelid) into v_idx from pg_index i join pg_class c on c.oid = i.indexrelid where c.relname = 'cotizaciones_revisiones_cotizacion_creado_idx';
  if v_idx is distinct from 'CREATE INDEX cotizaciones_revisiones_cotizacion_creado_idx ON public.cotizaciones_revisiones USING btree (cotizacion_id, creado_en DESC, id DESC)' then
    raise exception 'F6: el índice: %', v_idx;
  end if;
  if not exists (select 1 from pg_class where relname = 'cotizaciones_revisiones_cotizacion_idx') then raise exception 'F6: el índice de la página ya no está'; end if;
end $$;
rollback;
