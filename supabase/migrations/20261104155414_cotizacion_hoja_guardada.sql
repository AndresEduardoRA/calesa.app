-- La hoja de una cotización guardada (paso 4.15-2): `cotizacion_hoja_guardada(p_id)` abre una cotización con SU versión de la fórmula, su snapshot
-- recortado, si quien mira la puede guardar (y, con eso, qué celdas se editan), la publicada de hoy, la vigencia y la cadena (la anterior y la
-- versión nueva). docs/COTIZADOR.md › «La hoja de una guardada y cotizar encima (4.15-2)».
--
-- `_cotizacion_hoja()` recibe `p_edita`: en la hoja de una guardada lo editable no lo decide `_nodos_visibles()` (que da «editar» con `crear` o con
-- `editar`, sin alcance ni cotización) sino `_cotizacion_puede_guardar()`, el ayudante de guardar. La de dos argumentos se borra; `cotizacion_hoja`
-- la sigue llamando con dos (el valor por omisión, verdadero: idéntica a hoy). El cuerpo es el de 20261030225530, con el `if` de `p_edita`.

drop function public._cotizacion_hoja(uuid, uuid);

create function public._cotizacion_hoja(p_formula uuid, p_origen uuid, p_edita boolean default true) returns jsonb
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    set search_path = ''
    AS $$
declare
  fo public.formulas;
  v_cfg boolean; v_tc boolean; v_arr text[]; v_editables jsonb; v_ctx jsonb; v_ok jsonb;
  v_nodos jsonb; v_grupos jsonb; v_niveles jsonb; v_visib jsonb; v_lee jsonb; v_vivas jsonb; v_opcion text; v_opcion_ok boolean;
  v_secciones jsonb; v_claves text[]; v_tarjeta jsonb; v_tonos jsonb; v_moneda_bs text; v_datos jsonb;
begin
  select * into fo from public.formulas x where x.id = p_formula;
  v_cfg := public.tiene_permiso('cotizaciones.configurar', p_origen);
  v_tc := public.tiene_permiso('empresa.tipos_cambio.gestionar');
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb) into v_arr, v_editables from public._nodos_visibles(p_formula) n;
  v_ctx := public._cotizacion_contexto(v_arr, fo.definicion, fo.visibilidad);
  v_ok := v_ctx -> 'ok';
  -- Copias en memoria de lo que se busca por nodo (un jsonb que viene de la tabla se vuelve a leer entero en cada operador).
  v_nodos := coalesce((select jsonb_object_agg(n ->> 'id', n) from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n), '{}'::jsonb);
  -- La moneda en que se escribe el total en Bs: la `moneda_a` del tipo de cambio ACTIVO que nombra el `total_en` de esta versión (una fila: tipos_cambio_clave_key).
  -- Nula sin `total_en` o sin ese tipo de cambio; no dice si `totales.bs` tiene valor (el Bs sale del tipo de cambio de cada bucket).
  select t.moneda_a::text into v_moneda_bs from public.tipos_cambio t
   where t.activo and t.clave = ((v_nodos -> (fo.definicion ->> 'total_en')) ->> 'clave');
  v_grupos := coalesce((select jsonb_object_agg(g ->> 'id', g ->> 'tono') from jsonb_array_elements(coalesce(fo.definicion -> 'grupos', '[]'::jsonb)) g where (g ->> 'tono') is not null), '{}'::jsonb);
  v_niveles := coalesce((select jsonb_object_agg(l.clave, l.nombre) from public.cotizaciones_niveles l), '{}'::jsonb);
  v_visib := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(coalesce(fo.visibilidad, '{}'::jsonb)) e), '{}'::jsonb);
  -- Quien no puede guardar esa cotización (4.15-2, `p_edita` falso): ninguna celda se edita y el motivo no es un nivel (`no_se_edita`, o `se_calcula`/`del_vehiculo`).
  if p_edita is not true then
    v_editables := '{}'::jsonb;
    v_visib := '{}'::jsonb;
  end if;
  -- Las tablas que lee algún nodo que quien llama ve (la regla de `cotizacion_tabla()`) y las que existen vivas para este origen.
  v_lee := coalesce((select jsonb_object_agg(t.nombre, true)
                       from (select distinct n ->> 'tabla' as nombre from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n
                              where (n ->> 'tabla') is not null and n ->> 'id' = any (v_arr)) t), '{}'::jsonb);
  v_vivas := coalesce((select jsonb_object_agg(r.clave, true) from public.tablas_referencia r where r.activa and (r.origen_id = p_origen or r.origen_id is null)), '{}'::jsonb);
  -- El dato del vehículo de cada nodo `tabla` (4.14-2c2), armado una vez; viaja sólo en la celda de un nodo que se ve.
  v_datos := public._hoja_datos_del_vehiculo(v_nodos, p_origen, fo.params -> 'tablas', v_vivas);
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
                 'dato_del_vehiculo', v_datos -> vis.nid,
                 'solo_en', case when v_opcion_ok then vis.n -> 'solo_en' end,
                 'condicion', case when v_ok ? (vis.n ->> 'condicion') then vis.n ->> 'condicion' end,
                 'requerido_si', case when v_ok ? (vis.n ->> 'requerido_si') then vis.n ->> 'requerido_si' end,
                 'secundario', case when vis.item ? 'secundario' then
                     jsonb_build_object('nodo', vis.n ->> 'pct', 'como', vis.item ->> 'secundario', 'tipo_nodo', v_nodos -> (vis.n ->> 'pct') ->> 'tipo',
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
      'ver_total_bs', coalesce((fo.diseno -> 'cabecera' ->> 'ver_total_bs')::boolean, false),
      'moneda_bs', v_moneda_bs),
    'secciones', v_secciones,
    'tarjeta_total', v_tarjeta,
    'tonos', v_tonos);
end $$;

revoke all on function public._cotizacion_hoja(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public._cotizacion_hoja(uuid, uuid, boolean) to service_role;

comment on function public._cotizacion_hoja(uuid, uuid, boolean) is 'El diseño de una versión de la fórmula recortado al nivel de quien llama: ítems cuyo nodo se ve, con su candado y su motivo, ayudas, el dato del vehículo de una celda de tabla (dato_del_vehiculo), atajos, modos (clave y nombre), la moneda del total en Bs (moneda_bs), tarjeta y tonos. Con p_edita falso (quien no puede guardar esa cotización) nada es editable y el motivo no es un nivel. De nadie; la llaman cotizacion_hoja y cotizacion_hoja_guardada. docs/COTIZADOR.md › «La lectura que abre la hoja (4.13-1)».';

-- La cadena de una cotización, para quien la mira: la anterior (si la ve), la versión nueva viva (la suya, o sólo que existe si no la ve: P11) y si
-- puede cotizar encima (lo que `cotizacion_encima` va a pedir; ésta lo vuelve a comprobar todo). De nadie: la llama `cotizacion_hoja_guardada`.
-- La versión nueva se busca por `cotizacion_padre_id` (cotizaciones_cotizacion_padre_id_idx; una viva por anterior desde cotizaciones_encima_unica).
create function public._cotizacion_cadena(c public.cotizaciones, p_publicada uuid) returns jsonb
    language plpgsql stable security definer
    set search_path = ''
    as $$
declare
  v_ant record; v_enc record; v_anterior jsonb; v_encima jsonb; v_obligatorio boolean; v_vehiculo_ok boolean;
begin
  if c.cotizacion_padre_id is not null and public.puede_cotizacion(c.cotizacion_padre_id, 'cotizaciones.ver') then
    select x.id, x.numero, x.version into v_ant from public.cotizaciones x where x.id = c.cotizacion_padre_id;
    v_anterior := jsonb_build_object('id', v_ant.id, 'numero', v_ant.numero, 'version', v_ant.version);
  end if;
  select x.id, x.numero, x.version into v_enc from public.cotizaciones x where x.cotizacion_padre_id = c.id and x.eliminado_en is null limit 1;
  if v_enc.id is not null then
    v_encima := case when public.puede_cotizacion(v_enc.id, 'cotizaciones.ver')
                     then jsonb_build_object('id', v_enc.id, 'numero', v_enc.numero, 'version', v_enc.version)
                     else '{"oculta": true}'::jsonb end;
  end if;
  if c.vehiculo_id is not null then
    v_vehiculo_ok := public.puede_vehiculo(c.vehiculo_id, 'vehiculos.ver');
  else
    select a.vehiculo_obligatorio_al_cotizar into v_obligatorio from public.ajustes_empresa a where a.id = 1;
    v_vehiculo_ok := not coalesce(v_obligatorio, true);
  end if;
  return jsonb_build_object(
    'anterior', v_anterior,
    'encima', v_encima,
    'puede_cotizar_encima', v_enc.id is null and p_publicada is not null and v_vehiculo_ok
                            and public.tiene_permiso('cotizaciones.crear', c.origen_id)
                            and c.lead_id is not null and public.puede_lead(c.lead_id, 'leads.ver'));
end $$;

revoke all on function public._cotizacion_cadena(public.cotizaciones, uuid) from public, anon, authenticated;
grant execute on function public._cotizacion_cadena(public.cotizaciones, uuid) to service_role;

comment on function public._cotizacion_cadena(public.cotizaciones, uuid) is 'La cadena de una cotización para quien la mira: anterior {id, numero, version} si la ve; encima, la versión nueva viva ({id, numero, version} si la ve, {"oculta": true} si no); puede_cotizar_encima (cotizaciones.crear del origen, ve su lead, ve su vehículo o no es obligatorio, sin versión nueva viva y con publicada). De nadie; la llama cotizacion_hoja_guardada. docs/COTIZADOR.md › «La hoja de una guardada y cotizar encima (4.15-2)».';

create function public.cotizacion_hoja_guardada(p_id uuid) returns jsonb
    language plpgsql stable security definer
    set search_path = ''
    as $$
declare
  c public.cotizaciones; v_edita boolean; v_nombre text; v_pub record; v_vence date; v_hoy date;
begin
  perform public.assert_activo();
  -- Una que no existe, una en la papelera y una que no se ve dan el mismo error que `cotizacion_leer`.
  if not public.puede_cotizacion(p_id, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into c from public.cotizaciones x where x.id = p_id;
  -- Quién guarda decide también qué celdas se editan (no `_nodos_visibles()`, que da «editar» con `crear`).
  v_edita := public._cotizacion_puede_guardar(c.id, c.clase, c.origen_id);
  select o.nombre into v_nombre from public.origenes o where o.id = c.origen_id;
  select x.id, x.version into v_pub from public.formulas x where x.origen_id = c.origen_id and x.estado = 'publicada';   -- formulas_publicada_unica
  -- La vigencia, por día en la zona de la empresa (docs/GLOSARIO.md › «Vencida»): vale hasta el día de `creado_en` + `vigencia_dias`, entero.
  select (c.creado_en at time zone e.zona_horaria)::date + e.vigencia_dias, (now() at time zone e.zona_horaria)::date
    into v_vence, v_hoy from public.ajustes_empresa e where e.id = 1;
  return public._cotizacion_respuesta(c)
      || public._cotizacion_hoja(c.formula_id, c.origen_id, v_edita)
      || jsonb_build_object(
           'estado', 'lista',
           'origen', jsonb_build_object('id', c.origen_id, 'nombre', v_nombre),
           'puede_guardar', v_edita,
           'publicada', case when v_pub.id is not null then jsonb_build_object('id', v_pub.id, 'version', v_pub.version) end,
           'vence_el', v_vence,
           'vencida', v_vence < v_hoy)
      || public._cotizacion_cadena(c, v_pub.id);
end $$;

revoke all on function public.cotizacion_hoja_guardada(uuid) from public, anon;
grant execute on function public.cotizacion_hoja_guardada(uuid) to authenticated, service_role;

comment on function public.cotizacion_hoja_guardada(uuid) is 'La hoja de una cotización guardada, para quien la ve: la fila y el snapshot recortados (como cotizacion_leer), el diseño de SU versión (como cotizacion_hoja, con lo editable decidido por _cotizacion_puede_guardar), puede_guardar, el origen, la publicada de hoy, vence_el y vencida (por día, en la zona de la empresa), anterior, encima y puede_cotizar_encima. Lo que no existe, está en la papelera o no se ve da el 42501 de cotizacion_leer. docs/COTIZADOR.md › «La hoja de una guardada y cotizar encima (4.15-2)».';

-- Dónde se aplican los permisos (la nube no vuelve a correr el seed).
update public.permisos set aplicado_en = 'policy cotizaciones: leer, puede_cotizacion, cotizacion_leer, cotizacion_evaluar, cotizacion_revisiones, cotizacion_tabla, cotizacion_hoja, cotizacion_hoja_guardada, cotizacion_crear, cotizacion_guardar'
 where clave = 'cotizaciones.ver';
update public.permisos set aplicado_en = 'puede_cotizacion, cotizacion_guardar, cotizacion_hoja_guardada, papeleras' where clave = 'cotizaciones.editar';
update public.permisos set aplicado_en = 'cotizacion_marcar_final, cotizacion_crear, cotizacion_guardar, cotizacion_hoja_guardada' where clave = 'cotizaciones.final.gestionar';
