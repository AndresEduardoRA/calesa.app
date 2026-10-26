-- La lectura que abre la hoja de cotizar (paso 4.13, prompt 1; D7: «lo que quien mira no ve no llega»).
--
-- `cotizacion_hoja(origen)` es UNA lectura que la pantalla hace al abrir y que trae el diseño de la hoja publicada recortado al nivel de quien mira,
-- con lo que la hoja necesita para dibujarse sin otra consulta, la versión de la fórmula y la hora de la base (`p_formula_abierta` y `p_abierta_en`
-- de `cotizacion_crear`, D2) y el estado «fórmula del origen sin publicar». No lee cotizaciones ni snapshot.
--
-- Reglas (docs/COTIZADOR.md › «La lectura que abre la hoja (4.13-1)»):
--   - Un ítem viaja si su nodo está en `ok` de `_cotizacion_contexto()` (lo que `_nodos_visibles()` ve, más el total y lo `aparte`): la misma regla del recorte de
--     `cotizacion_leer()` y `cotizacion_evaluar()`. Una sección viaja si le queda algún ítem. Nunca viajan `de`, `texto`, `match`, `sobre`, `sugerido_de`,
--     `descripcion` ni los grupos: pueden nombrar nodos ocultos.
--   - `editable` de una celda = `editar` de `_nodos_visibles()` y que el nodo acepte un valor (el `v_acepta` de `evaluar_formula()`); el de la variante y el de un
--     interruptor, sólo `editar`. Todo lo que no se edita lleva su `motivo`.
--   - Los modos viajan con su clave y su nombre: sus `buckets` nombran tipos de cambio que un nivel puede esconder.
--   - La ayuda de una tabla viaja con la regla de `cotizacion_tabla()` (quien configura el origen, o un nodo que se ve la lee) y si la tabla existe.
--
-- Los ayudantes `_hoja_*` y `_cotizacion_hoja()` no son de nadie. El 4.15 abrirá con SU versión llamando a `_cotizacion_hoja(formula, origen)`.

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Ayudantes puros
-- ---------------------------------------------------------------------------------------------------------------------------------
-- `editable`, `motivo` (si no se edita) y `ajustes` (el ⚙) de un nodo. `p_celda`: el nodo es una celda (la variante y el interruptor se editan con sólo `editar`).
-- `p_nivel` es el nivel de editar del nodo en la visibilidad y `p_nombre` su nombre. Una celda se edita si el nodo acepta un valor de la persona: la regla de `aceptaValor()` y del
-- `v_acepta` de `evaluar_formula()` (un input, una constante, un tipo de cambio, o una tabla, un tramo o un cálculo sobrescribibles). Una sola función por nodo: llamada por cada
-- ítem de la hoja, cada llamada de más cuesta (con 2.487 nodos, hacerlo en dos tardaba el doble).
create function public._hoja_estado(p_nodo jsonb, p_celda boolean, p_edita boolean, p_nivel text, p_nombre text, p_cfg boolean, p_tc boolean)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('editable', e.ok, 'ajustes', e.tipo = 'constante' and p_cfg or e.tipo = 'tipo_cambio' and p_tc)
         || case when e.ok then '{}'::jsonb else jsonb_build_object('motivo', case
              when p_celda and not e.acepta then jsonb_build_object('codigo', case when e.tipo = 'campo_vehiculo' then 'del_vehiculo' else 'se_calcula' end)
              when p_nivel is null then '{"codigo": "no_se_edita"}'::jsonb
              when p_nivel <> 'todos' then jsonb_build_object('codigo', 'nivel', 'nivel', coalesce(p_nombre, p_nivel))
              else '{"codigo": "no_se_edita"}'::jsonb end) end
    from (select t.tipo, t.acepta, coalesce(p_edita, false) and (not p_celda or t.acepta) as ok
            from (select p_nodo ->> 'tipo' as tipo,
                         (p_nodo ->> 'tipo') in ('input', 'constante', 'tipo_cambio')
                         or ((p_nodo ->> 'tipo') in ('tabla', 'tramo', 'calculo') and coalesce((p_nodo -> 'sobrescribible') = 'true'::jsonb, false)) as acepta) t) e;
$$;
revoke all on function public._hoja_estado(jsonb, boolean, boolean, text, text, boolean, boolean) from public, anon, authenticated;

-- Los chips de unos atajos: las primeras `p_filas` filas de la tabla del nodo (la copia congelada de `params.tablas` de esa versión; si no, la viva del origen o la
-- compartida, por `tablas_referencia_filas_tabla_orden_idx` y con `limit`). `etiqueta` es la columna de los atajos (texto) y `valor`, la columna del nodo.
create function public._hoja_chips(p_origen uuid, p_params jsonb, p_nodo jsonb, p_columna text, p_filas int)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_tabla text := p_nodo ->> 'tabla'; v_col text := p_nodo ->> 'columna'; v_id uuid; v_cong jsonb;
begin
  if jsonb_typeof(p_params -> 'tablas') = 'object' and (p_params -> 'tablas') ? v_tabla then
    v_cong := p_params -> 'tablas' -> v_tabla;
    if jsonb_typeof(v_cong) <> 'array' then return '[]'::jsonb; end if;
    return coalesce((select jsonb_agg(jsonb_build_object('etiqueta', c.fila ->> p_columna,
                                                          'valor', case when jsonb_typeof(c.fila -> v_col) = 'number' then c.fila -> v_col end) order by c.ord)
                       from (select f.value as fila, f.ord from jsonb_array_elements(v_cong) with ordinality f (value, ord) where f.ord <= p_filas) c
                      where c.fila ->> p_columna is not null), '[]'::jsonb);
  end if;
  select r.id into v_id from public.tablas_referencia r where r.clave = v_tabla and r.activa and r.origen_id = p_origen;
  if v_id is null then
    select r.id into v_id from public.tablas_referencia r where r.clave = v_tabla and r.activa and r.origen_id is null;
  end if;
  if v_id is null then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('etiqueta', c.valores ->> p_columna,
                                                        'valor', case when jsonb_typeof(c.valores -> v_col) = 'number' then c.valores -> v_col end) order by c.orden, c.id)
                     from (select x.valores, x.orden, x.id from public.tablas_referencia_filas x where x.tabla_id = v_id and x.activa order by x.orden, x.id limit p_filas) c
                    where c.valores ->> p_columna is not null), '[]'::jsonb);
end $$;
revoke all on function public._hoja_chips(uuid, jsonb, jsonb, text, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- La hoja de una versión de la fórmula, recortada
-- ---------------------------------------------------------------------------------------------------------------------------------
create function public._cotizacion_hoja(p_formula uuid, p_origen uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  fo public.formulas;
  v_cfg boolean; v_tc boolean; v_arr text[]; v_editables jsonb; v_ctx jsonb; v_ok jsonb;
  v_nodos jsonb; v_grupos jsonb; v_niveles jsonb; v_visib jsonb; v_lee jsonb; v_vivas jsonb; v_opcion text; v_opcion_ok boolean;
  v_secciones jsonb; v_claves text[]; v_tarjeta jsonb; v_tonos jsonb;
begin
  select * into fo from public.formulas x where x.id = p_formula;
  v_cfg := public.tiene_permiso('cotizaciones.configurar', p_origen);
  v_tc := public.tiene_permiso('empresa.tipos_cambio.gestionar');
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb) into v_arr, v_editables from public._nodos_visibles(p_formula) n;
  v_ctx := public._cotizacion_contexto(v_arr, fo.definicion, fo.visibilidad);
  v_ok := v_ctx -> 'ok';
  -- Copias en memoria de lo que se busca por nodo (un jsonb que viene de la tabla se vuelve a leer entero en cada operador).
  v_nodos := coalesce((select jsonb_object_agg(n ->> 'id', n) from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n), '{}'::jsonb);
  v_grupos := coalesce((select jsonb_object_agg(g ->> 'id', g ->> 'tono') from jsonb_array_elements(coalesce(fo.definicion -> 'grupos', '[]'::jsonb)) g where (g ->> 'tono') is not null), '{}'::jsonb);
  v_niveles := coalesce((select jsonb_object_agg(l.clave, l.nombre) from public.cotizaciones_niveles l), '{}'::jsonb);
  v_visib := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(coalesce(fo.visibilidad, '{}'::jsonb)) e), '{}'::jsonb);
  -- Las tablas que lee algún nodo que quien llama ve (la regla de `cotizacion_tabla()`) y las que existen vivas para este origen.
  v_lee := coalesce((select jsonb_object_agg(t.nombre, true)
                       from (select distinct n ->> 'tabla' as nombre from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n
                              where (n ->> 'tabla') is not null and n ->> 'id' = any (v_arr)) t), '{}'::jsonb);
  v_vivas := coalesce((select jsonb_object_agg(r.clave, true) from public.tablas_referencia r where r.activa and (r.origen_id = p_origen or r.origen_id is null)), '{}'::jsonb);
  select n ->> 'id' into v_opcion from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'tipo' = 'opcion' limit 1;
  v_opcion_ok := v_opcion is not null and v_ok ? v_opcion;

  with it as (
    select s.ord as so, i.ord as io, s.value as sec, i.value as item, i.value ->> 'tipo' as t, i.value ->> 'nodo' as nid
      from jsonb_array_elements(fo.diseno -> 'secciones') with ordinality s (value, ord)
     cross join lateral jsonb_array_elements(s.value -> 'items') with ordinality i (value, ord)
  ), vis as (
    -- Sólo viaja lo que su nodo (y, en un par, su porcentaje) permite.
    select it.*, v_nodos -> it.nid as n
      from it
     where v_ok ? it.nid and v_nodos ? it.nid
       and (it.t <> 'celda' or not (it.item ? 'secundario') or v_ok ? (v_nodos -> it.nid ->> 'pct'))
  ), obj as (
    select vis.so, vis.io, vis.sec,
           case when vis.t in ('celda', 'subtotal') then v_grupos ->> (vis.n ->> 'grupo') end as tono,
           case vis.t
             when 'celda' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'celda', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'tipo_nodo', vis.n ->> 'tipo',
                 'formato', coalesce(vis.n ->> 'formato', 'usd'), 'ancho', vis.item ->> 'ancho',
                 'tono', v_grupos ->> (vis.n ->> 'grupo'),
                 'ayuda', case
                            when (vis.item -> 'ayuda') ? 'texto' then jsonb_build_object('texto', vis.item -> 'ayuda' ->> 'texto')
                            when (vis.item -> 'ayuda') ? 'tabla'
                                 and (v_cfg or v_lee ? (vis.item -> 'ayuda' ->> 'tabla'))
                                 and ((jsonb_typeof(fo.params -> 'tablas') = 'object' and (fo.params -> 'tablas') ? (vis.item -> 'ayuda' ->> 'tabla'))
                                      or v_vivas ? (vis.item -> 'ayuda' ->> 'tabla'))
                              then jsonb_build_object('tabla', vis.item -> 'ayuda' ->> 'tabla') end,
                 'solo_en', case when v_opcion_ok then vis.n -> 'solo_en' end,
                 'condicion', case when v_ok ? (vis.n ->> 'condicion') then vis.n ->> 'condicion' end,
                 'requerido_si', case when v_ok ? (vis.n ->> 'requerido_si') then vis.n ->> 'requerido_si' end,
                 'secundario', case when vis.item ? 'secundario' then
                     jsonb_build_object('nodo', vis.n ->> 'pct', 'como', vis.item ->> 'secundario',
                                        'formato', coalesce(v_nodos -> (vis.n ->> 'pct') ->> 'formato', 'usd'))
                     || public._hoja_estado(v_nodos -> (vis.n ->> 'pct'), true, v_editables ? (vis.n ->> 'pct'),
                                            v_visib -> (vis.n ->> 'pct') ->> 'editar', v_niveles ->> (v_visib -> (vis.n ->> 'pct') ->> 'editar'), v_cfg, v_tc) end))
               || public._hoja_estado(vis.n, true, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
             when 'atajos' then jsonb_build_object('tipo', 'atajos', 'nodo', vis.nid,
                 'chips', public._hoja_chips(p_origen, fo.params, vis.n, vis.item ->> 'columna', (vis.item ->> 'filas')::int))
             when 'variante' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'variante', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta',
                 'opciones', coalesce((select jsonb_agg(jsonb_build_object('clave', o ->> 'clave', 'etiqueta', o ->> 'etiqueta', 'titulo', o ->> 'titulo'))
                                         from jsonb_array_elements(vis.n -> 'opciones') o), '[]'::jsonb),
                 'por_defecto', vis.n ->> 'por_defecto'))
               || public._hoja_estado(vis.n, false, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
             when 'interruptor' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'interruptor', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'efecto', vis.item ->> 'efecto',
                 'solo_en', case when v_opcion_ok then vis.n -> 'solo_en' end))
               || public._hoja_estado(vis.n, false, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
             when 'subtotal' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'subtotal', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'formato', coalesce(vis.n ->> 'formato', 'usd'),
                 'tono', v_grupos ->> (vis.n ->> 'grupo')))
           end as o
      from vis
  ), secs as (
    select o.so, jsonb_strip_nulls(jsonb_build_object('id', o.sec ->> 'id', 'titulo', o.sec ->> 'titulo', 'presentacion', o.sec ->> 'presentacion'))
                 || jsonb_build_object('items', jsonb_agg(o.o order by o.io)) as sec
      from obj o
     where o.o is not null
     group by o.so, o.sec ->> 'id', o.sec ->> 'titulo', o.sec ->> 'presentacion'
  )
  select coalesce((select jsonb_agg(s.sec order by s.so) from secs s), '[]'::jsonb),
         coalesce((select array_agg(distinct x.tono) from obj x where x.tono is not null), '{}'::text[])
    into v_secciones, v_claves;

  select coalesce(jsonb_agg(jsonb_build_object('clave', t.clave,
                                               'claro', jsonb_build_object('fondo', t.claro_fondo, 'borde', t.claro_borde, 'tinta', t.claro_tinta),
                                               'oscuro', jsonb_build_object('fondo', t.oscuro_fondo, 'borde', t.oscuro_borde, 'tinta', t.oscuro_tinta)) order by t.clave), '[]'::jsonb)
    into v_tonos from public.tonos t where t.clave = any (v_claves);

  v_tarjeta := jsonb_build_object('nodo', fo.diseno -> 'tarjeta_total' ->> 'nodo',
                                  'etiqueta', v_nodos -> (fo.diseno -> 'tarjeta_total' ->> 'nodo') ->> 'etiqueta',
                                  'formato', coalesce(v_nodos -> (fo.diseno -> 'tarjeta_total' ->> 'nodo') ->> 'formato', 'usd'),
                                  'secundarios', coalesce((select jsonb_agg(jsonb_build_object('nodo', x.s, 'etiqueta', v_nodos -> x.s ->> 'etiqueta',
                                                                                              'formato', coalesce(v_nodos -> x.s ->> 'formato', 'usd')) order by x.o)
                                                             from jsonb_array_elements_text(coalesce(fo.diseno -> 'tarjeta_total' -> 'secundarios', '[]'::jsonb)) with ordinality x (s, o)
                                                            where v_ok ? x.s), '[]'::jsonb));

  return jsonb_build_object(
    'formula', jsonb_build_object('id', fo.id, 'version', fo.version),
    'cabecera', jsonb_build_object(
      'modos', coalesce((select jsonb_agg(jsonb_build_object('clave', m ->> 'clave', 'nombre', m ->> 'nombre'))
                           from jsonb_array_elements(coalesce(fo.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) m), '[]'::jsonb),
      'ver_total_bs', coalesce((fo.diseno -> 'cabecera' ->> 'ver_total_bs')::boolean, false)),
    'secciones', v_secciones,
    'tarjeta_total', v_tarjeta,
    'tonos', v_tonos);
end $$;
revoke all on function public._cotizacion_hoja(uuid, uuid) from public, anon, authenticated;
comment on function public._cotizacion_hoja(uuid, uuid) is
  'El diseño de una versión de la fórmula recortado al nivel de quien llama: ítems cuyo nodo se ve, con su candado y su motivo, ayudas, atajos, modos (clave y nombre), tarjeta y tonos. De nadie; la llama cotizacion_hoja. docs/COTIZADOR.md › «La lectura que abre la hoja (4.13-1)».';

-- ---------------------------------------------------------------------------------------------------------------------------------
-- La lectura
-- ---------------------------------------------------------------------------------------------------------------------------------
create function public.cotizacion_hoja(p_origen uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_nombre text; v_formula uuid; v_obligatorio boolean;
begin
  -- El permiso, antes de mirar si el origen existe: con cualquier uuid, quien no cotiza ahí recibe el mismo 42501.
  perform public.assert_permiso('cotizaciones.crear', p_origen);
  if p_origen is null then
    raise exception 'Falta el origen.' using errcode = '22023';
  end if;
  select o.nombre into v_nombre from public.origenes o where o.id = p_origen;
  if v_nombre is null then
    raise exception 'No encontramos ese origen.' using errcode = '22023';
  end if;
  select x.id into v_formula from public.formulas x where x.origen_id = p_origen and x.estado = 'publicada';   -- formulas_publicada_unica
  if v_formula is null then
    return jsonb_build_object('estado', 'sin_publicar', 'origen', jsonb_build_object('id', p_origen, 'nombre', v_nombre),
                              'puede_configurar', public.tiene_permiso('cotizaciones.configurar', p_origen));
  end if;
  select a.vehiculo_obligatorio_al_cotizar into v_obligatorio from public.ajustes_empresa a where a.id = 1;
  return jsonb_build_object('estado', 'lista', 'origen', jsonb_build_object('id', p_origen, 'nombre', v_nombre),
                            'abierta_en', now(), 'vehiculo_obligatorio', coalesce(v_obligatorio, true))
         || public._cotizacion_hoja(v_formula, p_origen);
end $$;
revoke all on function public.cotizacion_hoja(uuid) from public, anon;
grant execute on function public.cotizacion_hoja(uuid) to authenticated;
comment on function public.cotizacion_hoja(uuid) is
  'La lectura que abre la hoja de cotizar de un origen: el diseño publicado recortado al nivel de quien llama, la versión de la fórmula y la hora (p_formula_abierta y p_abierta_en de cotizacion_crear) o «sin_publicar». Con cotizaciones.crear del origen. docs/COTIZADOR.md › «La lectura que abre la hoja (4.13-1)».';

update public.permisos set aplicado_en = 'cotizacion_crear, cotizacion_hoja' where clave = 'cotizaciones.crear';

-- ---------------------------------------------------------------------------------------------------------------------------------
-- `cotizacion_evaluar` con el modo por su clave
-- ---------------------------------------------------------------------------------------------------------------------------------
-- La hoja recibe los modos con su clave y su nombre (sus `buckets` nombran tipos de cambio que un nivel puede esconder), así que recalcula con
-- `p_modo_tc`, la clave de uno de los modos del diseño de esa versión: la misma que reciben `cotizacion_crear` y `cotizacion_guardar`. La forma completa
-- (`p_modo`) sigue para el editor de la fórmula; las dos a la vez son una llamada inválida. Una firma nueva con un parámetro más sería una sobrecarga
-- ambigua para toda llamada de cinco argumentos: se borra la de antes.
drop function if exists public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb);

create function public.cotizacion_evaluar(
  p_entradas jsonb,
  p_cotizacion uuid default null,
  p_origen uuid default null,
  p_vehiculo uuid default null,
  p_modo jsonb default null,
  p_modo_tc text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  a record;
  v_visibles text[]; v_editables jsonb; v_ctx jsonb; v_ok jsonb;
  v_cfg boolean;
  v_ent jsonb; v_ov_ocultos text[];
  v_modo jsonb := p_modo;
  v_res jsonb;
begin
  select * into a from public._cotizacion_armar(p_entradas, p_cotizacion, p_origen, p_vehiculo);
  -- El modo por su clave (de esa versión) se vuelve la forma del motor antes de revisar lo tipeado.
  if p_modo_tc is not null then
    if p_modo is not null then
      perform public._motor_fallar('llamada_invalida', null, 'Pide el modo por su clave o completo, no los dos.');
    end if;
    v_modo := public._cotizacion_modo(a.formula_id, p_modo_tc);
  end if;
  v_cfg := public.tiene_permiso('cotizaciones.configurar', a.origen_id);
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb) into v_visibles, v_editables from public._nodos_visibles(a.formula_id) n;
  v_ctx := public._cotizacion_contexto(v_visibles, a.definicion, a.visibilidad);
  v_ok := v_ctx -> 'ok';
  v_ent := a.entrada;

  -- Lo tipeado (la forma, la fórmula inválida, inputs, banderas y variante que se ven): `_cotizacion_tipeado()`, la misma que revisa `cotizacion_crear()`.
  v_ov_ocultos := public._cotizacion_tipeado(a.definicion, a.entrada, v_modo, v_ok, p_cotizacion is not null);
  -- Un override de un nodo que existe y no se ve se quita antes del motor; vuelve como `nodo_inexistente` (abajo).
  if cardinality(v_ov_ocultos) > 0 then
    v_ent := jsonb_set(a.entrada, '{overrides}', (a.entrada -> 'overrides') - v_ov_ocultos);
  end if;
  -- Con una cotización, lo que quien llama no ve o no edita es lo GUARDADO (D7: guardar conserva lo que quien guarda no ve), y un valor distinto para un nodo que se ve y no se edita es un
  -- error. Con un origen no hay nada guardado.
  if p_cotizacion is not null then
    v_ent := public._cotizacion_conservar(a.definicion, v_ent, v_editables, a.guardado);
  end if;

  -- El modo: quien no configura sólo elige uno de los del diseño de esa versión (convertido a la forma del motor).
  if v_modo is not null and not v_cfg and not exists (
       select 1 from public.formulas f, jsonb_array_elements(coalesce(f.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) m
        where f.id = a.formula_id
          and jsonb_build_object('buckets', coalesce((select jsonb_object_agg(b ->> 'bucket', b ->> 'nodo') from jsonb_array_elements(m -> 'buckets') b), '{}'::jsonb),
                                 'total_en', m ->> 'total_en') = v_modo) then
    perform public._motor_fallar('modo_invalido', null, 'El modo no es uno de los que ofrece la hoja.');
  end if;

  v_res := public.evaluar_formula(a.definicion, a.params, v_ent, v_modo);
  v_res := public._cotizacion_recorte(v_res, v_ctx);

  -- Los overrides que se quitaron vuelven como inexistentes, entre los inexistentes y en su orden (por id, en bytes), después de los descartados de nodos que existen: es lo que el
  -- motor habría dicho si el nodo no estuviera. (Se agregan después de recortar: el recorte descarta, con razón, todo lo de un nodo que existe y no se ve.)
  if cardinality(v_ov_ocultos) > 0 then
    v_res := jsonb_set(v_res, '{overrides_descartados}', (
      select coalesce(jsonb_agg(x.e order by x.grupo, x.id collate "C", x.ord), '[]'::jsonb)
        from (select d.e, case when d.e ->> 'motivo' = 'nodo_inexistente' then 1 else 0 end as grupo, d.e ->> 'id' as id, d.ord
                from jsonb_array_elements(coalesce(v_res -> 'overrides_descartados', '[]'::jsonb)) with ordinality d (e, ord)
              union all
              select jsonb_build_object('id', k, 'motivo', 'nodo_inexistente'), 1, k, 0 from unnest(v_ov_ocultos) k) x));
  end if;
  return v_res;
end $$;
revoke all on function public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb, text) from public, anon;
grant execute on function public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb, text) to authenticated;
comment on function public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb, text) is
  'Calcula una hoja y devuelve sólo lo que quien llama ve. El modo, completo (p_modo, el editor de la fórmula) o por su clave (p_modo_tc, la hoja), no los dos. docs/COTIZADOR.md › «En la base (4.06-2)» y «La lectura que abre la hoja (4.13-1)».';
