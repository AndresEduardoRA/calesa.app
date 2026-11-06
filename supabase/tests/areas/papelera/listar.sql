-- La papelera propia de cotizaciones: la lista de lotes por cursor y un lote (paso 4.24-1a), como la de vehículos.
-- No depende de otro archivo (`SOLO=areas/papelera/listar.sql`). Cada bloque que escribe abre su transacción y la revierte.
--
-- Qué asegura:
--   L1. Con `cotizaciones.papelera.purgar`, los lotes ajenos; sin ella, sólo los propios.
--   L2. El cursor, hacia adelante y hacia atrás, sin repetir ni saltar.
--   L3. Un lote de vehículos con cotizaciones no sale (P8 a), ni uno cerrado, ni uno sin nada en la papelera.
--   L4. `p_tope` y `p_primeros` acotados (51 lotes y 200 cotizaciones como mucho; 20 por omisión), con `en_papelera` exacto.
--   L5. Las claves exactas del lote y de cada cotización (P6 a: nada que la RLS esconda).
--   L6. `cotizaciones_papelera_lote()`: el propio y, con la clave, el ajeno; sin ella el ajeno, el cerrado y uno sin nada en la papelera dan nulo.
--   L7. La lista pregunta «le queda alguna» con una sonda por lote (`limit 1`), nunca con un `exists`: su plan genérico lee entero el índice del lote.

create or replace function pg_temp.pl_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('pl_' || substr(v_id::text, 1, 8), 'PL ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado; si falla, la prueba cae.
create or replace function pg_temp.pl_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  execute p_sql into v;
  reset role;
  return v;
end $f$;

-- Los ids de lote de una página, en su orden.
create or replace function pg_temp.pl_ids(p jsonb) returns uuid[] language sql as $f$
  select coalesce(array_agg((x ->> 'id')::uuid order by o), '{}') from jsonb_array_elements(p) with ordinality t (x, o);
$f$;

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.pl_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; v_def jsonb;
begin
  insert into public.origenes (clave, nombre) values ('pl_' || substr(gen_random_uuid()::text, 1, 8), 'PL origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Un lote de ese tipo, de esa persona, creado hace p_hace, con n cotizaciones en la papelera.
create or replace function pg_temp.pl_lote(p_quien uuid, e jsonb, p_n int, p_hace interval, p_tipo text default 'cotizaciones') returns uuid language plpgsql as $f$
declare v_l uuid;
begin
  insert into public.lotes_papelera (tipo, creado_por, creado_en, actualizado_en, resumen)
  values (p_tipo::public.tipo_lote_papelera, p_quien, now() - p_hace, now() - p_hace, jsonb_build_object('cantidad', p_n, 'restaurados', 0, 'purgados', 0))
  returning id into v_l;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, titulo, valores, fuentes, tipos_cambio, totales, total_base, eliminado_en, eliminado_por, lote_papelera_id)
  select (e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, case when g % 2 = 0 then 'PL ' || g end, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10,
         now(), p_quien, v_l
    from generate_series(1, p_n) g;
  return v_l;
end $f$;

-- @test papelera de cotizaciones: con la clave se ven los lotes ajenos; sin ella, sólo los propios (L1)
begin;
do $$
declare e jsonb := pg_temp.pl_origen(); k uuid; a uuid; b uuid; l_a uuid; l_b uuid; v uuid[];
begin
  k := pg_temp.pl_persona(array['cotizaciones.papelera.purgar']);
  a := pg_temp.pl_persona(array['cotizaciones.ver']);
  b := pg_temp.pl_persona(array['cotizaciones.ver']);
  l_a := pg_temp.pl_lote(a, e, 2, '1 minute');
  l_b := pg_temp.pl_lote(b, e, 2, '2 minutes');
  v := pg_temp.pl_ids(pg_temp.pl_corre(k, 'select public.cotizaciones_papelera_listar(null, null, false, 51)'));
  if not (l_a = any (v) and l_b = any (v)) then raise exception 'con la clave no ve los dos lotes ajenos: %', v; end if;
  v := pg_temp.pl_ids(pg_temp.pl_corre(a, 'select public.cotizaciones_papelera_listar(null, null, false, 51)'));
  if v is distinct from array[l_a] then raise exception 'sin la clave debía ver sólo su lote: %', v; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: el cursor va hacia adelante y hacia atrás sin repetir ni saltar (L2)
begin;
do $$
declare e jsonb := pg_temp.pl_origen(); a uuid; l uuid[] := '{}'; p1 uuid[]; p2 uuid[]; p3 uuid[]; atras uuid[]; ult jsonb;
begin
  a := pg_temp.pl_persona(array['cotizaciones.ver']);
  for i in 1 .. 7 loop l := l || pg_temp.pl_lote(a, e, 1, make_interval(mins => i)); end loop;   -- l[1], el más nuevo
  p1 := pg_temp.pl_ids(pg_temp.pl_corre(a, 'select public.cotizaciones_papelera_listar(null, null, false, 3)'));
  if p1 is distinct from l[1:3] then raise exception 'la página 1 no son los tres más nuevos: % contra %', p1, l[1:3]; end if;
  select x into ult from jsonb_array_elements(pg_temp.pl_corre(a, 'select public.cotizaciones_papelera_listar(null, null, false, 3)')) with ordinality t (x, o) order by o desc limit 1;
  p2 := pg_temp.pl_ids(pg_temp.pl_corre(a, format('select public.cotizaciones_papelera_listar(%L, %L, false, 3)', ult ->> 'creado_en', ult ->> 'id')));
  if p2 is distinct from l[4:6] then raise exception 'la página 2 repite o salta: % contra %', p2, l[4:6]; end if;
  p3 := pg_temp.pl_ids(pg_temp.pl_corre(a, format('select public.cotizaciones_papelera_listar(%L, %L, false, 3)',
          (select creado_en from public.lotes_papelera where id = l[6]), l[6])));
  if p3 is distinct from l[7:7] then raise exception 'la página 3 repite o salta: % contra %', p3, l[7:7]; end if;
  atras := pg_temp.pl_ids(pg_temp.pl_corre(a, format('select public.cotizaciones_papelera_listar(%L, %L, true, 3)',
          (select creado_en from public.lotes_papelera where id = l[4]), l[4])));
  if atras is distinct from array[l[3], l[2], l[1]] then raise exception 'hacia atrás desde la página 2 no da la 1 (de la más cercana a la más lejana): %', atras; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: no salen un lote de vehículos con cotizaciones, uno cerrado ni uno sin nada en la papelera (L3)
begin;
do $$
declare e jsonb := pg_temp.pl_origen(); a uuid; l_c uuid; l_v uuid; l_cerrado uuid; l_vacio uuid; v uuid[];
begin
  a := pg_temp.pl_persona(array['cotizaciones.ver']);
  l_c := pg_temp.pl_lote(a, e, 1, '1 minute');
  l_v := pg_temp.pl_lote(a, e, 1, '2 minutes', 'vehiculos');
  l_cerrado := pg_temp.pl_lote(a, e, 1, '3 minutes');
  update public.lotes_papelera set restaurado_en = now(), restaurado_por = a where id = l_cerrado;
  l_vacio := pg_temp.pl_lote(a, e, 1, '4 minutes');
  update public.cotizaciones set eliminado_en = null, eliminado_por = null, lote_papelera_id = null where lote_papelera_id = l_vacio;
  v := pg_temp.pl_ids(pg_temp.pl_corre(a, 'select public.cotizaciones_papelera_listar(null, null, false, 51)'));
  if v is distinct from array[l_c] then raise exception 'debía salir sólo el lote de cotizaciones pendiente y con algo: %', v; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: la página tiene tope (51 lotes; 20 cotizaciones por omisión, 200 como mucho) y en_papelera es exacto (L4)
begin;
do $$
declare e jsonb := pg_temp.pl_origen(); a uuid; p jsonb; l25 uuid;
begin
  a := pg_temp.pl_persona(array['cotizaciones.ver']);
  l25 := pg_temp.pl_lote(a, e, 25, '1 minute');
  for i in 2 .. 60 loop perform pg_temp.pl_lote(a, e, 1, make_interval(mins => i)); end loop;
  p := pg_temp.pl_corre(a, 'select public.cotizaciones_papelera_listar(null, null, false, 100000)');
  if jsonb_array_length(p) <> 51 then raise exception 'p_tope 100000 debía dar 51 lotes y dio %', jsonb_array_length(p); end if;
  if (p -> 0 ->> 'id')::uuid <> l25 or jsonb_array_length(p -> 0 -> 'cotizaciones') <> 20 or (p -> 0 ->> 'en_papelera')::int <> 25 then
    raise exception 'por omisión, 20 cotizaciones y en_papelera 25: %', (p -> 0) - 'cotizaciones'; end if;
  p := pg_temp.pl_corre(a, 'select public.cotizaciones_papelera_listar(null, null, false, 1, 100000)');
  if jsonb_array_length(p -> 0 -> 'cotizaciones') <> 25 then raise exception 'p_primeros 100000 debía traer las 25: %', jsonb_array_length(p -> 0 -> 'cotizaciones'); end if;
  p := pg_temp.pl_corre(a, 'select public.cotizaciones_papelera_listar(null, null, false, 0, 0)');
  if jsonb_array_length(p) <> 1 or jsonb_array_length(p -> 0 -> 'cotizaciones') <> 1 then raise exception 'p_tope y p_primeros 0 debían acotarse a 1: %', p; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: el lote y cada cotización llevan sus claves exactas, nada que la RLS esconda (L5)
begin;
do $$
declare e jsonb := pg_temp.pl_origen(); a uuid; p jsonb; c jsonb;
begin
  a := pg_temp.pl_persona(array['cotizaciones.ver']);
  perform pg_temp.pl_lote(a, e, 2, '1 minute');
  p := pg_temp.pl_corre(a, 'select public.cotizaciones_papelera_listar(null, null, false, 1)') -> 0;
  if (select array_agg(k order by k) from jsonb_object_keys(p) k)
     is distinct from array['actualizado_en', 'cotizaciones', 'creado_en', 'creado_por_nombre', 'en_papelera', 'enviados', 'es_mio', 'id', 'purga_el'] then
    raise exception 'las claves del lote no son las esperadas: %', (select array_agg(k order by k) from jsonb_object_keys(p) k); end if;
  if (select array_agg(distinct k order by k) from jsonb_array_elements(p -> 'cotizaciones') x, jsonb_object_keys(x) k)
     is distinct from array['clase', 'creado_en', 'id', 'numero', 'origen_id', 'titulo'] then
    raise exception 'las claves de una cotización no son las esperadas: %', p -> 'cotizaciones'; end if;
  if (p ->> 'es_mio')::boolean is not true or (p ->> 'enviados')::int <> 2 then raise exception 'es_mio o enviados mal: %', p - 'cotizaciones'; end if;
  -- Una sin título se nombra por su número; numero ascendente.
  for c in select x from jsonb_array_elements(p -> 'cotizaciones') x loop
    if c ->> 'titulo' is null or (c ->> 'titulo' not like 'PL %' and c ->> 'titulo' <> 'Cotización #' || (c ->> 'numero')) then raise exception 'un título mal: %', c; end if;
  end loop;
  if (p -> 'cotizaciones' -> 0 ->> 'numero')::bigint > (p -> 'cotizaciones' -> 1 ->> 'numero')::bigint then raise exception 'las cotizaciones no van por número'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: un lote se lee si es propio o con la clave; el ajeno sin ella, el cerrado y el vacío dan nulo (L6)
begin;
do $$
declare e jsonb := pg_temp.pl_origen(); k uuid; a uuid; b uuid; l_a uuid; l_cerrado uuid; r jsonb;
begin
  k := pg_temp.pl_persona(array['cotizaciones.papelera.purgar']);
  a := pg_temp.pl_persona(array['cotizaciones.ver']);
  b := pg_temp.pl_persona(array['cotizaciones.ver']);
  l_a := pg_temp.pl_lote(a, e, 3, '1 minute');
  l_cerrado := pg_temp.pl_lote(a, e, 1, '2 minutes');
  update public.lotes_papelera set restaurado_en = now(), restaurado_por = a where id = l_cerrado;
  r := pg_temp.pl_corre(a, format('select public.cotizaciones_papelera_lote(%L)', l_a));
  if (r ->> 'id')::uuid is distinct from l_a or jsonb_array_length(r -> 'cotizaciones') <> 3 then raise exception 'el propio no se lee entero: %', r; end if;
  r := pg_temp.pl_corre(k, format('select public.cotizaciones_papelera_lote(%L)', l_a));
  if (r ->> 'id')::uuid is distinct from l_a or (r ->> 'es_mio')::boolean then raise exception 'con la clave, el ajeno: %', r; end if;
  r := pg_temp.pl_corre(b, format('select public.cotizaciones_papelera_lote(%L)', l_a));
  if r is not null then raise exception 'sin la clave, el ajeno debía dar nulo: %', r; end if;
  r := pg_temp.pl_corre(a, format('select public.cotizaciones_papelera_lote(%L)', l_cerrado));
  if r is not null then raise exception 'el cerrado debía dar nulo: %', r; end if;
  update public.cotizaciones set eliminado_en = null, eliminado_por = null, lote_papelera_id = null where lote_papelera_id = l_a;
  r := pg_temp.pl_corre(a, format('select public.cotizaciones_papelera_lote(%L)', l_a));
  if r is not null then raise exception 'un lote sin nada en la papelera debía dar nulo: %', r; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: la lista usa una sonda por lote y ningún exists, en sus tres consultas (L7)
do $$
declare v_src text;
begin
  select regexp_replace(f.prosrc, '--[^\n]*', '', 'g') into v_src from pg_proc f join pg_namespace n on n.oid = f.pronamespace
   where n.nspname = 'public' and f.proname = 'cotizaciones_papelera_listar';
  if v_src is null then raise exception 'no existe public.cotizaciones_papelera_listar'; end if;
  if v_src ~* '\mexists\s*\(' then raise exception 'la lista volvió a un exists: con pocas en la papelera su plan genérico lee entero cotizaciones_lote_papelera_idx'; end if;
  if (select count(*) from regexp_matches(v_src, 'c\.eliminado_en is not null limit 1\)', 'g')) <> 3 then
    raise exception 'las tres consultas de la lista debían preguntar con la sonda por lote (limit 1)'; end if;
end $$;
