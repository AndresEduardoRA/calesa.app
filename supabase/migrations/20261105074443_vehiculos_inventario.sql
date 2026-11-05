-- El inventario por rutas, con los filtros del layout en SQL (paso 4.16-2a; lo usa la pantalla desde el 4.16-2b, que cierra 4-23): `vehiculos_inventario()`, invocadora
-- (la RLS de «vehiculos: leer» sigue decidiendo qué se ve), una página de un origen de lo más nuevo a lo más viejo (`creado_en desc, id desc`), por cursor (hacia atrás, en
-- orden ascendente), con los filtros de `Condicion[]` (src/modules/vehiculos/entities/filtros.ts) y, para cada fila, `limpieza_el` y la portada.
--
-- Por qué rutas: quien ve «propios» y casi nada es suyo recorría el origen entero filtrando con la policy (4-23: la «chica», 6.647 bloques con 250.000). Ramas de una función
-- `setof` bajo el `order by … limit` de PostgREST no sirven: en Postgres 17 una hoja de `union all` con `where` no se aplana, y con un `order by` y un join afuera cada hoja se
-- planea para leerse entera y ordena todo (las sondas S0 y S0' del 4.16-2, `docs/DECISIONES.md`). Aquí cada ruta lleva su `order by … limit` y Postgres sabe que lee una página:
--   - `origen` (R1): lo de un origen con «todos», o con «propios» y una cartera de más de 5.000 (`leads_cartera_corta()`): `vehiculos_origen_listado_idx`, como hoy;
--   - `propios`: lo que creó (R2, `vehiculos_creador_idx`) y lo de su cartera que crearon otros (R3, un lateral por lead de `mis_leads()` sobre `vehiculos_lead_id_idx`).
-- Los filtros van en SQL dinámico (un número variable de condiciones de atributos, un `and` de `or`, pedía una subconsulta por fila): el texto lo arma
-- `_vehiculos_inventario_sql()` y depende sólo de la forma del pedido (las rutas, el sentido, el `tipo` de cada condición y la `columna` de un `columna_en`, por listas
-- cerradas con salidas literales); ningún valor del pedido entra al texto: todos llegan como `$1 -> i` por `execute … using`. Los ayudantes son invocadores y los ejecuta
-- `authenticated`, porque los llama una invocadora (como `_diseno_*`): exponen el texto, no datos.
-- `limpieza_el` sale de la fila que leyó cada ruta, sin releerla (salvo las de la página que vienen de la cartera).
-- Lo mide `supabase/tests/medir-vehiculos-inventario.sql` (y `-forma.sql`); la equivalencia con PostgREST, `e2e/vehiculos-inventario-postgrest.spec.ts` y
-- `supabase/tests/vehiculos-inventario-filtros.sql`.

-- Un solo índice entero por columna que se sondea (4.16-1): `creado_por` y `lead_id`, cada uno con exactamente uno al frente, y entero porque cubre su FK (también la
-- papelera). `lead_ficha()` y `lead_vehiculos()` pasan a `vehiculos_lead_id_idx`, con las mismas filas.
drop index public.vehiculos_creado_por_idx;
drop index public.vehiculos_lead_idx;
create index vehiculos_creador_idx on public.vehiculos (creado_por, origen_id, creado_en desc, id desc);

-- El patrón «contiene» de la condición `p_i`: la expresión de `_lead_busqueda_patron()` (el `patronContiene()` de TS con el `*` de PostgREST), en el texto, sobre
-- `$1 -> p_i ->> 'texto'` (`_lead_busqueda_patron` es de service_role: la consulta corre como quien llama). El `\` primero; `ilike` escapa con `\`.
create function public._vehiculos_inventario_patron(p_i integer)
returns text
language sql stable security invoker
set search_path = ''
as $$
  select format($f$('%%' || replace(replace(replace(replace(($1 -> %s ->> 'texto'), '\', '\\'), '%%', '\%%'), '_', '\_'), '*', '_') || '%%')$f$, p_i)
$$;

-- El predicado de la condición `p_i` (ya validada), por un `case` de salidas literales: ni `p_tipo` ni `p_columna` llegan al texto. Fuera de las listas, `22023` con hint `forma`.
create function public._vehiculos_inventario_condicion(p_tipo text, p_columna text, p_i integer)
returns text
language plpgsql stable security invoker
set search_path = ''
as $$
declare
  c constant text := format('($1 -> %s)', p_i);
  v_col text;
  v_clave constant text := format('(%s ->> ''clave'')', c);
  v_fases constant text := format('array(select jsonb_array_elements_text(%s -> ''fases''))::uuid[]', c);
  v_hasta constant text := format('(%s ->> ''hasta'')::date', c);
begin
  if p_i is null or p_i < 0 then
    raise exception 'La forma del inventario no es válida.' using errcode = '22023', hint = 'forma';
  end if;
  v_col := case p_tipo when 'columna_en' then case p_columna when 'fase_id' then 'v.fase_id' when 'categoria_id' then 'v.categoria_id' end
                       when 'columna_rango' then case p_columna when 'anio' then 'v.anio' end end;
  if p_tipo in ('columna_en', 'columna_rango') and v_col is null then
    raise exception 'La forma del inventario no es válida.' using errcode = '22023', hint = 'forma';
  end if;
  case p_tipo
    when 'busqueda' then
      return format('(v.titulo ilike %1$s or v.vin ilike %1$s or v.lote ilike %1$s)', public._vehiculos_inventario_patron(p_i));
    when 'columna_en' then
      return format('((%1$s ->> ''incluirNulo'')::boolean and %2$s is null or %2$s = any (array(select jsonb_array_elements_text(%1$s -> ''valores''))::uuid[]))', c, v_col);
    when 'columna_rango' then
      return format('((%1$s ->> ''min'') is null or %2$s >= (%1$s ->> ''min'')::integer) and ((%1$s ->> ''max'') is null or %2$s <= (%1$s ->> ''max'')::integer)', c, v_col);
    when 'en_vitrina' then
      return format('(case when (%1$s ->> ''valor'')::boolean then v.publicado_web = true and v.fase_id = any (%2$s) '
        || 'else (cardinality(%2$s) = 0 or v.publicado_web is false or v.fase_id is null or not (v.fase_id = any (%2$s))) end)', c, v_fases);
    when 'por_limpiar' then
      return format('(case when (%1$s ->> ''valor'')::boolean then v.importado_apibara = true and public.limpieza_el(v) <= %2$s '
        || 'else (v.importado_apibara is false or public.limpieza_el(v) is null or public.limpieza_el(v) > %2$s) end)', c, v_hasta);
    when 'atributos_contienen' then
      return format('(jsonb_array_length(%1$s -> ''alternativas'') = 0 or v.atributos @> any (array(select jsonb_array_elements(%1$s -> ''alternativas''))))', c);
    when 'atributo_rango_numero' then
      return format('((%1$s ->> ''min'') is null or v.atributos -> %2$s >= %1$s -> ''min'') and ((%1$s ->> ''max'') is null or v.atributos -> %2$s <= %1$s -> ''max'')', c, v_clave);
    when 'atributo_rango_texto' then
      return format('((%1$s ->> ''desde'') is null or v.atributos ->> %2$s >= (%1$s ->> ''desde'')) and ((%1$s ->> ''antesDe'') is null or v.atributos ->> %2$s < (%1$s ->> ''antesDe''))', c, v_clave);
    when 'atributo_texto' then
      return format('(v.atributos ->> %s ilike %s)', v_clave, public._vehiculos_inventario_patron(p_i));
    else
      raise exception 'La forma del inventario no es válida.' using errcode = '22023', hint = 'forma';
  end case;
end $$;

-- Valida `Condicion[]` entero antes de armar (cualquier falla: `22023` con hint `filtros`). Los topes: a lo sumo 100 condiciones; 500 elementos por arreglo y 1.000 sumando todo
-- el pedido (hoy la URL de la página deja ≤ 442 uuids); 1.000 caracteres por texto (10 veces LARGO_MAXIMO_DE_TEXTO) y por alternativa.
create function public._vehiculos_inventario_validar(p_filtros jsonb)
returns void
language plpgsql stable security invoker
set search_path = ''
as $$
declare
  c jsonb; v_t text; v_ok boolean; v_total integer := 0; v_arr text;
  v_uuid constant text := '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$';
  v_clave constant text := '^[a-z][a-z0-9_]{1,40}$';
begin
  -- Un `or` o un `and` de SQL no fija el orden: lo que sólo vale tras comprobar el tipo va en un `case`.
  v_ok := case when jsonb_typeof(p_filtros) = 'array' then jsonb_array_length(p_filtros) <= 100 else false end;
  for c in select x from jsonb_array_elements(case when v_ok then p_filtros else '[]' end) x loop
    exit when not v_ok;
    v_t := case when jsonb_typeof(c) = 'object' then c ->> 'tipo' end;
    v_ok := case v_t
      when 'busqueda' then jsonb_typeof(c -> 'texto') = 'string'
      when 'columna_en' then c ->> 'columna' in ('fase_id', 'categoria_id') and jsonb_typeof(c -> 'valores') = 'array' and jsonb_typeof(c -> 'incluirNulo') = 'boolean'
      when 'columna_rango' then c ->> 'columna' = 'anio' and jsonb_typeof(coalesce(c -> 'min', 'null')) in ('number', 'null') and jsonb_typeof(coalesce(c -> 'max', 'null')) in ('number', 'null')
      when 'en_vitrina' then jsonb_typeof(c -> 'valor') = 'boolean' and jsonb_typeof(c -> 'fases') = 'array'
      when 'por_limpiar' then jsonb_typeof(c -> 'valor') = 'boolean' and jsonb_typeof(c -> 'hasta') = 'string' and c ->> 'hasta' ~ '^\d{4}-\d{2}-\d{2}$'
      when 'atributos_contienen' then jsonb_typeof(c -> 'alternativas') = 'array'
      when 'atributo_rango_numero' then c ->> 'clave' ~ v_clave and jsonb_typeof(c -> 'clave') = 'string'
        and jsonb_typeof(coalesce(c -> 'min', 'null')) in ('number', 'null') and jsonb_typeof(coalesce(c -> 'max', 'null')) in ('number', 'null')
      when 'atributo_rango_texto' then c ->> 'clave' ~ v_clave and jsonb_typeof(c -> 'clave') = 'string'
        and jsonb_typeof(coalesce(c -> 'desde', 'null')) in ('string', 'null') and jsonb_typeof(coalesce(c -> 'antesDe', 'null')) in ('string', 'null')
      when 'atributo_texto' then c ->> 'clave' ~ v_clave and jsonb_typeof(c -> 'clave') = 'string' and jsonb_typeof(c -> 'texto') = 'string'
      else false end;
    exit when not coalesce(v_ok, false);
    -- Los textos (≤ 1.000 caracteres), el año (un entero de smallint) y la fecha (un día que existe).
    v_ok := (select coalesce(bool_and(length(c ->> k) <= 1000), true) from unnest(array['texto', 'desde', 'antesDe']) k where jsonb_typeof(c -> k) = 'string');
    if v_ok and v_t = 'columna_rango' then
      -- Entero también en su forma (`2010.0` no lo es: `::integer` caería con 22P02 al leer una fila).
      v_ok := (select coalesce(bool_and(case when (c ->> k) ~ '^-?[0-9]{1,5}$' then abs((c ->> k)::integer) <= 32767 else false end), true)
                 from unnest(array['min', 'max']) k where jsonb_typeof(c -> k) = 'number');
    end if;
    if v_ok and v_t = 'por_limpiar' then
      v_ok := to_char(to_date(c ->> 'hasta', 'YYYY-MM-DD'), 'YYYY-MM-DD') = c ->> 'hasta';
    end if;
    -- Los arreglos: a lo sumo 500 elementos; los ids, uuids; cada alternativa, un objeto de una clave del layout cuyo valor es texto, booleano o lista de textos.
    v_arr := case v_t when 'columna_en' then 'valores' when 'en_vitrina' then 'fases' when 'atributos_contienen' then 'alternativas' end;
    if v_ok and v_arr is not null then
      v_ok := jsonb_array_length(c -> v_arr) <= 500;
      v_total := v_total + jsonb_array_length(c -> v_arr);
      if v_ok and v_arr = 'alternativas' then
        -- Una sola clave: sin la menor, el objeto queda vacío.
        v_ok := (select coalesce(bool_and(case when jsonb_typeof(a) = 'object' and a <> '{}' and length(a::text) <= 1000
                   then a - (select min(k) from jsonb_object_keys(a) k) = '{}'
                        and (select bool_and(k ~ v_clave and case jsonb_typeof(w) when 'string' then true when 'boolean' then true
                               when 'array' then (select coalesce(bool_and(jsonb_typeof(z) = 'string'), true) from jsonb_array_elements(w) z) else false end)
                               from jsonb_each(a) e (k, w))
                   else false end), true)
                   from jsonb_array_elements(c -> v_arr) a);
      elsif v_ok then
        v_ok := (select coalesce(bool_and(jsonb_typeof(u) = 'string' and u #>> '{}' ~ v_uuid), true) from jsonb_array_elements(c -> v_arr) u);
      end if;
    end if;
    exit when not v_ok;
  end loop;
  if not coalesce(v_ok, false) or v_total > 1000 then
    raise exception 'Los filtros del inventario no son válidos.' using errcode = '22023', hint = 'filtros';
  end if;
exception when invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
  raise exception 'Los filtros del inventario no son válidos.' using errcode = '22023', hint = 'filtros';
end $$;

-- El texto de la consulta: las rutas (`origen` | `propios`), el sentido (`primera` | `siguiente` | `anterior`) y los predicados de `p_filtros`. Depende sólo de la forma: dos
-- pedidos con la misma forma y valores distintos dan el mismo texto. Los parámetros: $1 los filtros, $2 el origen, $3 n + 1, $4 quien mira, $5 y $6 el cursor.
create function public._vehiculos_inventario_sql(p_filtros jsonb, p_rutas text, p_sentido text)
returns text
language plpgsql stable security invoker
set search_path = ''
as $$
declare
  v_cols constant text := 'v.id, v.numero, v.origen_id, v.titulo, v.marca, v.modelo, v.anio, v.vin, v.lote, v.plataforma, v.url_origen, v.precio, v.precio_negociable, '
    || 'v.acepta_permuta, v.placado, v.kilometraje, v.categoria_id, v.fase_id, v.atributos, v.lead_id, v.publicado_web, v.destacado_web, v.precio_web, v.precio_web_hasta, '
    || 'v.precio_web_nota, v.creado_por, v.creado_en, v.actualizado_en';
  v_f jsonb := coalesce(p_filtros, '[]'::jsonb);
  v_d text; v_cursor text; v_pred text := ''; v_rutas text;
begin
  if p_rutas is null or p_rutas not in ('origen', 'propios') or p_sentido is null or p_sentido not in ('primera', 'siguiente', 'anterior') then
    raise exception 'La forma del inventario no es válida.' using errcode = '22023', hint = 'forma';
  end if;
  perform public._vehiculos_inventario_validar(v_f);
  for i in 0 .. jsonb_array_length(v_f) - 1 loop
    v_pred := v_pred || ' and ' || public._vehiculos_inventario_condicion(v_f -> i ->> 'tipo', v_f -> i ->> 'columna', i);
  end loop;
  v_d := case p_sentido when 'anterior' then 'asc' else 'desc' end;
  v_cursor := case p_sentido when 'siguiente' then ' and (v.creado_en, v.id) < ($5, $6)' when 'anterior' then ' and (v.creado_en, v.id) > ($5, $6)' else '' end;
  if p_rutas = 'origen' then
    -- R1: vehiculos_origen_listado_idx.
    v_rutas := format('(select %s, public.limpieza_el(v) as limpieza_el, false as releer from public.vehiculos v where v.origen_id = $2 and v.eliminado_en is null%s%s '
      || 'order by v.creado_en %s, v.id %s limit $3)', v_cols, v_cursor, v_pred, v_d, v_d);
  else
    -- R2: lo que creó quien mira, vehiculos_creador_idx. R3: su cartera que crearon otros (o nadie: `creado_por` admite nulo), un lateral por lead sobre vehiculos_lead_id_idx.
    v_rutas := format('(select %1$s, public.limpieza_el(v) as limpieza_el, false as releer from public.vehiculos v where v.creado_por = $4 and v.origen_id = $2 '
      || 'and v.eliminado_en is null%2$s%3$s order by v.creado_en %4$s, v.id %4$s limit $3) '
      || 'union all (select x.* from public.mis_leads() m (lead_id) cross join lateral (select %1$s, null::date as limpieza_el, true as releer from public.vehiculos v '
      || 'where v.lead_id = m.lead_id and v.origen_id = $2 '
      || 'and v.creado_por is distinct from $4 and v.eliminado_en is null%2$s%3$s order by v.creado_en %4$s, v.id %4$s limit $3) x)', v_cols, v_cursor, v_pred, v_d);
  end if;
  -- `limpieza_el` se calcula sobre la fila que la ruta ya leyó bajo la RLS: releerla por id paga otra pasada de la policy (sus InitPlans y un en_cartera por fila; Beto
  -- 10,3 → 8,6 ms, S0'' del 4.16-2a). R1 y R2 cortan en n + 1 antes de proyectar; R3 emite lo de toda la cartera, así que relee sólo las filas de la página, con una
  -- subconsulta escalar dentro de un `case` (sólo se evalúa si `releer`; una lateral con `where f.releer` relee igual). La portada, sólo para la página.
  return format('select %3$s, case when f.releer then (select public.limpieza_el(w) from public.vehiculos w where w.id = f.id) else f.limpieza_el end, p.ruta_miniatura '
    || 'from (select * from (%1$s) u order by u.creado_en %2$s, u.id %2$s limit $3) f '
    || 'left join lateral (select i.ruta_miniatura from public.vehiculos_imagenes i where i.vehiculo_id = f.id and i.es_portada limit 1) p on true '
    || 'order by f.creado_en %2$s, f.id %2$s', v_rutas, v_d, replace(v_cols, 'v.', 'f.'));
end $$;

create function public.vehiculos_inventario(
  p_origen uuid, p_tamano integer default null, p_filtros jsonb default '[]', p_cursor_en timestamptz default null, p_cursor_id uuid default null,
  p_hacia_atras boolean default false)
returns table (id uuid, numero bigint, origen_id uuid, titulo text, marca text, modelo text, anio smallint, vin text, lote text, plataforma text, url_origen text,
               precio numeric(18,2), precio_negociable boolean, acepta_permuta boolean, placado boolean, kilometraje integer, categoria_id uuid, fase_id uuid, atributos jsonb,
               lead_id uuid, publicado_web boolean, destacado_web boolean, precio_web numeric(18,2), precio_web_hasta numeric(18,2), precio_web_nota text, creado_por uuid,
               creado_en timestamptz, actualizado_en timestamptz, limpieza_el date, portada_ruta text)
language plpgsql stable security invoker
set search_path = ''
as $$
declare
  -- MAXIMO_DE_PAGINA_DE_VEHICULOS (src/modules/vehiculos/entities/vehiculo.ts), más una para saber si hay otra.
  v_n integer := public._acotar_pagina(p_tamano, 100, 100) + 1;
  v_uid uuid := (select auth.uid());
  v_filtros jsonb := coalesce(p_filtros, '[]'::jsonb);
  v_rutas text; v_sentido text; v_sql text;
begin
  if p_origen is null then
    raise exception 'Falta el origen del inventario.' using errcode = '22023', hint = 'origen';
  end if;
  if (p_cursor_en is null) <> (p_cursor_id is null) then
    raise exception 'El cursor del inventario está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  v_sentido := case when p_cursor_en is null then 'primera' when p_hacia_atras then 'anterior' else 'siguiente' end;
  if p_origen = any (public.origenes_con_alcance('vehiculos.ver', 'todos')) then
    v_rutas := 'origen';
  elsif p_origen = any (public.origenes_con_alcance('vehiculos.ver', 'propios')) then
    -- Con más de 5.000 leads en la cartera, lo de hoy: el origen, y la RLS pregunta en_cartera() por fila.
    v_rutas := case when public.leads_cartera_corta() then 'propios' else 'origen' end;
  end if;
  -- Los filtros se validan también sin ruta: un pedido que no vale falla igual para todos.
  v_sql := public._vehiculos_inventario_sql(v_filtros, coalesce(v_rutas, 'origen'), v_sentido);
  if v_rutas is null then
    return;
  end if;
  return query execute v_sql using v_filtros, p_origen, v_n, v_uid, p_cursor_en, p_cursor_id;
end $$;

revoke all on function public._vehiculos_inventario_patron(integer) from public, anon;
grant execute on function public._vehiculos_inventario_patron(integer) to authenticated;
revoke all on function public._vehiculos_inventario_condicion(text, text, integer) from public, anon;
grant execute on function public._vehiculos_inventario_condicion(text, text, integer) to authenticated;
revoke all on function public._vehiculos_inventario_validar(jsonb) from public, anon;
grant execute on function public._vehiculos_inventario_validar(jsonb) to authenticated;
revoke all on function public._vehiculos_inventario_sql(jsonb, text, text) from public, anon;
grant execute on function public._vehiculos_inventario_sql(jsonb, text, text) to authenticated;
revoke all on function public.vehiculos_inventario(uuid, integer, jsonb, timestamptz, uuid, boolean) from public, anon;
grant execute on function public.vehiculos_inventario(uuid, integer, jsonb, timestamptz, uuid, boolean) to authenticated;
comment on function public._vehiculos_inventario_patron(integer) is 'El patrón «contiene» de la condición i del inventario, como texto de la consulta: la expresión de _lead_busqueda_patron() sobre $1 -> i ->> ''texto''. Invocadora; la llama _vehiculos_inventario_condicion().';
comment on function public._vehiculos_inventario_condicion(text, text, integer) is 'El predicado de una condición del inventario (ya validada), por un case de salidas literales: ni el tipo ni la columna llegan al texto, y los valores van como $1 -> i. Invocadora; la llama _vehiculos_inventario_sql().';
comment on function public._vehiculos_inventario_validar(jsonb) is 'Valida los filtros del inventario (Condicion[] de src/modules/vehiculos/entities/filtros.ts) con sus topes; cualquier falla, 22023 con hint filtros. Invocadora; la llama _vehiculos_inventario_sql().';
comment on function public._vehiculos_inventario_sql(jsonb, text, text) is 'El texto de la consulta de vehiculos_inventario(): las rutas, el sentido y los predicados; depende sólo de la forma del pedido y ningún valor entra al texto. Invocadora; no lee tablas.';
comment on function public.vehiculos_inventario(uuid, integer, jsonb, timestamptz, uuid, boolean) is 'Una página del inventario de un origen, de lo más nuevo a lo más viejo (creado_en desc, id desc), por cursor (hacia atrás, en orden ascendente), con los filtros del layout (Condicion[]) y, por fila, limpieza_el y la portada. Corre como quien la llama: la RLS decide qué se ve; cada ruta (el origen, lo creado, la cartera de mis_leads()) va por su índice con su propio limit. Lo mide supabase/tests/medir-vehiculos-inventario.sql.';
