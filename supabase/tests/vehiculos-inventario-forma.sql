-- `vehiculos_inventario()` (paso 4.16-2a), la forma: el catálogo de sus cinco funciones y el patrón «contiene» (L1), el texto de la consulta (L1b), la validación de
-- los filtros (L1c) y los índices de las rutas (L3). Lo que devuelve, contra la RLS, lo prueba `vehiculos-inventario.sql`; los filtros contra la forma de PostgREST,
-- `vehiculos-inventario-filtros.sql`; el costo, `medir-vehiculos-inventario.sql`. Cada bloque abre su transacción y la revierte; sus ayudantes `pg_temp.vf_*` nacen
-- dentro de ella (una sola sesión de PGlite: no llegan a los archivos que siguen). La dueña es `…0001` (la crea `humo.sql`). Compara ids, catálogo y fragmentos del texto.

-- @test vehiculos_inventario: L1 el catálogo de las cinco funciones (invocadoras, estables, search_path vacío, firma, columnas, privilegios, comentario) y el patrón de la búsqueda
begin;
do $$
declare
  v_firmas constant jsonb := jsonb_build_object(
    'vehiculos_inventario', 'p_origen uuid, p_tamano integer, p_filtros jsonb, p_cursor_en timestamp with time zone, p_cursor_id uuid, p_hacia_atras boolean',
    '_vehiculos_inventario_sql', 'p_filtros jsonb, p_rutas text, p_sentido text',
    '_vehiculos_inventario_validar', 'p_filtros jsonb',
    '_vehiculos_inventario_condicion', 'p_tipo text, p_columna text, p_i integer',
    '_vehiculos_inventario_patron', 'p_i integer');
  v_devuelve constant jsonb := jsonb_build_object('_vehiculos_inventario_sql', 'text', '_vehiculos_inventario_validar', 'void',
    '_vehiculos_inventario_condicion', 'text', '_vehiculos_inventario_patron', 'text');
  -- `COLUMNAS_DE_VEHICULO` (src/modules/vehiculos/entities/vehiculo.ts) sin el embebido, cada una con el tipo de su columna de `vehiculos`; más las dos calculadas.
  v_columnas constant text[] := array['id', 'numero', 'origen_id', 'titulo', 'marca', 'modelo', 'anio', 'vin', 'lote', 'plataforma', 'url_origen', 'precio',
    'precio_negociable', 'acepta_permuta', 'placado', 'kilometraje', 'categoria_id', 'fase_id', 'atributos', 'lead_id', 'publicado_web', 'destacado_web', 'precio_web',
    'precio_web_hasta', 'precio_web_nota', 'creado_por', 'creado_en', 'actualizado_en', 'estado_subasta'];
  p record; k text; v_salida text[]; v_tipos oid[]; i int; v_tipo oid; t text; v_hoy text; v_nuevo text; v_sql text;
begin
  for k in select jsonb_object_keys(v_firmas) loop
    if (select count(*) from pg_proc x where x.proname = k and x.pronamespace = 'public'::regnamespace) <> 1 then raise exception 'L1: no hay exactamente una public.%', k; end if;
    select x.oid, x.prosecdef, x.provolatile, x.proconfig, x.prosrc into p from pg_proc x where x.proname = k and x.pronamespace = 'public'::regnamespace;
    if p.prosecdef then raise exception 'L1: % corre con los derechos de su dueña: tiene que ser invocadora (la RLS decide)', k; end if;
    if p.provolatile <> 's' then raise exception 'L1: % no es stable (%)', k, p.provolatile; end if;
    if not coalesce(p.proconfig @> array['search_path=""'], false) then raise exception 'L1: % search_path: %', k, p.proconfig; end if;
    if pg_get_function_identity_arguments(p.oid) is distinct from v_firmas ->> k then raise exception 'L1: la firma de % es %', k, pg_get_function_identity_arguments(p.oid); end if;
    if v_devuelve ? k and pg_get_function_result(p.oid) is distinct from v_devuelve ->> k then raise exception 'L1: % devuelve %', k, pg_get_function_result(p.oid); end if;
    if not has_function_privilege('authenticated', p.oid, 'execute') then raise exception 'L1: authenticated no ejecuta %', k; end if;
    if has_function_privilege('anon', p.oid, 'execute') then raise exception 'L1: anon ejecuta %', k; end if;
    if exists (select 1 from aclexplode((select proacl from pg_proc where oid = p.oid)) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') then raise exception 'L1: PUBLIC ejecuta %', k; end if;
    if coalesce(obj_description(p.oid, 'pg_proc'), '') = '' then raise exception 'L1: % no lleva comentario', k; end if;
  end loop;
  -- La página: el tope de 100 (MAXIMO_DE_PAGINA_DE_VEHICULOS), y las columnas con sus tipos.
  select x.oid, x.prosrc into p from pg_proc x where x.proname = 'vehiculos_inventario' and x.pronamespace = 'public'::regnamespace;
  if p.prosrc !~ '_acotar_pagina\(p_tamano, 100, 100\)' then raise exception 'L1: vehiculos_inventario no acota con _acotar_pagina(p_tamano, 100, 100)'; end if;
  select array_agg(n order by o), array_agg(ty order by o) into v_salida, v_tipos
    from pg_proc x, unnest(x.proargnames, x.proallargtypes::oid[], x.proargmodes::text[]) with ordinality u (n, ty, m, o) where x.oid = p.oid and m = 't';
  if v_salida is distinct from v_columnas || array['limpieza_el', 'portada_ruta'] then raise exception 'L1: las columnas de vehiculos_inventario son %', v_salida; end if;
  for i in 1 .. cardinality(v_columnas) loop
    select a.atttypid into v_tipo from pg_attribute a where a.attrelid = 'public.vehiculos'::regclass and a.attname = v_columnas[i] and not a.attisdropped;
    if v_tipos[i] is distinct from v_tipo then raise exception 'L1: % sale como % y en vehiculos es %', v_columnas[i], v_tipos[i]::regtype, v_tipo::regtype; end if;
  end loop;
  if v_tipos[cardinality(v_columnas) + 1] <> 'date'::regtype or v_tipos[cardinality(v_columnas) + 2] <> 'text'::regtype then raise exception 'L1: limpieza_el o portada_ruta con otro tipo'; end if;
  -- El patrón va en el texto: authenticated sigue sin ejecutar _lead_busqueda_patron.
  if has_function_privilege('authenticated', 'public._lead_busqueda_patron(text)'::regprocedure, 'execute') then raise exception 'L1: authenticated ejecuta _lead_busqueda_patron'; end if;
  -- La equivalencia del patrón (como postgres): el fragmento de `_vehiculos_inventario_patron(0)`, evaluado con `$1` = [{texto}], da lo de `_lead_busqueda_patron(texto)`.
  foreach t in array array['', '50%', 'a_b', 'x*y', '\', '\\', '\%', '\_', '%_*\', '**', '''', '$1', 'ÑandÚ', repeat('ab%_\*', 166) || 'abcd'] loop
    execute 'select ' || public._vehiculos_inventario_patron(0) into v_nuevo using jsonb_build_array(jsonb_build_object('texto', t));
    v_hoy := public._lead_busqueda_patron(t);
    if v_nuevo is distinct from v_hoy then raise exception 'L1: el patrón de «%» da «%» y _lead_busqueda_patron «%»', left(t, 40), left(v_nuevo, 60), left(v_hoy, 60); end if;
  end loop;
  -- El texto armado de una búsqueda (posición 0) y de un atributo_texto (posición 1) lleva ese fragmento.
  v_sql := public._vehiculos_inventario_sql('[{"tipo": "busqueda", "texto": "a"}, {"tipo": "atributo_texto", "clave": "color", "texto": "b"}]', 'origen', 'primera');
  if position(public._vehiculos_inventario_patron(0) in v_sql) = 0 or position(public._vehiculos_inventario_patron(1) in v_sql) = 0 then
    raise exception 'L1: el texto de la búsqueda o del atributo_texto no lleva el fragmento del patrón';
  end if;
end $$;
rollback;

-- @test vehiculos_inventario: L1b el texto depende sólo de la forma, ningún valor entra, las rutas con su limit, el sentido y la relectura sólo en la cartera
begin;
do $$
declare
  u1 constant text := '00000000-0000-4000-8000-000000000e91'; u2 constant text := '00000000-0000-4000-8000-000000000e92';
  f1 jsonb := jsonb_build_array(jsonb_build_object('tipo', 'busqueda', 'texto', 'abc'), jsonb_build_object('tipo', 'columna_en', 'columna', 'fase_id', 'valores', jsonb_build_array(u1), 'incluirNulo', false),
    jsonb_build_object('tipo', 'atributo_rango_numero', 'clave', 'km', 'min', 1, 'max', null));
  f2 jsonb := jsonb_build_array(jsonb_build_object('tipo', 'busqueda', 'texto', 'otra cosa'), jsonb_build_object('tipo', 'columna_en', 'columna', 'fase_id', 'valores', jsonb_build_array(u2, u1), 'incluirNulo', true),
    jsonb_build_object('tipo', 'atributo_rango_numero', 'clave', 'precio_x', 'min', null, 'max', 99.5));
  v_hostiles jsonb[] := array[
    jsonb_build_array(jsonb_build_object('tipo', 'busqueda', 'texto', 'zq1''; drop table x; --')),
    jsonb_build_array(jsonb_build_object('tipo', 'atributo_texto', 'clave', 'clave_hostil_zq', 'texto', 'zq2$1zq'),
                      jsonb_build_object('tipo', 'atributo_rango_texto', 'clave', 'clave_hostil_zq', 'desde', 'zq3%Lzq', 'antesDe', 'zq4"''zq')),
    jsonb_build_array(jsonb_build_object('tipo', 'atributos_contienen', 'alternativas', jsonb_build_array(jsonb_build_object('clave_hostil_zq', 'zq5\zq'))),
                      jsonb_build_object('tipo', 'en_vitrina', 'valor', true, 'fases', jsonb_build_array(u1))),
    jsonb_build_array(jsonb_build_object('tipo', 'columna_en', 'columna', 'categoria_id', 'valores', jsonb_build_array(u2), 'incluirNulo', false),
                      jsonb_build_object('tipo', 'por_limpiar', 'valor', false, 'hasta', '2031-07-19'), jsonb_build_object('tipo', 'columna_rango', 'columna', 'anio', 'min', 1987, 'max', 1999))];
  v_valores text[] := array['zq1''; drop table x; --', 'zq2$1zq', 'zq3%Lzq', 'zq4"''zq', 'zq5\zq', 'clave_hostil_zq', u1, u2, '2031-07-19', '1987', '1999'];
  f jsonb; r text; s text; v text; v_txt text; n int;
begin
  -- (a) La misma forma con otros valores da el mismo texto; otra forma (otra columna, otro orden, otro sentido, otras rutas), otro.
  foreach r in array array['origen', 'propios'] loop
    foreach s in array array['primera', 'siguiente', 'anterior'] loop
      if public._vehiculos_inventario_sql(f1, r, s) is distinct from public._vehiculos_inventario_sql(f2, r, s) then raise exception 'L1b (a): la misma forma da otro texto (%, %)', r, s; end if;
    end loop;
  end loop;
  v_txt := public._vehiculos_inventario_sql(f1, 'propios', 'siguiente');
  if v_txt = public._vehiculos_inventario_sql(jsonb_set(f1, '{1,columna}', '"categoria_id"'), 'propios', 'siguiente')
     or v_txt = public._vehiculos_inventario_sql(jsonb_build_array(f1 -> 1, f1 -> 0, f1 -> 2), 'propios', 'siguiente')
     or v_txt = public._vehiculos_inventario_sql(f1, 'propios', 'anterior') or v_txt = public._vehiculos_inventario_sql(f1, 'origen', 'siguiente') then
    raise exception 'L1b (a): otra forma da el mismo texto';
  end if;
  -- (b) Ningún valor de los pedidos hostiles aparece en el texto, con ninguna ruta ni sentido.
  foreach f in array v_hostiles loop
    foreach r in array array['origen', 'propios'] loop
      foreach s in array array['primera', 'siguiente', 'anterior'] loop
        v_txt := public._vehiculos_inventario_sql(f, r, s);
        foreach v in array v_valores loop
          if position(v in v_txt) > 0 then raise exception 'L1b (b): el valor «%» entró al texto (%, %)', v, r, s; end if;
        end loop;
        if position('zq' in v_txt) > 0 then raise exception 'L1b (b): un pedazo de un valor entró al texto (%, %)', r, s; end if;
      end loop;
    end loop;
  end loop;
  -- (c) Las rutas: con `origen`, sólo R1; con `propios`, R2 y R3; cada una con su `limit $3` (más el de la página). (d) La relectura sólo en R3.
  foreach r in array array['origen', 'propios'] loop
    foreach s in array array['primera', 'siguiente', 'anterior'] loop
      v_txt := public._vehiculos_inventario_sql(f1, r, s);
      n := (select count(*) from regexp_matches(v_txt, 'limit \$3', 'g'));
      if n <> (case r when 'origen' then 2 else 3 end) then raise exception 'L1b (c): % % lleva % «limit $3»', r, s, n; end if;
      if (position('v.creado_por = $4' in v_txt) > 0) <> (r = 'propios') or (position('mis_leads()' in v_txt) > 0) <> (r = 'propios')
         or (position('v.creado_por is distinct from $4' in v_txt) > 0) <> (r = 'propios') then
        raise exception 'L1b (c): las rutas de % no son las suyas', r;
      end if;
      if (position('(v.creado_en, v.id) < ($5, $6)' in v_txt) > 0) <> (s = 'siguiente') or (position('(v.creado_en, v.id) > ($5, $6)' in v_txt) > 0) <> (s = 'anterior')
         or (position('$5' in v_txt) > 0) <> (s <> 'primera') then
        raise exception 'L1b (c): el cursor de % no es el suyo', s;
      end if;
      if (v_txt ~ '\masc\M') <> (s = 'anterior') or (v_txt ~ '\mdesc\M') <> (s <> 'anterior') then raise exception 'L1b (c): el orden de % no es el suyo', s; end if;
      if (select count(*) from regexp_matches(v_txt, 'public\.limpieza_el\(v\) as limpieza_el, false as releer', 'g')) <> 1 then raise exception 'L1b (d): % sin limpieza_el(v) en R1 o R2', r; end if;
      if (select count(*) from regexp_matches(v_txt, 'null::date as limpieza_el, true as releer', 'g')) <> (case r when 'origen' then 0 else 1 end)
         or (select count(*) from regexp_matches(v_txt, 'true as releer', 'g')) <> (case r when 'origen' then 0 else 1 end) then
        raise exception 'L1b (d): % relee donde no debe (true as releer)', r;
      end if;
      if position('case when f.releer then (select public.limpieza_el(w) from public.vehiculos w where w.id = f.id) else f.limpieza_el end' in v_txt) = 0 then
        raise exception 'L1b (d): el marco de % no relee por el case', r;
      end if;
      if (select count(*) from regexp_matches(v_txt, 'left join lateral', 'g')) <> 1 or (position('cross join lateral' in v_txt) > 0) <> (r = 'propios') or position('f.*' in v_txt) > 0 then
        raise exception 'L1b (d): las laterales de % no son la portada (y la cartera), o el marco saca f.*', r;
      end if;
    end loop;
  end loop;
end $$;
rollback;

-- @test vehiculos_inventario: L1c la validación de los filtros (cada falla y sus bordes), la forma, el cursor y el origen, por la función y por el armador, como authenticated
begin;
-- El sqlstate y el hint de correr `p_sql` (con `$1` = `p_f`) como la dueña (authenticated); 'ok' si no falla.
create function pg_temp.vf_error(p_sql text, p_f jsonb default null) returns text language plpgsql as $f$
declare v_estado text; v_hint text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true), set_config('request.jwt.claim.role', 'authenticated', true),
          set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
  begin
    set local role authenticated;
    execute p_sql using p_f;
    reset role;
    return 'ok';
  exception when others then
    get stacked diagnostics v_estado = returned_sqlstate, v_hint = pg_exception_hint;
    return v_estado || '/' || coalesce(v_hint, '');
  end;
end $f$;
do $$
declare
  o constant uuid := (select id from public.origenes order by creado_en limit 1);
  v_por_funcion constant text := format('select count(*) from public.vehiculos_inventario(%L, null, $1)', o);
  v_por_armador constant text := 'select public._vehiculos_inventario_sql($1, ''origen'', ''primera'')';
  u500 jsonb := (select jsonb_agg(gen_random_uuid()) from generate_series(1, 500));
  a500 jsonb := (select jsonb_agg(jsonb_build_object('color', 'c' || i)) from generate_series(1, 500) i);
  v_malos jsonb[] := array[
    '{}', '"x"', '1', (select jsonb_agg(jsonb_build_object('tipo', 'busqueda', 'texto', 'a')) from generate_series(1, 101)), '[1]', '[null]', '[{"tipo": "otro"}]', '[{"texto": "a"}]',
    '[{"tipo": "busqueda"}]', '[{"tipo": "busqueda", "texto": 5}]', '[{"tipo": "columna_en", "columna": "fase_id", "valores": [], "incluirNulo": "true"}]',
    '[{"tipo": "columna_en", "columna": "fase_id", "incluirNulo": false}]', '[{"tipo": "columna_en", "columna": "creado_por", "valores": [], "incluirNulo": false}]',
    '[{"tipo": "columna_en", "columna": "fase_id", "valores": ["no-es-un-uuid"], "incluirNulo": false}]', '[{"tipo": "columna_en", "columna": "fase_id", "valores": [7], "incluirNulo": false}]',
    '[{"tipo": "columna_rango", "columna": "precio", "min": 1, "max": null}]', '[{"tipo": "columna_rango", "columna": "anio", "min": 1.5, "max": null}]',
    '[{"tipo": "columna_rango", "columna": "anio", "min": "2000", "max": null}]', '[{"tipo": "columna_rango", "columna": "anio", "min": null, "max": 2010.0}]', '[{"tipo": "columna_rango", "columna": "anio", "min": null, "max": 99999999}]',
    '[{"tipo": "en_vitrina", "valor": "si", "fases": []}]', '[{"tipo": "en_vitrina", "valor": true, "fases": ["x"]}]',
    '[{"tipo": "por_limpiar", "valor": true, "hasta": "2026-02-30"}]', '[{"tipo": "por_limpiar", "valor": true, "hasta": "2026-2-3"}]', '[{"tipo": "por_limpiar", "valor": true}]',
    '[{"tipo": "atributos_contienen", "alternativas": {}}]', '[{"tipo": "atributos_contienen", "alternativas": [{}]}]', '[{"tipo": "atributos_contienen", "alternativas": [{"a1": "x", "b1": "y"}]}]',
    '[{"tipo": "atributos_contienen", "alternativas": [{"Mala": "x"}]}]', '[{"tipo": "atributos_contienen", "alternativas": [{"color": 5}]}]',
    '[{"tipo": "atributos_contienen", "alternativas": [{"color": ["a", 1]}]}]', '[{"tipo": "atributos_contienen", "alternativas": ["rojo"]}]',
    '[{"tipo": "atributo_rango_numero", "clave": "Km", "min": 1, "max": null}]', '[{"tipo": "atributo_rango_numero", "clave": "km", "min": "1", "max": null}]',
    '[{"tipo": "atributo_rango_texto", "clave": "x", "desde": null, "antesDe": null}]', '[{"tipo": "atributo_rango_texto", "clave": "fecha", "desde": 1, "antesDe": null}]',
    '[{"tipo": "atributo_texto", "clave": "color"}]', '[{"tipo": "atributo_texto", "clave": "co lor", "texto": "a"}]',
    -- Los topes: 501 por arreglo, 1.001 sumando todo el pedido, 1.001 caracteres por texto y por alternativa.
    jsonb_build_array(jsonb_build_object('tipo', 'columna_en', 'columna', 'fase_id', 'valores', u500 || to_jsonb(gen_random_uuid()), 'incluirNulo', false)),
    jsonb_build_array(jsonb_build_object('tipo', 'en_vitrina', 'valor', true, 'fases', u500 || to_jsonb(gen_random_uuid()))),
    jsonb_build_array(jsonb_build_object('tipo', 'atributos_contienen', 'alternativas', a500 || jsonb_build_object('color', 'otro'))),
    jsonb_build_array(jsonb_build_object('tipo', 'columna_en', 'columna', 'fase_id', 'valores', u500, 'incluirNulo', false),
                      jsonb_build_object('tipo', 'en_vitrina', 'valor', false, 'fases', u500), jsonb_build_object('tipo', 'atributos_contienen', 'alternativas', '[{"color": "x"}]'::jsonb)),
    jsonb_build_array(jsonb_build_object('tipo', 'busqueda', 'texto', repeat('a', 1001))),
    jsonb_build_array(jsonb_build_object('tipo', 'atributo_rango_texto', 'clave', 'fecha', 'desde', null, 'antesDe', repeat('2', 1001))),
    jsonb_build_array(jsonb_build_object('tipo', 'atributos_contienen', 'alternativas', jsonb_build_array(jsonb_build_object('color', repeat('r', 988)))))];
  v_buenos jsonb[] := array[
    null, '[]', '[{"tipo": "columna_en", "columna": "categoria_id", "valores": [], "incluirNulo": true}]', '[{"tipo": "columna_rango", "columna": "anio", "min": 2000, "max": 2010}]',
    '[{"tipo": "atributos_contienen", "alternativas": [{"color": "rojo"}, {"usado": true}, {"extras": ["techo", "gps"]}]}]',
    '[{"tipo": "por_limpiar", "valor": false, "hasta": "2028-02-29"}, {"tipo": "atributo_rango_numero", "clave": "km", "min": null, "max": -3.25}]',
    jsonb_build_array(jsonb_build_object('tipo', 'columna_en', 'columna', 'fase_id', 'valores', u500, 'incluirNulo', false)),
    jsonb_build_array(jsonb_build_object('tipo', 'columna_en', 'columna', 'fase_id', 'valores', u500, 'incluirNulo', false), jsonb_build_object('tipo', 'en_vitrina', 'valor', false, 'fases', u500)),
    jsonb_build_array(jsonb_build_object('tipo', 'atributos_contienen', 'alternativas', a500)),
    jsonb_build_array(jsonb_build_object('tipo', 'busqueda', 'texto', repeat('a', 1000)), jsonb_build_object('tipo', 'atributo_texto', 'clave', 'color', 'texto', repeat('ñ', 1000))),
    jsonb_build_array(jsonb_build_object('tipo', 'atributos_contienen', 'alternativas', jsonb_build_array(jsonb_build_object('color', repeat('r', 987)))))];
  f jsonb; r text; i int := 0;
begin
  foreach f in array v_malos loop
    i := i + 1;
    r := pg_temp.vf_error(v_por_funcion, f);
    if r <> '22023/filtros' then raise exception 'L1c: el pedido malo % (%) por la función da % (debía 22023/filtros)', i, left(f::text, 80), r; end if;
    r := pg_temp.vf_error(v_por_armador, f);
    if r <> '22023/filtros' then raise exception 'L1c: el pedido malo % (%) por el armador da % (debía 22023/filtros)', i, left(f::text, 80), r; end if;
  end loop;
  i := 0;
  foreach f in array v_buenos loop
    i := i + 1;
    r := pg_temp.vf_error(v_por_funcion, f);
    if r <> 'ok' then raise exception 'L1c: el pedido bueno % (%) por la función da %', i, left(coalesce(f::text, 'nulo'), 80), r; end if;
    r := pg_temp.vf_error(v_por_armador, f);
    if r <> 'ok' then raise exception 'L1c: el pedido bueno % (%) por el armador da %', i, left(coalesce(f::text, 'nulo'), 80), r; end if;
  end loop;
  -- La forma: las rutas y el sentido fuera de su lista, y el armador de una condición llamado directo con lo que no es suyo.
  foreach r in array array[
    'select public._vehiculos_inventario_sql(''[]'', ''todos'', ''primera'')', 'select public._vehiculos_inventario_sql(''[]'', null, ''primera'')',
    'select public._vehiculos_inventario_sql(''[]'', ''origen'', ''ultima'')', 'select public._vehiculos_inventario_sql(''[]'', ''propios'', null)',
    'select public._vehiculos_inventario_condicion(''otro'', null, 0)', 'select public._vehiculos_inventario_condicion(null, null, 0)',
    'select public._vehiculos_inventario_condicion(''columna_en'', ''creado_por'', 0)', 'select public._vehiculos_inventario_condicion(''columna_rango'', ''precio'', 0)',
    'select public._vehiculos_inventario_condicion(''busqueda'', null, -1)', 'select public._vehiculos_inventario_condicion(''busqueda'', null, null)'] loop
    if pg_temp.vf_error(r) <> '22023/forma' then raise exception 'L1c: «%» da % (debía 22023/forma)', r, pg_temp.vf_error(r); end if;
  end loop;
  -- El cursor incompleto y el origen nulo.
  r := pg_temp.vf_error(format('select count(*) from public.vehiculos_inventario(%L, null, ''[]'', now(), null)', o));
  if r <> '22023/cursor' then raise exception 'L1c: el cursor sin id da %', r; end if;
  r := pg_temp.vf_error(format('select count(*) from public.vehiculos_inventario(%L, null, ''[]'', null, gen_random_uuid())', o));
  if r <> '22023/cursor' then raise exception 'L1c: el cursor sin instante da %', r; end if;
  r := pg_temp.vf_error('select count(*) from public.vehiculos_inventario(null)');
  if r <> '22023/origen' then raise exception 'L1c: el origen nulo da %', r; end if;
end $$;
rollback;

-- @test vehiculos_inventario: L3 los índices de las rutas: creado_por y lead_id con exactamente un índice de vehiculos al frente, entero; el compuesto del creador
begin;
do $$
declare k text; v_idx text[]; v_def text;
begin
  foreach k in array array['creado_por', 'lead_id'] loop
    select array_agg(c.relname::text order by c.relname) into v_idx from pg_index i join pg_class c on c.oid = i.indexrelid
     where i.indrelid = 'public.vehiculos'::regclass and i.indkey[0] = (select a.attnum from pg_attribute a where a.attrelid = 'public.vehiculos'::regclass and a.attname = k);
    if v_idx is distinct from array[case k when 'creado_por' then 'vehiculos_creador_idx' else 'vehiculos_lead_id_idx' end] then
      raise exception 'L3: % debía tener exactamente un índice al frente y tiene %', k, v_idx;
    end if;
    if exists (select 1 from pg_index i where i.indexrelid = to_regclass('public.' || v_idx[1]) and i.indpred is not null) then raise exception 'L3: % es parcial (tiene que cubrir la FK entera)', v_idx[1]; end if;
  end loop;
  v_def := pg_get_indexdef('public.vehiculos_creador_idx'::regclass);
  if v_def is distinct from 'CREATE INDEX vehiculos_creador_idx ON public.vehiculos USING btree (creado_por, origen_id, creado_en DESC, id DESC)' then raise exception 'L3: vehiculos_creador_idx es %', v_def; end if;
  if to_regclass('public.vehiculos_creado_por_idx') is not null or to_regclass('public.vehiculos_lead_idx') is not null then
    raise exception 'L3: siguen vehiculos_creado_por_idx o vehiculos_lead_idx (dos índices compiten en el plan)';
  end if;
end $$;
rollback;
