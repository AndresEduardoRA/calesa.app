-- Lo guardado se conserva (paso 4.10, prompt 3; D7: «guardar conserva lo que quien guarda no ve»): `cotizacion_evaluar(p_cotizacion := …)` completa lo oculto con lo ya guardado.
--
-- Hasta acá evaluar una cotización existente tomaba lo que la persona mandaba y nada más: lo que no mandaba (y, para quien no ve un nodo, nunca puede mandar) volvía a su valor por
-- omisión, así que la cuenta de una cotización con un costo oculto daba otro total. Ahora, con una cotización:
--   - lo que quien llama NO edita (un nodo que no ve, o que ve y no edita) se reconstruye de `valores` y `fuentes` guardados (`_cotizacion_entradas_de()`: lo tipeado, los overrides, las banderas
--     y la variante) y se completa antes de `evaluar_formula()` (`_cotizacion_conservar()`); lo oculto que se DERIVA de lo visible (un sugerido, un cálculo, el pct de un par cuyo monto
--     manda) se recalcula: es el límite aceptado de D7 y se dice en docs/COTIZADOR.md;
--   - un valor mandado para un nodo que se ve y no se edita, distinto de lo guardado, es 42501 `nodo_no_editable` (como en `cotizacion_crear`);
--   - lo que SÍ edita y no manda queda sin tipear (↺), salvo la variante, que no tiene «sin tipear»: sin mandarla, la de lo guardado;
--   - una opción oculta sin `por_defecto` ya no da `variante_sin_eleccion` (lo guardado trae la variante): `_cotizacion_tipeado()` lo sabe por su parámetro nuevo.
-- Y `_cotizacion_armar()` acepta `p_vehiculo` con una cotización (otro vehículo para ese cálculo: lo que daría cambiarlo antes de guardar; una final no cambia de vehículo) y devuelve lo
-- guardado. La firma y los demás parámetros no cambian: las llamadas de siempre siguen valiendo. Con un origen nada cambia: la paridad de 84 casos y del corpus sigue.

drop function if exists public._cotizacion_tipeado(jsonb, jsonb, jsonb, jsonb);
drop function if exists public._cotizacion_armar(jsonb, uuid, uuid, uuid, uuid, timestamptz, boolean);

create function public._cotizacion_tipeado(p_def jsonb, p_entrada jsonb, p_modo jsonb, p_ok jsonb, p_tiene_variante boolean default false)
returns text[] language plpgsql stable set search_path = '' as $$
declare
  v_hint text;
  v_tipos jsonb;
  v_k text;
  v_opc2 text;
  v_opc text;
  v_opc_por_defecto text;
  v_ov_ocultos text[] := '{}'::text[];
begin
  -- La forma de lo que llega, antes que cualquier otra cosa y con el texto del motor (así lo que es de forma da el mismo error aunque el nodo no se vea). Sólo lo que tipea la
  -- persona: las tablas las arma la base y el motor las revisa después (revisar las 4.000 filas de cuatro tablas costaba 11 ms, el doble de lo que cuesta el recorte entero).
  v_hint := public._motor_forma_entrada(p_entrada || jsonb_build_object('tablas', '{}'::jsonb));
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

  if jsonb_typeof(p_def -> 'nodos') <> 'array' then
    return v_ov_ocultos;
  end if;
  -- Una fórmula que el motor rechaza antes de mirar lo tipeado (dos variantes, o sin total) lo dice primero, como en el motor.
  v_opc2 := (array(select n ->> 'id' from jsonb_array_elements(p_def -> 'nodos') n where n ->> 'tipo' = 'opcion'))[2];
  if v_opc2 is not null then perform public._motor_sin_validar(v_opc2, 'tiene dos variantes'); end if;
  if not exists (select 1 from jsonb_array_elements(p_def -> 'nodos') n where n ->> 'salida' = 'total') then
    perform public._motor_sin_validar(null, 'no tiene un nodo con salida «total»');
  end if;

  -- Lo tipeado sólo nombra lo que se ve: un input o una bandera que no se ve da el error del que no existe (el orden y el texto son los de `evaluar_formula()`).
  if p_entrada -> 'inputs' <> '{}'::jsonb or p_entrada -> 'banderas' <> '{}'::jsonb or p_entrada -> 'overrides' <> '{}'::jsonb then
    select coalesce(jsonb_object_agg(n ->> 'id', n ->> 'tipo'), '{}'::jsonb) into v_tipos from jsonb_array_elements(p_def -> 'nodos') n;
    for v_k in select jsonb_object_keys(p_entrada -> 'inputs') loop
      if v_tipos ->> v_k is distinct from 'input' or not p_ok ? v_k then
        perform public._motor_fallar('entrada_invalida', v_k, format('La entrada nombra «%s», que no es un input de la fórmula.', v_k));
      end if;
    end loop;
    for v_k in select jsonb_object_keys(p_entrada -> 'banderas') loop
      if v_tipos ->> v_k is distinct from 'bandera' or not p_ok ? v_k then
        perform public._motor_fallar('entrada_invalida', v_k, format('La entrada nombra «%s», que no es un bandera de la fórmula.', v_k));
      end if;
    end loop;
  end if;

  -- 4-18: la variante que no se ve es, para quien llama, una fórmula sin variante. El motor la nombraría (en el texto y en el `hint`).
  select n ->> 'id', n ->> 'por_defecto' into v_opc, v_opc_por_defecto
    from jsonb_array_elements(p_def -> 'nodos') n where n ->> 'tipo' = 'opcion' limit 1;
  if v_opc is not null and not p_ok ? v_opc then
    if p_entrada ? 'variante' then
      perform public._motor_fallar('entrada_invalida', null,
        format('La entrada elige la variante «%s», y la fórmula no tiene variante.', p_entrada ->> 'variante'));
    elsif v_opc_por_defecto is null and not p_tiene_variante then
      perform public._motor_fallar('variante_sin_eleccion', null,
        'La hoja necesita una variante que no puedes ver: avisa a quien configura el cotizador.');
    end if;
  end if;

  -- Un override de un nodo que existe y no se ve se quita antes del motor; vuelve como `nodo_inexistente` (lo hace quien llama, después de recortar).
  if p_entrada -> 'overrides' <> '{}'::jsonb then
    v_ov_ocultos := coalesce(array(select k from jsonb_object_keys(p_entrada -> 'overrides') k where v_tipos ? k and not p_ok ? k), '{}');
  end if;
  return v_ov_ocultos;
end $$;
revoke all on function public._cotizacion_tipeado(jsonb, jsonb, jsonb, jsonb, boolean) from public, anon, authenticated;
comment on function public._cotizacion_tipeado(jsonb, jsonb, jsonb, jsonb, boolean) is
  'Revisa lo que tipeó la persona (forma, fórmula inválida, inputs, banderas y variante sólo de nodos que ve) con el texto y el orden del motor, y devuelve los overrides de nodos que no ve; con p_tiene_variante (una cotización guardada), una opción oculta sin por_defecto no es un error. De nadie; la llaman cotizacion_evaluar, cotizacion_crear y cotizacion_guardar.';

-- Lo guardado de una cotización, como lo tipeó la persona: `valores` y `fuentes` a `{inputs, banderas, overrides, variante?}`. Puro. Sólo lo que la persona escribió: un nodo cuya fuente es
-- `sugerido` o `default`, o que no tiene valor, es derivado y se recalcula; el pct de un par cuyo monto trae override (`pisado`: lo escribe el par con monto ÷ base) tampoco; y un nodo apagado o
-- fuera de la variante no guarda lo que se le tipeó (vale 0 y no tiene fuente): si lo visible lo reactiva, vuelve sin tipear (límite aceptado de D7).
create function public._cotizacion_entradas_de(p_def jsonb, p_valores jsonb, p_fuentes jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_nodos jsonb := coalesce(p_def -> 'nodos', '[]'::jsonb);
  v_valores jsonb := case when jsonb_typeof(p_valores) = 'object' then p_valores else '{}'::jsonb end;
  v_fuentes jsonb := case when jsonb_typeof(p_fuentes) = 'object' then p_fuentes else '{}'::jsonb end;
  v_pisados jsonb; v_in jsonb; v_ba jsonb; v_ov jsonb; v_var jsonb;
begin
  select coalesce(jsonb_object_agg(m ->> 'pct', true), '{}'::jsonb) into v_pisados
    from jsonb_array_elements(v_nodos) m
   where m ->> 'tipo' = 'calculo' and m ->> 'op' = 'porcentaje_de' and (m -> 'sobrescribible') = 'true'::jsonb and (m ->> 'pct') is not null and v_fuentes ->> (m ->> 'id') = 'override';
  select coalesce(jsonb_object_agg(n ->> 'id', v_valores -> (n ->> 'id')), '{}'::jsonb) into v_in
    from jsonb_array_elements(v_nodos) n
   where n ->> 'tipo' = 'input' and not v_pisados ? (n ->> 'id') and v_fuentes ->> (n ->> 'id') in ('input', 'override') and jsonb_typeof(v_valores -> (n ->> 'id')) = 'number';
  select coalesce(jsonb_object_agg(n ->> 'id', case when jsonb_typeof(v_valores -> (n ->> 'id')) = 'number' then v_valores -> (n ->> 'id') else '0'::jsonb end), '{}'::jsonb) into v_ov
    from jsonb_array_elements(v_nodos) n
   where n ->> 'tipo' in ('constante', 'tipo_cambio', 'tabla', 'tramo', 'calculo') and not v_pisados ? (n ->> 'id') and v_fuentes ->> (n ->> 'id') = 'override'
     and (jsonb_typeof(v_valores -> (n ->> 'id')) = 'number' or n ->> 'tipo' = 'tipo_cambio');
  select coalesce(jsonb_object_agg(n ->> 'id', (v_valores -> (n ->> 'id')) = '1'::jsonb), '{}'::jsonb) into v_ba
    from jsonb_array_elements(v_nodos) n where n ->> 'tipo' = 'bandera' and jsonb_typeof(v_valores -> (n ->> 'id')) = 'number';
  select v_valores -> (n ->> 'id') into v_var from jsonb_array_elements(v_nodos) n where n ->> 'tipo' = 'opcion' limit 1;
  return jsonb_build_object('inputs', v_in, 'banderas', v_ba, 'overrides', v_ov) || case when jsonb_typeof(v_var) = 'string' then jsonb_build_object('variante', v_var) else '{}'::jsonb end;
end $$;
revoke all on function public._cotizacion_entradas_de(jsonb, jsonb, jsonb) from public, anon, authenticated;
comment on function public._cotizacion_entradas_de(jsonb, jsonb, jsonb) is
  'Lo guardado de una cotización (valores y fuentes) como lo tipeó la persona: inputs, banderas, overrides y variante. Lo derivado (sugerido, default, el pct pisado, lo apagado) no está. Puro; de nadie. docs/COTIZADOR.md › «Cómo se guarda (4.10-3)».';

-- Completa la entrada de quien llama con lo guardado de lo que no edita, y rechaza un valor distinto para un nodo que se ve y no se edita. `p_editables` es `{nodo: true}` de los nodos que edita
-- (de `_nodos_visibles()`); lo oculto ya no puede venir en la entrada (`_cotizacion_tipeado()` y los overrides ocultos lo rechazaron antes).
create function public._cotizacion_conservar(p_def jsonb, p_entrada jsonb, p_editables jsonb, p_guardado jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_r jsonb := public._cotizacion_entradas_de(p_def, p_guardado -> 'valores', p_guardado -> 'fuentes');
  v_k text; v_opc text; v_out jsonb; v_nuevo jsonb; v_ids jsonb; v_parts jsonb;
  v_e_in jsonb := p_entrada -> 'inputs'; v_e_ba jsonb := p_entrada -> 'banderas'; v_e_ov jsonb := p_entrada -> 'overrides';
  v_r_in jsonb; v_r_ba jsonb; v_r_ov jsonb;
begin
  -- Cada subobjeto una sola vez: `p_entrada -> 'inputs' -> k` copia el subobjeto entero en cada fila (cuadrático en los nodos).
  v_r_in := v_r -> 'inputs'; v_r_ba := v_r -> 'banderas'; v_r_ov := v_r -> 'overrides';
  v_ids := coalesce((select jsonb_object_agg(n ->> 'id', true) from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) n), '{}'::jsonb);
  select n ->> 'id' into v_opc from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) n where n ->> 'tipo' = 'opcion' limit 1;
  -- Un valor para un nodo que se ve y no se edita, distinto de lo guardado: el primero por id, en bytes (como en `cotizacion_crear`). Igual a lo guardado no es un cambio. Una clave que no es un nodo no se juzga
  -- acá: un input o una bandera así ya lo rechazó `_cotizacion_tipeado()` y un override así vuelve del motor como `nodo_inexistente`.
  select min(t.k collate "C") into v_k
    from (select k from jsonb_object_keys(v_e_in) k where v_ids ? k and not p_editables ? k and (v_r_in -> k) is distinct from (v_e_in -> k)
          union all select k from jsonb_object_keys(v_e_ba) k where v_ids ? k and not p_editables ? k and (v_r_ba -> k) is distinct from (v_e_ba -> k)
          union all select k from jsonb_object_keys(v_e_ov) k where v_ids ? k and not p_editables ? k and (v_r_ov -> k) is distinct from (v_e_ov -> k)
          union all select v_opc where v_opc is not null and p_entrada ? 'variante' and not p_editables ? v_opc and (v_r -> 'variante') is distinct from (p_entrada -> 'variante')) t;
  if v_k is not null then
    raise exception 'No puedes cambiar «%» en esta hoja.', v_k using errcode = '42501', detail = 'nodo_no_editable', hint = v_k;
  end if;
  -- Lo que no edita, de lo guardado; lo que edita, lo que mandó (y lo que no mandó, sin tipear). Las tres partes se arman chicas y se pegan UNA vez a la entrada: reescribirla tres veces
  -- (con `jsonb_set`) copiaba cada vez sus tablas (4.000 filas en la sintética) y costaba más que todo lo demás.
  v_parts := jsonb_build_object(
    'inputs', coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(v_r_in) e where not p_editables ? e.key), '{}'::jsonb) || v_e_in,
    'banderas', coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(v_r_ba) e where not p_editables ? e.key), '{}'::jsonb) || v_e_ba,
    'overrides', coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(v_r_ov) e where not p_editables ? e.key), '{}'::jsonb) || v_e_ov);
  -- La variante no tiene «sin tipear»: sin mandarla, la guardada.
  if v_opc is not null then
    v_nuevo := case when p_editables ? v_opc and p_entrada ? 'variante' then p_entrada -> 'variante' else v_r -> 'variante' end;
    if v_nuevo is not null then v_parts := v_parts || jsonb_build_object('variante', v_nuevo); end if;
  end if;
  v_out := p_entrada || v_parts;
  if v_opc is not null and v_nuevo is null then v_out := v_out - 'variante'; end if;
  return v_out;
end $$;
revoke all on function public._cotizacion_conservar(jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
comment on function public._cotizacion_conservar(jsonb, jsonb, jsonb, jsonb) is
  'Completa la entrada de quien llama con lo guardado de lo que no edita (oculto o no editable) y rechaza (42501 nodo_no_editable) un valor distinto para un nodo que se ve y no se edita. De nadie. docs/COTIZADOR.md › «Cómo se guarda (4.10-3)».';

create function public._cotizacion_armar(p_entradas jsonb, p_cotizacion uuid, p_origen uuid, p_vehiculo uuid,
                                         p_formula uuid default null, p_abierta_en timestamptz default null, p_con_la_abierta boolean default false)
returns table (definicion jsonb, params jsonb, entrada jsonb, formula_id uuid, origen_id uuid, visibilidad jsonb, tc_cambiado boolean, guardado jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_origen uuid;
  v_formula uuid;
  v_vehiculo uuid;
  v_tc_cot jsonb;
  v_valores jsonb; v_fuentes jsonb; v_clase public.clase_cotizacion;
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
    select c.origen_id, c.formula_id, c.vehiculo_id, c.tipos_cambio, c.valores, c.fuentes, c.clase into v_origen, v_formula, v_vehiculo, v_tc_cot, v_valores, v_fuentes, v_clase
      from public.cotizaciones c where c.id = p_cotizacion;                                    -- cotizaciones_pkey
    -- Otro vehículo para ese cálculo (lo que daría cambiarlo, antes de guardar): una final no cambia de vehículo.
    if p_vehiculo is not null then
      if v_clase = 'final' and p_vehiculo is distinct from v_vehiculo then
        perform public._motor_fallar('llamada_invalida', 'p_vehiculo', 'Una cotización final no cambia de vehículo.');
      end if;
      v_vehiculo := p_vehiculo;
    end if;
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
    v_tc_cambiado,
    -- Lo guardado, para completar lo que quien llama no ve o no edita (cotizacion_conservar): sólo con una cotización.
    case when p_cotizacion is not null then jsonb_build_object('valores', v_valores, 'fuentes', v_fuentes) end;
end $$;
revoke all on function public._cotizacion_armar(jsonb, uuid, uuid, uuid, uuid, timestamptz, boolean) from public, anon, authenticated;
comment on function public._cotizacion_armar(jsonb, uuid, uuid, uuid, uuid, timestamptz, boolean) is
  'Arma la fórmula (con su id, su origen y su visibilidad; con p_formula, esa versión), las tablas vivas que ella nombra y no congeló, los tipos de cambio (con p_abierta_en, si alguno cambió desde entonces), los campos del vehículo (con una cotización, el suyo o el p_vehiculo que se pase) y, con una cotización, lo guardado, para evaluar_formula(). Comprueba los permisos como la policy. La llaman cotizacion_evaluar y cotizacion_crear; docs/COTIZADOR.md › «En la base (4.06-2)», «(4.10-1)» y «Cómo se guarda (4.10-3)».';

create or replace function public.cotizacion_evaluar(
  p_entradas jsonb,
  p_cotizacion uuid default null,
  p_origen uuid default null,
  p_vehiculo uuid default null,
  p_modo jsonb default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  a record;
  v_visibles text[]; v_editables jsonb; v_ctx jsonb; v_ok jsonb;
  v_cfg boolean;
  v_ent jsonb; v_ov_ocultos text[];
  v_res jsonb;
begin
  select * into a from public._cotizacion_armar(p_entradas, p_cotizacion, p_origen, p_vehiculo);
  v_cfg := public.tiene_permiso('cotizaciones.configurar', a.origen_id);
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb) into v_visibles, v_editables from public._nodos_visibles(a.formula_id) n;
  v_ctx := public._cotizacion_contexto(v_visibles, a.definicion, a.visibilidad);
  v_ok := v_ctx -> 'ok';
  v_ent := a.entrada;

  -- Lo tipeado (la forma, la fórmula inválida, inputs, banderas y variante que se ven): `_cotizacion_tipeado()`, la misma que revisa `cotizacion_crear()`.
  v_ov_ocultos := public._cotizacion_tipeado(a.definicion, a.entrada, p_modo, v_ok, p_cotizacion is not null);
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
-- Misma firma y mismos grants que `…007200` (`create or replace` los conserva).
