-- D2, «desactualizada», en el alta (paso 4.10, prompt 3): `cotizacion_crear()` sabe qué versión de la hoja y qué tipos de cambio vio quien la abrió, y avisa si cambiaron.
--
-- D2 (docs/DECISIONES.md, apertura de la Fase 4): «al guardar una cotización nueva, la RPC detecta que la fórmula publicada o un tipo de cambio cambió desde que se abrió la hoja, y la
-- pantalla ofrece "Usar la versión N+1" o "Guardar con la N". Editar una vieja no avisa: usa SU versión a propósito». El alta es `cotizacion_crear()`; `cotizacion_guardar()` edita una que ya
-- existe y no avisa. Por eso D2 vive acá:
--   - La versión se compara por ID (`p_formula_abierta`, la que usó la hoja) y no por fecha: `publicado_en` es la hora de INICIO de la transacción que publicó (una hoja abierta en medio la
--     habría visto en la versión anterior pero «cambió» después), y las fórmulas de las pruebas no lo tienen.
--   - Los tipos de cambio se comparan por la hora (`p_abierta_en`, que la base le dio a la hoja) contra `tipos_cambio_historial`, por el índice nuevo `(tipo_cambio_id, cambiado_en desc, id desc)`
--     (la FK no tenía ninguno). Sólo cuentan los que un nodo de la fórmula nombra. Un tipo de cambio desactivado no se usa (ni se congela ni cuenta: su nodo queda sin valor, como antes de D2).
--   - Desactualizada y sin `p_con_la_abierta`: PT409, `detail desactualizada`, `hint formula|tipo_cambio`, sin guardar (no dice cuál tipo de cambio: podría ser de un nodo oculto).
--     «Usar la versión N+1» es que la hoja recalcule y vuelva a llamar con lo nuevo. «Guardar con la N» es `p_con_la_abierta := true`: se crea con la versión de la apertura (publicada o
--     archivada de este origen) y con los tipos de cambio que valían entonces, que se congelan; sólo dentro de las 24 horas de la apertura y de que esa versión dejó de ser la publicada.
--   - `cotizacion_validar` deja nacer una cotización de una versión archivada (nunca de un borrador): sólo `cotizacion_crear()` la usa, con esas reglas.
-- `_cotizacion_armar()` recibe la versión elegida (`p_formula`), la hora de la apertura y si se usa «la abierta», y devuelve además `tc_cambiado`. Las 4 llamadas de siempre siguen valiendo (los
-- parámetros nuevos tienen valor por omisión). La firma vieja se borra: dos funciones con el mismo nombre harían ambigua cada llamada de 4 argumentos.

create index if not exists tipos_cambio_historial_tipo_idx on public.tipos_cambio_historial (tipo_cambio_id, cambiado_en desc, id desc);

drop function if exists public._cotizacion_armar(jsonb, uuid, uuid, uuid);
create function public._cotizacion_armar(p_entradas jsonb, p_cotizacion uuid, p_origen uuid, p_vehiculo uuid,
                                         p_formula uuid default null, p_abierta_en timestamptz default null, p_con_la_abierta boolean default false)
returns table (definicion jsonb, params jsonb, entrada jsonb, formula_id uuid, origen_id uuid, visibilidad jsonb, tc_cambiado boolean)
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
  v_tc_cambiado boolean := false;
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
  -- La versión de la hoja que se abrió y cuándo (D2) son de un alta: una cotización ya trae su versión y sus tipos de cambio.
  if p_cotizacion is not null and (p_formula is not null or p_abierta_en is not null or p_con_la_abierta) then
    perform public._motor_fallar('llamada_invalida', 'p_formula', 'Una cotización ya trae su versión de la hoja y sus tipos de cambio.');
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
    if p_formula is not null then
      -- La versión que se abrió (D2, «Guardar con la N»): una publicada o archivada de este origen.
      select f.id, f.definicion, f.params, f.visibilidad into v_formula, v_def, v_par, v_visib
        from public.formulas f where f.id = p_formula and f.origen_id = p_origen and f.estado in ('publicada', 'archivada');   -- formulas_pkey
      if not found then
        perform public._motor_fallar('llamada_invalida', 'p_formula', 'La versión de la hoja no es de este origen.');
      end if;
    else
      select f.id, f.definicion, f.params, f.visibilidad into v_formula, v_def, v_par, v_visib
        from public.formulas f where f.origen_id = p_origen and f.estado = 'publicada';          -- formulas_publicada_unica
      if not found then
        perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
      end if;
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
    -- Los vigentes de hoy, los que valían cuando se abrió la hoja (`tipos_cambio_historial_tipo_idx`: el último cambio hasta `p_abierta_en`) y si alguno cambió desde entonces (D2), todo en
    -- una sola lectura: una foto. Uno que no tenía valor entonces (nació después) cuenta como cambiado. «Guardar con la N» congela los de entonces.
    select coalesce(jsonb_object_agg(x.clave, case when p_con_la_abierta and x.entonces is not null then x.entonces else x.valor end), '{}'::jsonb),
           coalesce(bool_or(p_abierta_en is not null and x.entonces is distinct from x.valor), false)
      into v_tc, v_tc_cambiado
      from (select t.clave, t.valor,
                   case when p_abierta_en is not null then
                     (select h.valor_nuevo from public.tipos_cambio_historial h where h.tipo_cambio_id = t.id and h.cambiado_en <= p_abierta_en order by h.cambiado_en desc, h.id desc limit 1)
                   end as entonces
              from public.tipos_cambio t where t.clave = any (v_tcs) and t.activo) x;          -- tipos_cambio_clave_key
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
    coalesce(v_visib, '{}'::jsonb),
    v_tc_cambiado;
end $$;
revoke all on function public._cotizacion_armar(jsonb, uuid, uuid, uuid, uuid, timestamptz, boolean) from public, anon, authenticated;
comment on function public._cotizacion_armar(jsonb, uuid, uuid, uuid, uuid, timestamptz, boolean) is
  'Arma la fórmula (con su id, su origen y su visibilidad; con p_formula, esa versión), las tablas vivas que ella nombra y no congeló, los tipos de cambio (con p_abierta_en, si alguno cambió desde entonces) y los campos del vehículo para evaluar_formula(). Comprueba los permisos como la policy. La llaman cotizacion_evaluar y cotizacion_crear; docs/COTIZADOR.md › «En la base (4.06-2)», «(4.10-1)» y «Cómo se guarda (4.10-3)».';
