-- `cotizacion_crear()`: la única puerta de alta de una cotización (paso 4.10, prompt 2; D2/D3 de la apertura de la Fase 4, D7).
--
-- Hasta acá una cotización se creaba con un `insert` directo de `authenticated` (la policy «cotizaciones: crear») y con lo que el cliente quisiera en `valores`, `fuentes`,
-- `tipos_cambio` y `totales`. Ahora la base calcula: lee la fórmula PUBLICADA del origen, evalúa lo que la persona tipeó con `evaluar_formula()` (por `_cotizacion_armar()`,
-- que ya arma las tablas, los tipos de cambio y el vehículo), guarda el snapshot ENTERO (los nodos que quien llama no ve toman el valor por defecto de la fórmula) y devuelve lo
-- que esa persona ve, por el mismo recorte que `cotizacion_leer()` (`_cotizacion_respuesta()`). La migración siguiente (…007900) cierra el `insert` directo.
--
-- Qué se exige, en este orden (cada error, igual para lo que no existe y para lo que no se ve: sin oráculo):
--   1. `cotizaciones.crear` en el origen de la cotización (con una final, además `cotizaciones.final.gestionar`).
--   2. El intento (`p_id`, que manda el cliente): llamar dos veces con el mismo id devuelve la misma cotización y no crea otra, también si llegan a la vez (un candado consultivo por id).
--      Un id que existe pero no es mío, o es de otro origen o de la papelera, se trata como un id que no se puede usar: 42501 «No tienes acceso a esta cotización.» (el texto de
--      `cotizacion_leer()` con un id que no existe), y sale del `insert`, no de una consulta previa que sirva para sondear ids.
--   3. El lead es obligatorio (D3) y tiene que verlo quien llama (`leads.ver`, la regla de la policy de insert que se va): comprobar, bloquear (`for key share`, que frena a transferir y a
--      la papelera) y comprobar otra vez.
--   4. El vehículo: obligatorio si el ajuste de la empresa lo dice (sí por defecto) o si la cotización es final. «Cargar a mano» (`p_vehiculo_nuevo`) crea el vehículo en la misma
--      transacción con `vehiculo_crear()`. Uno que quien llama no ve da 42501 «No tienes acceso a este vehículo.», el mismo texto para el que no existe y el de la papelera.
--   5. La fórmula publicada, `for share` (publicar archiva la vigente con un `update` de `estado`, que no choca con `for key share`: sin este candado un alta cruzada con una
--      publicación nacería sobre una versión archivada y el trigger `cotizacion_validar` la rechazaría). Si publicaron mientras esperaba, se vuelve a leer.
--   6. El modo de cambio (`p_modo_tc`): nulo (los buckets de la fórmula) o la clave de un modo de `diseno.cabecera.modos` de esa versión.
--   7. Lo tipeado, por `_cotizacion_tipeado()` (la misma revisión que `cotizacion_evaluar()`), y además: un valor para un nodo que se ve y quien llama no edita → 42501
--      `nodo_no_editable`; un override de un nodo oculto o que no existe → el mismo `nodo_inexistente`.
--   8. El cálculo. Un override que el motor descarta en un nodo visible (fuera de la variante, apagado, no sobrescribible) se rechaza: lo guardado es lo que se mandó. `total_base` es
--      el total en la moneda base de la empresa (`USD` o `BOB`).
--   9. El `insert`: el índice único «una final activa por vehículo» da un error claro.
--
-- D2 («desactualizada» al guardar sobre una versión vieja) no va acá: es de `cotizacion_guardar()` (prompt 3).
-- Orden de candados: el del intento, el lead, el vehículo y la fórmula (el de `vehiculo_vincular`, que toma el lead antes que el vehículo).

create or replace function public.cotizacion_crear(
  p_id uuid,
  p_origen uuid,
  p_lead uuid,
  p_entradas jsonb,
  p_vehiculo uuid default null,
  p_vehiculo_nuevo jsonb default null,
  p_modo_tc text default null,
  p_clase public.clase_cotizacion default 'preventa')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_yo uuid := (select auth.uid());
  c public.cotizaciones;
  a record;
  v_formula uuid; v_vuelta int := 0;
  v_veh uuid := p_vehiculo;
  v_obligatorio boolean; v_moneda text;
  v_modo jsonb;
  v_visibles text[]; v_editables jsonb; v_ctx jsonb;
  v_k text; v_opc text;
  v_res jsonb; v_d jsonb;
  v_total jsonb; v_total_base numeric;
  v_constraint text;
begin
  perform public.assert_activo();
  if p_id is null or p_origen is null then
    raise exception 'Faltan el identificador y el origen de la cotización.' using errcode = '22023';
  end if;
  perform public.assert_permiso('cotizaciones.crear', p_origen);
  if p_clase = 'final' then
    perform public.assert_permiso('cotizaciones.final.gestionar', p_origen);
  end if;

  -- El intento: dos llamadas con el mismo id se ordenan acá (la segunda espera a que la primera confirme). Sólo una cotización MÍA, de este origen y viva se devuelve; un id ajeno
  -- no se mira (sería una sonda barata de ids): sigue y choca con la clave en el `insert`.
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || p_id::text, 0));
  select * into c from public.cotizaciones x where x.id = p_id and x.creado_por = v_yo and x.origen_id = p_origen and x.eliminado_en is null;
  if found then
    return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', true);
  end if;

  -- El lead (comprobar, bloquear y volver a comprobar: nadie bloquea un lead que no ve).
  if p_lead is null then
    raise exception 'Elige el lead de la cotización.' using errcode = '22023', hint = 'lead';
  end if;
  if not public.puede_lead(p_lead, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  perform 1 from public.leads l where l.id = p_lead and l.eliminado_en is null for key share;
  if not found or not public.puede_lead(p_lead, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;

  -- El vehículo.
  if p_vehiculo is not null and p_vehiculo_nuevo is not null then
    raise exception 'Elige un vehículo del inventario o carga uno a mano, no los dos.' using errcode = '22023', hint = 'vehiculo';
  end if;
  select coalesce((select e.vehiculo_obligatorio_al_cotizar from public.ajustes_empresa e where e.id = 1), true) into v_obligatorio;
  if p_vehiculo_nuevo is not null then
    if jsonb_typeof(p_vehiculo_nuevo) <> 'object' or (p_vehiculo_nuevo - array['id', 'datos', 'consulta']) <> '{}'::jsonb
       or coalesce(p_vehiculo_nuevo ->> 'id', '') !~ c_uuid
       or (p_vehiculo_nuevo ? 'consulta' and coalesce(p_vehiculo_nuevo ->> 'consulta', '') !~ c_uuid)
       or (p_vehiculo_nuevo ? 'datos' and jsonb_typeof(p_vehiculo_nuevo -> 'datos') <> 'object') then
      raise exception 'El vehículo a mano lleva su identificador y sus datos.' using errcode = '22023', hint = 'vehiculo';
    end if;
    v_veh := (p_vehiculo_nuevo ->> 'id')::uuid;
    -- En su propia sentencia y antes de armar: `_cotizacion_armar()` es STABLE y ve lo que esta transacción ya escribió.
    perform public.vehiculo_crear(v_veh, p_origen, coalesce(p_vehiculo_nuevo -> 'datos', '{}'::jsonb), (p_vehiculo_nuevo ->> 'consulta')::uuid);
  elsif p_vehiculo is not null then
    if not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
      raise exception 'No tienes acceso a este vehículo.' using errcode = '42501';
    end if;
    perform 1 from public.vehiculos v where v.id = p_vehiculo and v.eliminado_en is null for key share;
    if not found or not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
      raise exception 'No tienes acceso a este vehículo.' using errcode = '42501';
    end if;
  elsif v_obligatorio or p_clase = 'final' then
    raise exception 'Elige el vehículo de la cotización.' using errcode = '22023', hint = 'vehiculo';
  end if;

  -- La fórmula publicada, `for share` por su id: si publicaron mientras esperábamos, READ COMMITTED descarta la fila que ya se archivó y se vuelve a leer la nueva.
  loop
    v_vuelta := v_vuelta + 1;
    select f.id into v_formula from public.formulas f where f.origen_id = p_origen and f.estado = 'publicada';
    if v_formula is null then
      perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
    end if;
    perform 1 from public.formulas f where f.id = v_formula and f.estado = 'publicada' for share;
    exit when found;
    if v_vuelta >= 3 then
      raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
    end if;
  end loop;

  select * into a from public._cotizacion_armar(p_entradas, null, p_origen, v_veh);
  if a.formula_id is distinct from v_formula then
    raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
  end if;

  -- El modo de cambio: la clave de uno de los modos del diseño de esa versión, convertido a la forma del motor.
  if p_modo_tc is not null then
    select jsonb_build_object('buckets', coalesce((select jsonb_object_agg(b ->> 'bucket', b ->> 'nodo') from jsonb_array_elements(m -> 'buckets') b), '{}'::jsonb),
                              'total_en', m ->> 'total_en')
      into v_modo
      from public.formulas f, jsonb_array_elements(coalesce(f.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) m
     where f.id = a.formula_id and m ->> 'clave' = p_modo_tc;
    if v_modo is null then
      perform public._motor_fallar('modo_invalido', 'modo_tc', 'El modo no es uno de los que ofrece la hoja.');
    end if;
  end if;

  -- Lo que se ve y lo que se edita (una sola lectura de los niveles) y la revisión de lo tipeado, la misma que hace `cotizacion_evaluar()`.
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb)
    into v_visibles, v_editables from public._nodos_visibles(a.formula_id) n;
  v_ctx := public._cotizacion_contexto(v_visibles, a.definicion, a.visibilidad);
  perform public._cotizacion_tipeado(a.definicion, a.entrada, v_modo, v_ctx -> 'ok');

  -- Un override de un nodo que no se ve y uno de un nodo que no existe: el mismo error (el primero por id, en bytes).
  select min(k collate "C") into v_k from jsonb_object_keys(a.entrada -> 'overrides') k where not (v_ctx -> 'ok') ? k;
  if v_k is not null then
    raise exception 'La hoja no tiene un nodo «%».', v_k using errcode = '22023', detail = 'nodo_inexistente', hint = v_k;
  end if;
  -- Un valor para un nodo que se ve y no se edita.
  select min(t.k collate "C") into v_k
    from (select jsonb_object_keys(a.entrada -> 'inputs') as k
          union all select jsonb_object_keys(a.entrada -> 'banderas')
          union all select jsonb_object_keys(a.entrada -> 'overrides')) t
   where not v_editables ? t.k;
  if v_k is null and a.entrada ? 'variante' then
    select n ->> 'id' into v_opc from jsonb_array_elements(a.definicion -> 'nodos') n where n ->> 'tipo' = 'opcion' limit 1;
    if v_opc is not null and not v_editables ? v_opc then v_k := v_opc; end if;
  end if;
  if v_k is not null then
    raise exception 'No puedes cambiar «%» en esta hoja.', v_k using errcode = '42501', detail = 'nodo_no_editable', hint = v_k;
  end if;

  -- El cálculo, entero (los nodos que quien llama no ve toman el valor de la fórmula y se guardan igual).
  v_res := public.evaluar_formula(a.definicion, a.params, a.entrada, v_modo);
  -- Lo que el motor descarta de un nodo visible no se guarda en silencio: el que se mandó tiene que ser el que quedó.
  select e into v_d from jsonb_array_elements(coalesce(v_res -> 'overrides_descartados', '[]'::jsonb)) e limit 1;
  if v_d is not null then
    raise exception 'No puedes sobrescribir «%»: %.', v_d ->> 'id',
      case v_d ->> 'motivo' when 'no_sobrescribible' then 'ese valor no se sobrescribe'
                            when 'fuera_de_variante' then 'no vale en esta variante'
                            when 'condicion_apagada' then 'su condición está apagada'
                            else v_d ->> 'motivo' end
      using errcode = '22023', detail = v_d ->> 'motivo', hint = v_d ->> 'id';
  end if;
  -- El total en la moneda base de la empresa.
  select e.moneda_base::text into v_moneda from public.ajustes_empresa e where e.id = 1;
  v_total := case v_moneda when 'USD' then v_res #> '{totales,usd}' when 'BOB' then v_res #> '{totales,bs}' end;
  if v_total is null and v_moneda not in ('USD', 'BOB') then
    raise exception 'La moneda base de la empresa es %: el cotizador sólo calcula en USD o en BOB.', v_moneda using errcode = '22023', hint = 'total';
  end if;
  if v_total is null or jsonb_typeof(v_total) <> 'number' then
    perform public._motor_fallar('total_sin_valor', 'total', 'No se pudo calcular el total: faltan datos de la hoja.');
  end if;
  if abs((v_total #>> '{}')::numeric) >= 1e15 then
    perform public._motor_fallar('fuera_de_rango', 'total', 'El total no cabe: revisa los montos de la hoja.');
  end if;
  v_total_base := round((v_total #>> '{}')::numeric, 2);

  begin
    insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, clase, formula_id, valores, fuentes, tipos_cambio, totales, total_base, modo_tc)
    values (p_id, p_origen, p_lead, v_veh, v_yo, p_clase, a.formula_id, v_res -> 'valores', coalesce(v_res -> 'fuentes', '{}'::jsonb), a.entrada -> 'tipos_cambio',
            v_res -> 'totales', v_total_base, p_modo_tc)
    returning * into c;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'cotizaciones_pkey' then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    elsif v_constraint = 'cotizaciones_final_por_vehiculo' then
      raise exception 'Este vehículo ya tiene una cotización final activa.' using errcode = '23505', hint = 'vehiculo';
    end if;
    raise;
  end;

  return public._cotizacion_respuesta(c, v_ctx) || jsonb_build_object('repetido', false);
end $$;
revoke all on function public.cotizacion_crear(uuid, uuid, uuid, jsonb, uuid, jsonb, text, public.clase_cotizacion) from public, anon;
grant execute on function public.cotizacion_crear(uuid, uuid, uuid, jsonb, uuid, jsonb, text, public.clase_cotizacion) to authenticated;
comment on function public.cotizacion_crear(uuid, uuid, uuid, jsonb, uuid, jsonb, text, public.clase_cotizacion) is
  'Crea una cotización calculada en la base (evaluar_formula sobre la fórmula publicada del origen) y devuelve lo que quien llama ve (_cotizacion_respuesta). Idempotente por el id del intento. docs/COTIZADOR.md › «Quién escribe una cotización y cómo (4.10-2)».';

-- El enforcement de los dos permisos pasa de la policy de insert (que se va en la migración siguiente) a esta función.
update public.permisos set aplicado_en = 'cotizacion_crear' where clave = 'cotizaciones.crear';
update public.permisos set aplicado_en = 'cotizacion_marcar_final, cotizacion_crear' where clave = 'cotizaciones.final.gestionar';
