-- `vehiculos_inventario()` (paso 4.16-2a), los filtros (L5): para cada caso de `Condicion[]`, todas las páginas de la función dan lo mismo que una referencia escrita con
-- la forma en que PostgREST traduce hoy `aplicarCondiciones()` (src/modules/vehiculos/infra/queries/condiciones.ts y src/shared/lib/supabase/consultas.ts): `in`,
-- `is.null`, `or(...)`, `eq`, `cs`, `->` y `->>` con `gte`, `lte`, `lt` e `ilike` sobre el patrón de `patronContiene()` (con el `*` → `%` de PostgREST), cada valor como
-- literal. Como la dueña (R1), como P (R2 y R3) y como P con el umbral de la cartera en 0 (R1 con «propios»). La referencia la ata al PostgREST real
-- `e2e/vehiculos-inventario-postgrest.spec.ts`. Corre antes de `vehiculos-visibilidad.sql`; la dueña es `…0001`. El bloque abre su transacción y la revierte; sus
-- ayudantes `pg_temp.vl_*` nacen dentro. Los teléfonos son fijos (`7271xxxx`, libres) y los uuids, `…0e8x`. Compara ids.

-- @test vehiculos_inventario: L5 cada filtro, sus bordes y tres combinaciones dan lo mismo que la forma de PostgREST, por las tres rutas, y cada caso discrimina
begin;
-- Sin `humo.sql` (con SOLO=…), la dueña nace aquí: la primera cuenta es la dueña.
insert into auth.users (id, email) select '00000000-0000-0000-0000-000000000001', 'duena@ejemplo.com' where not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000001');
-- El predicado de una condición con la forma de PostgREST (la de `aplicarUna()`): sólo los bordes que hay, y los valores como literales.
create function pg_temp.vl_ref(c jsonb) returns text language plpgsql as $f$
declare
  v_col text := case c ->> 'columna' when 'fase_id' then 'v.fase_id' when 'categoria_id' then 'v.categoria_id' when 'anio' then 'v.anio' end;
  v_arr text; v_pat text; v_attr text := format('v.atributos -> %L', c ->> 'clave'); v_txt text := format('v.atributos ->> %L', c ->> 'clave'); v_alt text[];
begin
  -- patronContiene(): `\`, `%` y `_` escapados, `*` → `_`, y entre `*` (que PostgREST vuelve `%`).
  v_pat := quote_literal('%' || replace(regexp_replace(c ->> 'texto', '([\\%_])', '\\\1', 'g'), '*', '_') || '%');
  v_arr := quote_literal(coalesce((select array_agg(x)::text from jsonb_array_elements_text(coalesce(c -> 'valores', c -> 'fases')) x), '{}')) || '::uuid[]';
  case c ->> 'tipo'
    when 'busqueda' then return format('(v.titulo ilike %1$s or v.vin ilike %1$s or v.lote ilike %1$s)', v_pat);
    when 'columna_en' then
      -- `in` / `is.null` / `or(is.null,in.(…))`
      if not (c ->> 'incluirNulo')::boolean then return format('%s = any (%s)', v_col, v_arr); end if;
      if jsonb_array_length(c -> 'valores') = 0 then return v_col || ' is null'; end if;
      return format('(%1$s is null or %1$s = any (%2$s))', v_col, v_arr);
    when 'columna_rango' then
      return concat_ws(' and ', 'true', case when c ->> 'min' is not null then format('%s >= %L', v_col, c ->> 'min') end, case when c ->> 'max' is not null then format('%s <= %L', v_col, c ->> 'max') end);
    when 'en_vitrina' then
      -- `eq.true` + `in` / nada / `or(publicado_web.is.false,fase_id.is.null,fase_id.not.in.(…))`
      if (c ->> 'valor')::boolean then return format('v.publicado_web = true and v.fase_id = any (%s)', v_arr); end if;
      if jsonb_array_length(c -> 'fases') = 0 then return 'true'; end if;
      return format('(v.publicado_web is false or v.fase_id is null or not (v.fase_id = any (%s)))', v_arr);
    when 'por_limpiar' then
      -- `eq.true` + `lte` / `or(importado_apibara.is.false,limpieza_el.is.null,limpieza_el.gt.…)`; limpieza_el es la columna calculada.
      if (c ->> 'valor')::boolean then return format('v.importado_apibara = true and public.limpieza_el(v) <= %L', c ->> 'hasta'); end if;
      return format('(v.importado_apibara is false or public.limpieza_el(v) is null or public.limpieza_el(v) > %L)', c ->> 'hasta');
    when 'atributos_contienen' then
      -- nada / `cs` / `or(atributos.cs.…,…)`
      select array_agg(format('v.atributos @> %L', a)) into v_alt from jsonb_array_elements(c -> 'alternativas') a;
      return coalesce('(' || array_to_string(v_alt, ' or ') || ')', 'true');
    when 'atributo_rango_numero' then
      return concat_ws(' and ', 'true', case when c ->> 'min' is not null then format('%s >= %L', v_attr, c ->> 'min') end, case when c ->> 'max' is not null then format('%s <= %L', v_attr, c ->> 'max') end);
    when 'atributo_rango_texto' then
      return concat_ws(' and ', 'true', case when c ->> 'desde' is not null then format('%s >= %L', v_txt, c ->> 'desde') end, case when c ->> 'antesDe' is not null then format('%s < %L', v_txt, c ->> 'antesDe') end);
    when 'atributo_texto' then return format('%s ilike %s', v_txt, v_pat);
  end case;
end $f$;
-- La referencia como esa persona: el origen, las condiciones con `and` y el orden del inventario.
create function pg_temp.vl_referencia(p_quien uuid, p_origen uuid, p_filtros jsonb) returns uuid[] language plpgsql as $f$
declare v uuid[]; v_sql text := 'select coalesce(array_agg(v.id order by v.creado_en desc, v.id desc), ''{}'') from public.vehiculos v where v.origen_id = $1';
begin
  select v_sql || coalesce(string_agg(' and ' || pg_temp.vl_ref(c), '' order by k), '') into v_sql from jsonb_array_elements(p_filtros) with ordinality x (c, k);
  perform set_config('request.jwt.claim.sub', p_quien::text, true), set_config('request.jwt.claim.role', 'authenticated', true),
          set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute v_sql into v using p_origen;
  reset role;
  return v;
exception when others then
  reset role;
  raise;
end $f$;
-- Todas las páginas de la función (de a 3) como esa persona, de la más nueva a la más vieja; falla si una fila sale dos veces o el orden no es estricto.
create function pg_temp.vl_recorrer(p_quien uuid, p_origen uuid, p_filtros jsonb) returns uuid[] language plpgsql as $f$
declare v_ids uuid[] := '{}'; v_en timestamptz; v_id uuid; r record; v_n int;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true), set_config('request.jwt.claim.role', 'authenticated', true),
          set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  loop
    v_n := 0;
    set local role authenticated;
    for r in select x.id, x.creado_en from public.vehiculos_inventario(p_origen, 3, p_filtros, v_en, v_id) x loop
      v_n := v_n + 1;
      exit when v_n > 3;
      if r.id = any (v_ids) or (v_en is not null and (r.creado_en, r.id) >= (v_en, v_id)) then raise exception 'el inventario repite % o sale de orden', r.id; end if;
      v_ids := v_ids || r.id; v_en := r.creado_en; v_id := r.id;
    end loop;
    reset role;
    exit when v_n <= 3;
  end loop;
  return v_ids;
exception when others then
  reset role;
  raise;
end $f$;
do $$
declare
  d constant uuid := '00000000-0000-0000-0000-000000000001'; p constant uuid := '00000000-0000-0000-0000-000000000e81';
  o uuid; v_flujo uuid; f_pub uuid; f_otra uuid; c1 uuid; c2 uuid; l1 uuid; l2 uuid; v_rol uuid; v_hasta date; v_todos uuid[];
  v_casos jsonb[]; v_caso jsonb; v_quien uuid; v_ref uuid[]; v_fn uuid[]; v_ruta text;
begin
  if exists (select 1 from public.leads where telefono_principal like '7271%' and eliminado_en is null) then raise exception 'ya hay leads vivos con 7271…: los teléfonos chocarían'; end if;
  update public.ajustes_empresa set limpieza_automatica = true, limpieza_dias_gracia = 7 where id = 1;
  v_hasta := (now() at time zone (select zona_horaria from public.ajustes_empresa where id = 1))::date + 2;
  -- Un origen de subasta (la limpieza sólo aplica ahí), con una fase que publica y otra que no, y dos categorías.
  insert into public.origenes (clave, nombre, tipo) values ('vl_s', 'VL subasta', 'subasta') returning id into o;
  select id into v_flujo from public.flujos where origen_id = o;
  insert into public.fases (flujo_id, nombre, publica_web, es_inicial) values (v_flujo, 'VL publica', true, true) returning id into f_pub;
  insert into public.fases (flujo_id, nombre) values (v_flujo, 'VL otra') returning id into f_otra;
  insert into public.categorias (origen_id, nombre) values (o, 'VL c1') returning id into c1;
  insert into public.categorias (origen_id, nombre) values (o, 'VL c2') returning id into c2;
  -- P ve «propios»: lo que creó (R2) y lo de sus dos leads (R3).
  insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('vl_0000e81', 'VL 0000e81') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'vehiculos.ver', null, 'propios'), (v_rol, 'leads.ver', null, 'propios');
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values ('VL lead 1', '72710001', p, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l1;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values ('VL lead 2', '72710002', p, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l2;
  -- Los bordes (como los del e2e): nulos en fase, categoría, año, VIN y lote; textos con `%`, `_`, `*`, `\`, `"`, `,`, `()`, tildes, `ñ` y mayúsculas; atributos número,
  -- texto que parece número, booleano, arreglo y ausente; publicados en una fase que publica, en otra y sin fase; una fecha igual al `antesDe`; importados con limpieza
  -- vencida, en gracia y anclados. `q`: quién lo creó (d, p) y de qué lead (1, 2).
  insert into public.vehiculos (origen_id, titulo, vin, lote, anio, fase_id, categoria_id, publicado_web, atributos, importado_apibara, subasta_en, estado_subasta,
                                creado_por, lead_id, creado_en)
  select o, x.t, x.vin, x.lote, x.anio, case x.f when 'p' then f_pub when 'o' then f_otra end, case x.c when 1 then c1 when 2 then c2 end, x.pub, x.a::jsonb,
         x.sub is not null, now() - x.sub * interval '1 day', case when x.sub is not null then 'terminada'::public.estado_subasta end,
         case when x.q like 'p%' then p else d end, case when x.q like '%1' then l1 when x.q like '%2' then l2 end,
         timestamptz '2026-06-01 12:00:00+00' + (x.k / 3) * interval '1 minute'
    from (values
      (1, 'Toyota ABC grande', '5YJSA1E26MF000001', 'LOTE-77', 2015, 'p', 1, true, '{"color": "Rojo", "km": 10, "usado": true}', null::int, 'd'),
      (2, 'Rebaja 50% hoy', null, null, null, null, null, false, '{"color": "rojo", "km": 9}', 30, 'd'),
      (3, 'Rebaja 500 mañana', '2T1BURHE0JC000002', 'L-500', 2001, 'o', 2, true, '{"color": "azul", "km": 100}', 30, 'd'),
      (4, 'a_b exacto', null, 'a_b', 2010, 'p', 1, false, '{"color": "verde", "km": "10"}', 2, 'p'),
      (5, 'axb parecido', null, 'axb', 2011, null, 2, true, '{"extras": ["techo", "gps"], "km": 50.5}', null, 'p'),
      (6, 'x*y con asterisco', null, null, 1999, 'o', null, false, '{"extras": ["gps"], "usado": false}', 30, 'p1'),
      (7, 'xzy sin asterisco', null, null, 2020, 'p', 1, true, '{"fecha": "2026-03-10", "color": "50% rojo"}', null, 'd1'),
      (8, 'barra \ invertida', null, 'B\1', null, null, null, false, '{"fecha": "2026-03-01", "color": "ro_jo"}', 30, 'd2'),
      (9, 'comillas "dobles", y (paréntesis)', null, null, 2005, 'o', 2, false, '{"fecha": "2026-03-09T23:59", "km": true}', null, 'd'),
      (10, 'Ñandú CAMIÓN', null, 'ñ-1', 2018, 'p', null, true, '{"fecha": "2026-02-28", "km": [1]}', 2, 'p2'),
      (11, 'sin nada', null, null, null, null, null, false, '{}', null, 'd'),
      (12, 'Importado vencido', null, null, 2012, null, 1, false, '{"color": "Azul"}', 30, 'p'),
      (13, 'Importado en gracia', null, null, 2013, null, 2, false, '{"km": 10}', 2, 'd'),
      (14, 'Importado publicado', null, null, 2014, 'p', 1, true, '{}', 30, 'd'),
      (15, 'Toyota abc chica', null, 'abc-9', 2016, 'o', 1, false, '{"color": "ROJO", "extras": []}', null, 'p1'),
      (16, 'Rebaja 50% también', null, null, 2017, null, 2, true, '{"km": 10.0}', null, 'd1')
    ) x (k, t, vin, lote, anio, f, c, pub, a, sub, q);
  v_todos := pg_temp.vl_referencia(d, o, '[]');
  v_casos := array[
    '[]',
    '[{"tipo": "busqueda", "texto": "abc"}]', '[{"tipo": "busqueda", "texto": "50%"}]', '[{"tipo": "busqueda", "texto": "a_b"}]', '[{"tipo": "busqueda", "texto": "x*y"}]',
    '[{"tipo": "busqueda", "texto": "\\"}]', '[{"tipo": "busqueda", "texto": "lote-77"}]', '[{"tipo": "busqueda", "texto": "a1e26"}]', '[{"tipo": "busqueda", "texto": "\"dobles\", y ("}]',
    '[{"tipo": "busqueda", "texto": "ndú cam"}]',
    jsonb_build_array(jsonb_build_object('tipo', 'columna_en', 'columna', 'fase_id', 'valores', jsonb_build_array(f_pub), 'incluirNulo', false)),
    '[{"tipo": "columna_en", "columna": "fase_id", "valores": [], "incluirNulo": true}]',
    jsonb_build_array(jsonb_build_object('tipo', 'columna_en', 'columna', 'fase_id', 'valores', jsonb_build_array(f_otra, f_pub), 'incluirNulo', true), jsonb_build_object('tipo', 'busqueda', 'texto', 'rebaja')),
    jsonb_build_array(jsonb_build_object('tipo', 'columna_en', 'columna', 'categoria_id', 'valores', jsonb_build_array(c2), 'incluirNulo', false)),
    jsonb_build_array(jsonb_build_object('tipo', 'columna_en', 'columna', 'categoria_id', 'valores', jsonb_build_array(c1), 'incluirNulo', true)),
    '[{"tipo": "columna_rango", "columna": "anio", "min": 2011, "max": null}]', '[{"tipo": "columna_rango", "columna": "anio", "min": null, "max": 2010}]',
    '[{"tipo": "columna_rango", "columna": "anio", "min": 2005, "max": 2015}]',
    jsonb_build_array(jsonb_build_object('tipo', 'en_vitrina', 'valor', true, 'fases', jsonb_build_array(f_pub))),
    jsonb_build_array(jsonb_build_object('tipo', 'en_vitrina', 'valor', false, 'fases', jsonb_build_array(f_pub))),
    '[{"tipo": "en_vitrina", "valor": false, "fases": []}, {"tipo": "busqueda", "texto": "toyota"}]',
    jsonb_build_array(jsonb_build_object('tipo', 'por_limpiar', 'valor', true, 'hasta', v_hasta)), jsonb_build_array(jsonb_build_object('tipo', 'por_limpiar', 'valor', false, 'hasta', v_hasta)),
    '[{"tipo": "atributos_contienen", "alternativas": [{"color": "rojo"}]}]', '[{"tipo": "atributos_contienen", "alternativas": [{"color": "rojo"}, {"color": "azul"}]}]',
    '[{"tipo": "atributos_contienen", "alternativas": [{"extras": ["gps"]}]}]', '[{"tipo": "atributos_contienen", "alternativas": [{"usado": true}]}]',
    '[{"tipo": "atributos_contienen", "alternativas": []}, {"tipo": "busqueda", "texto": "rebaja"}]',
    '[{"tipo": "atributo_rango_numero", "clave": "km", "min": 10, "max": null}]', '[{"tipo": "atributo_rango_numero", "clave": "km", "min": null, "max": 10}]',
    '[{"tipo": "atributo_rango_numero", "clave": "km", "min": 9.5, "max": 50.5}]',
    '[{"tipo": "atributo_rango_texto", "clave": "fecha", "desde": "2026-03-01", "antesDe": "2026-03-10"}]', '[{"tipo": "atributo_rango_texto", "clave": "fecha", "desde": null, "antesDe": "2026-03-01"}]',
    '[{"tipo": "atributo_rango_texto", "clave": "fecha", "desde": "2026-03-09", "antesDe": null}]',
    '[{"tipo": "atributo_texto", "clave": "color", "texto": "RO"}]', '[{"tipo": "atributo_texto", "clave": "color", "texto": "o_j"}]', '[{"tipo": "atributo_texto", "clave": "color", "texto": "50%"}]',
    -- Tres combinaciones.
    jsonb_build_array(jsonb_build_object('tipo', 'busqueda', 'texto', 'rebaja'), jsonb_build_object('tipo', 'columna_rango', 'columna', 'anio', 'min', 2000, 'max', null),
                      jsonb_build_object('tipo', 'atributos_contienen', 'alternativas', '[{"color": "azul"}, {"usado": true}]'::jsonb)),
    jsonb_build_array(jsonb_build_object('tipo', 'columna_en', 'columna', 'categoria_id', 'valores', jsonb_build_array(c1, c2), 'incluirNulo', false),
                      jsonb_build_object('tipo', 'en_vitrina', 'valor', false, 'fases', jsonb_build_array(f_pub)), jsonb_build_object('tipo', 'atributo_rango_numero', 'clave', 'km', 'min', 10, 'max', null)),
    jsonb_build_array(jsonb_build_object('tipo', 'por_limpiar', 'valor', false, 'hasta', v_hasta), jsonb_build_object('tipo', 'atributo_texto', 'clave', 'color', 'texto', 'rojo'),
                      jsonb_build_object('tipo', 'columna_en', 'columna', 'fase_id', 'valores', jsonb_build_array(f_pub), 'incluirNulo', true))];
  -- El terreno muerde: la limpieza tiene fechas a los dos lados de `hasta`.
  if not exists (select 1 from public.vehiculos v where v.origen_id = o and public.limpieza_el(v) <= v_hasta) or not exists (select 1 from public.vehiculos v where v.origen_id = o and public.limpieza_el(v) > v_hasta) then
    raise exception 'L5: el terreno no tiene limpieza a los dos lados de %', v_hasta;
  end if;
  foreach v_ruta in array array['la dueña (R1)', 'P (R2 y R3)', 'P con el umbral en 0 (R1)'] loop
    if v_ruta like '%umbral%' then
      create or replace function public._leads_cartera_corta_tope() returns integer language sql immutable parallel safe set search_path = '' as $c$ select 0 $c$;
    end if;
    v_quien := case when v_ruta like 'la dueña%' then d else p end;
    foreach v_caso in array v_casos loop
      v_ref := pg_temp.vl_referencia(v_quien, o, v_caso);
      v_fn := pg_temp.vl_recorrer(v_quien, o, v_caso);
      if v_fn is distinct from v_ref then
        raise exception 'L5: % con % recibe % y la forma de PostgREST da %', v_ruta, v_caso,
          (select array_agg(v.titulo order by k) from unnest(v_fn) with ordinality u (x, k) join public.vehiculos v on v.id = x),
          (select array_agg(v.titulo order by k) from unnest(v_ref) with ordinality u (x, k) join public.vehiculos v on v.id = x);
      end if;
      -- Cada caso (salvo el de sin filtros) discrimina para la dueña: ni vacío ni todo.
      if v_quien = d and v_caso <> '[]' and (cardinality(v_ref) = 0 or v_ref = v_todos) then raise exception 'L5: % no discrimina (da %)', v_caso, cardinality(v_ref); end if;
    end loop;
    -- La ruta de P sí lee distinto que la dueña (no es el origen entero).
    if v_quien = p and pg_temp.vl_referencia(p, o, '[]') = v_todos then raise exception 'L5: P ve todo el origen: su ruta no se distingue'; end if;
  end loop;
end $$;
rollback;
