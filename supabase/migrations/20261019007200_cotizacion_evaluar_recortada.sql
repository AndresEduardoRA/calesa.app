-- `cotizacion_evaluar()` devuelve sólo lo que quien llama ve, y se abre a `authenticated` (paso 4.10, prompt 1; D7: «la hoja calcula en la base para todos»).
--
-- Desde el 4.06 calculaba la fórmula entera y por eso nadie la ejecutaba. Ahora:
--   - Recorta el resultado con `_cotizacion_recorte()` y los nodos de `_nodos_visibles(formula_id)`: el total y lo aparte siempre, y los subtotales de un grupo si se ve entero.
--   - No sirve de oráculo. Lo que la persona tipea sólo puede nombrar nodos que ve: un `input` o una `bandera` que no ve (o que la fórmula no tiene) da el MISMO error que uno que no existe
--     (`entrada_invalida`, mismo texto y mismo `donde`, y en el mismo orden que el motor: primero la forma de la entrada y del modo, después los inputs y después las banderas), y un
--     override de un nodo que no ve se descarta como `nodo_inexistente`, igual que si el nodo no estuviera (el motor pone esos al final, ordenados por id en bytes).
--   - Quien no configura el origen sólo elige uno de los modos que declara el diseño de esa versión (`cabecera.modos`): un modo libre podría dividir el total por un tipo de cambio
--     oculto y delatarlo. Otro modo es `modo_invalido`. Quien configura elige cualquiera (es el editor de la fórmula).
--   - `_cotizacion_armar()` devuelve además el id y el origen de la versión que usó y su `visibilidad`, para no leer la fila de la fórmula otra vez; lo que ARMAR lee de
--     `tablas_referencia(_filas)` y de `cotizaciones` no cambia, así que las guardas de `medir-evaluar.sql` siguen valiendo.
--   - El recorte se rehace con un contexto (`_cotizacion_contexto()`, conjuntos jsonb que se arman una vez por llamada) y `_cotizacion_recorte(resultado, contexto)`: es lo mismo que hacía
--     `…007100` con arreglos, sin comparar con `= any (arreglo)` dentro de un bucle (cuadrático en los nodos: con 2.000 sería de segundos). Y la forma de lo tipeado se revisa sin las
--     tablas que arma la base: revisar las 4.000 filas de cuatro tablas costaba 11 ms por llamada, el doble de lo que cuesta el recorte entero. `cotizacion_leer()` se rehace con él.
-- Nada de esto cambia el resultado de quien lo ve todo (la dueña de las pruebas de paridad): `_cotizacion_recorte()` le devuelve exactamente lo que dio el motor.
--
-- Y la comprobación del tipo de cambio congelado deja de depender del orden de un AND: `jsonb_typeof(e.value) = 'number' and (e.value)::numeric > 0` obliga a confiar en que Postgres mire
-- el primer factor antes de convertir el segundo, y no lo garantiza (con un texto en el valor, la conversión puede lanzar). Ahora es un `case`.

drop function if exists public._cotizacion_armar(jsonb, uuid, uuid, uuid);
create function public._cotizacion_armar(p_entradas jsonb, p_cotizacion uuid, p_origen uuid, p_vehiculo uuid)
returns table (definicion jsonb, params jsonb, entrada jsonb, formula_id uuid, origen_id uuid, visibilidad jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_origen uuid;
  v_formula uuid;
  v_vehiculo uuid;
  v_tc_cot jsonb;
  v_def jsonb;
  v_par jsonb;
  v_visib jsonb;
  v_cong jsonb;
  v_ids text[];
  v_tablas text[];
  v_tcs text[];
  v_campos text[];
  v_match text[];
  v_vivas text[];
  v_extra text;
  v_tc jsonb;
  v_tab jsonb;
  v_veh jsonb := '{}'::jsonb;
  v_v_origen uuid;
  v_anio smallint; v_marca text; v_modelo text; v_km int; v_precio numeric; v_attr jsonb;
begin
  perform public.assert_activo();

  -- La llamada: uno de los dos, y el vehículo sólo con un origen (la cotización trae el suyo).
  if (p_cotizacion is null) = (p_origen is null) then
    perform public._motor_fallar('llamada_invalida', null, 'Evaluar pide una cotización o un origen, y no los dos ni ninguno.');
  end if;
  if p_cotizacion is not null and p_vehiculo is not null then
    perform public._motor_fallar('llamada_invalida', 'p_vehiculo', 'Una cotización ya trae su vehículo: no se pasa otro.');
  end if;
  -- Las entradas: un objeto y sólo lo que la persona puede tipear. Lo demás lo pone la base.
  if p_entradas is null or jsonb_typeof(p_entradas) <> 'object' then
    perform public._motor_fallar('entradas_invalidas', null, 'Las entradas son un objeto con inputs, banderas, overrides y variante.');
  end if;
  select min(k collate "C") into v_extra from jsonb_object_keys(p_entradas) k where k not in ('inputs', 'banderas', 'overrides', 'variante');
  if v_extra is not null then
    perform public._motor_fallar('entradas_invalidas', v_extra, 'Las entradas no llevan «' || v_extra || '»: la base lo pone.');
  end if;

  -- Quién puede, y de dónde sale la fórmula.
  if p_cotizacion is not null then
    -- Una cotización que no existe y una que no se ve dan el mismo error.
    if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    end if;
    select c.origen_id, c.formula_id, c.vehiculo_id, c.tipos_cambio into v_origen, v_formula, v_vehiculo, v_tc_cot
      from public.cotizaciones c where c.id = p_cotizacion;                                    -- cotizaciones_pkey
    select f.definicion, f.params, f.visibilidad into v_def, v_par, v_visib from public.formulas f where f.id = v_formula;  -- formulas_pkey
  else
    perform public.assert_permiso('cotizaciones.crear', p_origen);
    v_origen := p_origen;
    v_vehiculo := p_vehiculo;
    select f.id, f.definicion, f.params, f.visibilidad into v_formula, v_def, v_par, v_visib
      from public.formulas f where f.origen_id = p_origen and f.estado = 'publicada';          -- formulas_publicada_unica
    if not found then
      perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
    end if;
  end if;

  -- El vehículo: sólo si quien llama lo ve (esto corre con los derechos de la base y no puede devolver lo que él no vería).
  if v_vehiculo is not null then
    if not public.puede_vehiculo(v_vehiculo, 'vehiculos.ver') then
      raise exception 'No tienes acceso a este vehículo.' using errcode = '42501';
    end if;
    select v.origen_id, v.anio, v.marca, v.modelo, v.kilometraje, v.precio, v.atributos
      into v_v_origen, v_anio, v_marca, v_modelo, v_km, v_precio, v_attr
      from public.vehiculos v where v.id = v_vehiculo;                                         -- vehiculos_pkey
    if p_vehiculo is not null and v_v_origen <> v_origen then
      perform public._motor_fallar('vehiculo_de_otro_origen', 'p_vehiculo', 'El vehículo no es de este origen.');
    end if;
  end if;

  -- Lo que la fórmula nombra, en una sola pasada por sus nodos (`definicion` se desarma una vez: un jsonb que llega de una columna
  -- comprimida se descomprime entero en cada `->`). Los campos del vehículo son los de `campo_vehiculo` y los valores de un `match` que
  -- no son el id de un nodo.
  select array_agg(distinct n ->> 'id'),
         coalesce(array_agg(distinct n ->> 'tabla') filter (where n ->> 'tabla' is not null), '{}'),
         coalesce(array_agg(distinct n ->> 'clave') filter (where n ->> 'tipo' = 'tipo_cambio'), '{}'),
         coalesce(array_agg(distinct n ->> 'campo') filter (where n ->> 'tipo' = 'campo_vehiculo'), '{}'),
         coalesce(array_agg(distinct m.value) filter (where m.value is not null), '{}')
    into v_ids, v_tablas, v_tcs, v_campos, v_match
    from jsonb_array_elements(v_def -> 'nodos') n
    left join lateral jsonb_each_text(case when jsonb_typeof(n -> 'match') = 'object' then n -> 'match' end) m on true;
  v_campos := array(select distinct c from unnest(v_campos || array(select r from unnest(v_match) r where r <> all (coalesce(v_ids, '{}')))) c);

  -- Las tablas vivas: las que un nodo nombra y la fórmula no congeló.
  v_cong := v_par -> 'tablas';
  v_vivas := array(select t from unnest(v_tablas) t where jsonb_typeof(v_cong) is distinct from 'object' or not (v_cong ? t));
  select coalesce(jsonb_object_agg(x.clave, x.filas), '{}'::jsonb) into v_tab
    from (
      select c.clave,
             -- tablas_referencia_filas_tabla_orden_idx: sus filas activas, en su orden.
             (select coalesce(jsonb_agg(f.valores order by f.orden, f.id), '[]'::jsonb)
                from public.tablas_referencia_filas f where f.tabla_id = t.id and f.activa) as filas
        from unnest(v_vivas) c (clave)
        -- tablas_referencia_origen_id_clave_key: la del origen y, si no hay una activa, la compartida.
        cross join lateral (
          select coalesce(
                   (select r.id from public.tablas_referencia r where r.origen_id = v_origen and r.clave = c.clave and r.activa),
                   (select r.id from public.tablas_referencia r where r.origen_id is null and r.clave = c.clave and r.activa)
                 ) as id
        ) t
       where t.id is not null
    ) x;

  -- Los tipos de cambio: los congelados de la cotización o los vigentes de la empresa, sólo los que un nodo nombra.
  if p_cotizacion is not null then
    select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_tc
      from jsonb_each(case when jsonb_typeof(v_tc_cot) = 'object' then v_tc_cot else '{}'::jsonb end) e
     where e.key = any (v_tcs) and case when jsonb_typeof(e.value) = 'number' then (e.value)::numeric > 0 else false end;
  else
    select coalesce(jsonb_object_agg(t.clave, t.valor), '{}'::jsonb) into v_tc
      from public.tipos_cambio t where t.clave = any (v_tcs) and t.activo;                     -- tipos_cambio_clave_key
  end if;

  -- Los campos del vehículo.
  if v_vehiculo is not null then
    select coalesce(jsonb_object_agg(n.campo, n.valor) filter (where n.valor is not null), '{}'::jsonb) into v_veh
      from (
        select s.campo,
               case when jsonb_typeof(s.x) = 'number' and abs((s.x #>> '{}')::numeric) < 1e308 then s.x
                    when jsonb_typeof(s.x) = 'string' and char_length(s.x #>> '{}') <= 200 then s.x end as valor
          from (
            select k.campo,
                   case k.campo
                     when 'anio' then to_jsonb(v_anio)
                     when 'marca' then to_jsonb(v_marca)
                     when 'modelo' then to_jsonb(v_modelo)
                     when 'kilometraje' then to_jsonb(v_km)
                     when 'precio' then to_jsonb(v_precio)
                     -- origenes_campos_origen_id_clave_key: sólo un campo activo del origen del vehículo.
                     else case when exists (select 1 from public.origenes_campos oc
                                             where oc.origen_id = v_v_origen and oc.clave = k.campo and oc.activo)
                               then v_attr -> k.campo end
                   end as x
              from unnest(v_campos) k (campo)
          ) s
      ) n;
  end if;

  return query select
    v_def,
    v_par,
    jsonb_build_object(
      'inputs', case when p_entradas ? 'inputs' then p_entradas -> 'inputs' else '{}'::jsonb end,
      'banderas', case when p_entradas ? 'banderas' then p_entradas -> 'banderas' else '{}'::jsonb end,
      'tipos_cambio', v_tc,
      'vehiculo', v_veh,
      'tablas', v_tab,
      'overrides', case when p_entradas ? 'overrides' then p_entradas -> 'overrides' else '{}'::jsonb end)
    || case when p_entradas ? 'variante' then jsonb_build_object('variante', p_entradas -> 'variante') else '{}'::jsonb end,
    v_formula,
    v_origen,
    coalesce(v_visib, '{}'::jsonb);
end $$;
revoke all on function public._cotizacion_armar(jsonb, uuid, uuid, uuid) from public, anon, authenticated;
comment on function public._cotizacion_armar(jsonb, uuid, uuid, uuid) is
  'Arma la fórmula (con su id, su origen y su visibilidad), las tablas vivas que ella nombra y no congeló, los tipos de cambio y los campos del vehículo para evaluar_formula(). Comprueba los permisos como la policy. Sólo la llama cotizacion_evaluar(); docs/COTIZADOR.md › «En la base (4.06-2)» y «(4.10-1)».';

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El recorte con su contexto (rehecho: `…007100` lo hacía con arreglos, y comparar con `= any (arreglo)` dentro de un bucle es cuadrático en los nodos)
-- ---------------------------------------------------------------------------------------------------------------------------------
-- `_cotizacion_contexto(visibles, definición, visibilidad)` arma UNA vez por llamada lo que el recorte necesita, como conjuntos jsonb (la pertenencia es una búsqueda, no un
-- recorrido): `ok` (los nodos que viajan: los visibles, el total y los de salida aparte), `ids` (todos los nodos), `grupos` (los grupos que se ven enteros), `tc_ocultas` (las claves de
-- los tipos de cambio que un nivel esconde) y `tc_oculto` (si hay alguno). Un nodo está «oculto por un nivel» si la visibilidad lo nombra y quien lee no lo ve; uno que no figura en la
-- visibilidad no se dibuja y no cuenta (docs/DECISIONES.md, «Paso 4.10 (1 de 3)»).
drop function if exists public._cotizacion_recorte(jsonb, text[], jsonb, text[]);
drop function if exists public.cotizacion_leer(uuid);

create function public._cotizacion_contexto(p_visibles text[], p_def jsonb, p_visibilidad jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_nodos jsonb := coalesce(p_def -> 'nodos', '[]'::jsonb);
  v_vis jsonb; v_ocultos jsonb; v_ok jsonb; v_ids jsonb; v_grupos_ocultos jsonb; v_grupos jsonb; v_tc jsonb;
begin
  v_vis := coalesce((select jsonb_object_agg(x, true) from unnest(coalesce(p_visibles, '{}'::text[])) x), '{}'::jsonb);
  v_ocultos := coalesce((select jsonb_object_agg(k, true) from jsonb_object_keys(coalesce(p_visibilidad, '{}'::jsonb)) k where not v_vis ? k), '{}'::jsonb);
  v_ids := coalesce((select jsonb_object_agg(n ->> 'id', true) from jsonb_array_elements(v_nodos) n), '{}'::jsonb);
  v_ok := v_vis || coalesce((select jsonb_object_agg(n ->> 'id', true) from jsonb_array_elements(v_nodos) n where n ->> 'salida' in ('total', 'aparte')), '{}'::jsonb);
  v_grupos_ocultos := coalesce((select jsonb_object_agg(n ->> 'grupo', true) from jsonb_array_elements(v_nodos) n where (n ->> 'grupo') is not null and not v_ok ? (n ->> 'id')), '{}'::jsonb);
  v_grupos := coalesce((select jsonb_object_agg(gr ->> 'id', true) from jsonb_array_elements(coalesce(p_def -> 'grupos', '[]'::jsonb)) gr where not v_grupos_ocultos ? (gr ->> 'id')), '{}'::jsonb);
  v_tc := coalesce((select jsonb_object_agg(n ->> 'clave', true) from jsonb_array_elements(v_nodos) n where n ->> 'tipo' = 'tipo_cambio' and (n ->> 'clave') is not null and v_ocultos ? (n ->> 'id')), '{}'::jsonb);
  return jsonb_build_object('ok', v_ok, 'ids', v_ids, 'grupos', v_grupos, 'tc_ocultas', v_tc, 'tc_oculto', v_tc <> '{}'::jsonb);
end $$;
revoke all on function public._cotizacion_contexto(text[], jsonb, jsonb) from public, anon, authenticated;
comment on function public._cotizacion_contexto(text[], jsonb, jsonb) is
  'Lo que el recorte necesita, armado una vez por llamada (conjuntos jsonb): los nodos que viajan, todos los nodos, los grupos que se ven enteros y los tipos de cambio que un nivel esconde. De nadie. docs/COTIZADOR.md › «En la base (4.10-1)».';

-- El recorte de lo que tiene una cotización o calcula `evaluar_formula()` (`valores`, `estados`, `fuentes`, `totales`, `faltantes`, `overrides_descartados`, `tipos_cambio`): puro y de nadie.
-- Las reglas están en `…007100` y en `docs/DECISIONES.md`; lo que cambia acá es sólo cómo se busca.
create function public._cotizacion_recorte(p_res jsonb, p_ctx jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_ok jsonb := p_ctx -> 'ok'; v_ids jsonb := p_ctx -> 'ids'; v_grupos jsonb := p_ctx -> 'grupos'; v_tc jsonb := p_ctx -> 'tc_ocultas'; v_tc_oculto boolean := (p_ctx ->> 'tc_oculto')::boolean;
  v_out jsonb := '{}'::jsonb; v_t jsonb; v_hay boolean := false; k text;
begin
  foreach k in array array['valores', 'estados', 'fuentes'] loop
    if jsonb_typeof(p_res -> k) = 'object' then
      v_out := v_out || jsonb_build_object(k, coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(p_res -> k) e where v_ok ? e.key), '{}'::jsonb));
    end if;
  end loop;

  if jsonb_typeof(p_res -> 'tipos_cambio') = 'object' then
    v_out := v_out || jsonb_build_object('tipos_cambio', coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(p_res -> 'tipos_cambio') e where not v_tc ? e.key), '{}'::jsonb));
  end if;

  if jsonb_typeof(p_res -> 'totales') = 'object' then
    v_t := '{}'::jsonb;
    if jsonb_typeof(p_res -> 'totales' -> 'grupos') = 'object' then
      v_t := jsonb_build_object('grupos', coalesce((
        select jsonb_object_agg(e.key,
                 case when jsonb_typeof(e.value) = 'object'
                      then coalesce((select jsonb_object_agg(f.key, f.value) from jsonb_each(e.value) f where f.key in ('usd', 'se_dibuja') or (f.key = 'bs' and not v_tc_oculto)), '{}'::jsonb)
                      else e.value end)
          from jsonb_each(p_res -> 'totales' -> 'grupos') e where v_grupos ? e.key), '{}'::jsonb));
    end if;
    foreach k in array array['bs', 'usd', 'suma_usd'] loop
      if p_res -> 'totales' ? k then v_t := v_t || jsonb_build_object(k, p_res -> 'totales' -> k); end if;
    end loop;
    v_out := v_out || jsonb_build_object('totales', v_t);
  end if;

  if jsonb_typeof(p_res -> 'faltantes') = 'array' then
    select coalesce(jsonb_agg(e.value order by e.ord) filter (where e.viaja), '[]'::jsonb), coalesce(bool_or(not e.viaja), false) into v_t, v_hay
      from (select f.value, f.ord,
                   coalesce(v_ok ? (f.value ->> 'donde') or (f.value ->> 'donde') = 'total' or v_grupos ? (f.value ->> 'donde'), false)
                   and ((f.value ->> 'ref') is null or not v_ids ? (f.value ->> 'ref') or v_ok ? (f.value ->> 'ref')) as viaja
              from jsonb_array_elements(p_res -> 'faltantes') with ordinality f (value, ord)) e;
    v_out := v_out || jsonb_build_object('faltantes', v_t);
    if v_hay then v_out := v_out || jsonb_build_object('hay_faltantes_ocultos', true); end if;
  end if;

  if jsonb_typeof(p_res -> 'overrides_descartados') = 'array' then
    v_out := v_out || jsonb_build_object('overrides_descartados', coalesce((
      select jsonb_agg(e.value order by e.ord) from jsonb_array_elements(p_res -> 'overrides_descartados') with ordinality e (value, ord)
       where v_ok ? (e.value ->> 'id') or not v_ids ? (e.value ->> 'id')), '[]'::jsonb));
  end if;
  return v_out;
end $$;
revoke all on function public._cotizacion_recorte(jsonb, jsonb) from public, anon, authenticated;
comment on function public._cotizacion_recorte(jsonb, jsonb) is
  'El recorte por nivel de lo que tiene una cotización o calcula evaluar_formula(), con el contexto de _cotizacion_contexto(): sólo lo visible, el total y lo aparte, y los subtotales de los grupos que se ven enteros. De nadie; la llaman cotizacion_leer, cotizacion_evaluar y cotizacion_revisiones. docs/COTIZADOR.md › «En la base (4.10-1)».';

create function public.cotizacion_leer(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  c public.cotizaciones; v_def jsonb; v_vis jsonb; v_visibles text[]; v_ctx jsonb; v_cols jsonb;
begin
  perform public.assert_activo();
  -- Una que no existe, una en la papelera y una que no se ve dan el mismo error.
  if not public.puede_cotizacion(p_id, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into c from public.cotizaciones x where x.id = p_id;
  select f.definicion, coalesce(f.visibilidad, '{}'::jsonb) into v_def, v_vis from public.formulas f where f.id = c.formula_id;
  v_visibles := coalesce(array(select n.nodo from public._nodos_visibles(c.formula_id) n), '{}');
  v_ctx := public._cotizacion_contexto(v_visibles, v_def, v_vis);
  -- Las columnas que se devuelven son las que `authenticated` lee: el grant de columnas es la única fuente (una columna nueva sin grant no viaja).
  select coalesce(jsonb_object_agg(a.attname, to_jsonb(c) -> a.attname), '{}'::jsonb) into v_cols
    from pg_attribute a
   where a.attrelid = 'public.cotizaciones'::regclass and a.attnum > 0 and not a.attisdropped and has_column_privilege('authenticated', a.attrelid, a.attnum, 'select');
  return jsonb_build_object('cotizacion', v_cols)
      || public._cotizacion_recorte(jsonb_build_object('valores', c.valores, 'fuentes', c.fuentes, 'totales', c.totales, 'tipos_cambio', c.tipos_cambio), v_ctx);
end $$;
revoke all on function public.cotizacion_leer(uuid) from public, anon;
grant execute on function public.cotizacion_leer(uuid) to authenticated;
comment on function public.cotizacion_leer(uuid) is
  'Una cotización con su snapshot recortado por nivel (_nodos_visibles de SU versión de la fórmula): siempre el total y lo aparte; los subtotales por grupo sólo si se ve el grupo entero. docs/COTIZADOR.md › «En la base (4.10-1)».';

-- ---------------------------------------------------------------------------------------------------------------------------------
-- La evaluación
-- ---------------------------------------------------------------------------------------------------------------------------------
create or replace function public.cotizacion_evaluar(
  p_entradas jsonb,
  p_cotizacion uuid default null,
  p_origen uuid default null,
  p_vehiculo uuid default null,
  p_modo jsonb default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  a record;
  v_hint text;
  v_visibles text[]; v_ctx jsonb; v_ok jsonb;
  v_cfg boolean;
  v_tipos jsonb;
  v_ent jsonb; v_ov jsonb; v_ov_ocultos text[];
  v_k text;
  v_opc2 text;
  v_res jsonb;
begin
  select * into a from public._cotizacion_armar(p_entradas, p_cotizacion, p_origen, p_vehiculo);
  v_cfg := public.tiene_permiso('cotizaciones.configurar', a.origen_id);
  v_visibles := coalesce(array(select n.nodo from public._nodos_visibles(a.formula_id) n), '{}');
  v_ctx := public._cotizacion_contexto(v_visibles, a.definicion, a.visibilidad);
  v_ok := v_ctx -> 'ok';
  v_ent := a.entrada;

  -- La forma de lo que llega, antes que cualquier otra cosa y con el texto del motor (así lo que es de forma da el mismo error aunque el nodo no se vea). Sólo lo que tipea la
  -- persona: las tablas las arma la base y el motor las revisa después (revisar las 4.000 filas de cuatro tablas costaba 11 ms, el doble de lo que cuesta el recorte entero).
  v_hint := public._motor_forma_entrada(a.entrada || jsonb_build_object('tablas', '{}'::jsonb));
  if v_hint is not null then
    perform public._motor_fallar('entrada_invalida', nullif(v_hint, ''),
      case when v_hint = '' then 'La entrada no tiene la forma esperada.' else format('La entrada no tiene la forma esperada en «%s».', v_hint) end);
  end if;
  if p_modo is not null then
    v_hint := public._motor_forma_modo(p_modo);
    if v_hint is not null then
      perform public._motor_fallar('modo_invalido', nullif(v_hint, ''),
        case when v_hint = '' then 'El modo no tiene la forma esperada.' else format('El modo no tiene la forma esperada en «%s».', v_hint) end);
    end if;
  end if;

  -- Lo tipeado sólo nombra lo que se ve: un input o una bandera que no se ve da el error del que no existe (el orden y el texto son los de `evaluar_formula()`).
  if jsonb_typeof(a.definicion -> 'nodos') = 'array'
     and (a.entrada -> 'inputs' <> '{}'::jsonb or a.entrada -> 'banderas' <> '{}'::jsonb or a.entrada -> 'overrides' <> '{}'::jsonb) then
    -- Una fórmula que el motor rechaza antes de mirar lo tipeado (dos variantes, o sin total) lo dice primero, como en el motor.
    v_opc2 := (array(select n ->> 'id' from jsonb_array_elements(a.definicion -> 'nodos') n where n ->> 'tipo' = 'opcion'))[2];
    if v_opc2 is not null then perform public._motor_sin_validar(v_opc2, 'tiene dos variantes'); end if;
    if not exists (select 1 from jsonb_array_elements(a.definicion -> 'nodos') n where n ->> 'salida' = 'total') then
      perform public._motor_sin_validar(null, 'no tiene un nodo con salida «total»');
    end if;
    select coalesce(jsonb_object_agg(n ->> 'id', n ->> 'tipo'), '{}'::jsonb) into v_tipos from jsonb_array_elements(a.definicion -> 'nodos') n;
    for v_k in select jsonb_object_keys(a.entrada -> 'inputs') loop
      if v_tipos ->> v_k is distinct from 'input' or not v_ok ? v_k then
        perform public._motor_fallar('entrada_invalida', v_k, format('La entrada nombra «%s», que no es un input de la fórmula.', v_k));
      end if;
    end loop;
    for v_k in select jsonb_object_keys(a.entrada -> 'banderas') loop
      if v_tipos ->> v_k is distinct from 'bandera' or not v_ok ? v_k then
        perform public._motor_fallar('entrada_invalida', v_k, format('La entrada nombra «%s», que no es un bandera de la fórmula.', v_k));
      end if;
    end loop;
    -- Un override de un nodo que existe y no se ve se quita antes del motor; vuelve como `nodo_inexistente` (abajo).
    v_ov := a.entrada -> 'overrides';
    v_ov_ocultos := coalesce(array(select k from jsonb_object_keys(v_ov) k where v_tipos ? k and not v_ok ? k), '{}');
    if cardinality(v_ov_ocultos) > 0 then
      v_ent := jsonb_set(a.entrada, '{overrides}', v_ov - v_ov_ocultos);
    end if;
  end if;

  -- El modo: quien no configura sólo elige uno de los del diseño de esa versión (convertido a la forma del motor).
  if p_modo is not null and not v_cfg and not exists (
       select 1 from public.formulas f, jsonb_array_elements(coalesce(f.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) m
        where f.id = a.formula_id
          and jsonb_build_object('buckets', coalesce((select jsonb_object_agg(b ->> 'bucket', b ->> 'nodo') from jsonb_array_elements(m -> 'buckets') b), '{}'::jsonb),
                                 'total_en', m ->> 'total_en') = p_modo) then
    perform public._motor_fallar('modo_invalido', null, 'El modo no es uno de los que ofrece la hoja.');
  end if;

  v_res := public.evaluar_formula(a.definicion, a.params, v_ent, p_modo);
  v_res := public._cotizacion_recorte(v_res, v_ctx);

  -- Los overrides que se quitaron vuelven como inexistentes, entre los inexistentes y en su orden (por id, en bytes), después de los descartados de nodos que existen: es lo que el
  -- motor habría dicho si el nodo no estuviera. (Se agregan después de recortar: el recorte descarta, con razón, todo lo de un nodo que existe y no se ve.)
  if v_ov_ocultos is not null and cardinality(v_ov_ocultos) > 0 then
    v_res := jsonb_set(v_res, '{overrides_descartados}', (
      select coalesce(jsonb_agg(x.e order by x.grupo, x.id collate "C", x.ord), '[]'::jsonb)
        from (select d.e, case when d.e ->> 'motivo' = 'nodo_inexistente' then 1 else 0 end as grupo, d.e ->> 'id' as id, d.ord
                from jsonb_array_elements(coalesce(v_res -> 'overrides_descartados', '[]'::jsonb)) with ordinality d (e, ord)
              union all
              select jsonb_build_object('id', k, 'motivo', 'nodo_inexistente'), 1, k, 0 from unnest(v_ov_ocultos) k) x));
  end if;
  return v_res;
end $$;
revoke all on function public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb) from public, anon;
grant execute on function public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb) to authenticated;
comment on function public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb) is
  'Evalúa una cotización (SU fórmula, SUS tipos de cambio y SU vehículo) o un origen (su fórmula publicada) con lo que la persona tipeó, y devuelve sólo lo que ve más el total y lo aparte (_cotizacion_recorte). Lo que no ve da el error del que no existe. docs/COTIZADOR.md › «En la base (4.10-1)».';
