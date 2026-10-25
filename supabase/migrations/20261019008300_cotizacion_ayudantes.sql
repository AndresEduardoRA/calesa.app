-- `cotizacion_crear()` se apoya en tres ayudantes que `cotizacion_guardar()` (migraciones siguientes) comparte (paso 4.10, prompt 3; refactor sin cambio de conducta: los casos de
-- `cotizacion-crear.sql` y de `cotizaciones-visibilidad.sql` no cambian). Dos copias del mismo chequeo acaban respondiendo distinto a lo mismo, y la diferencia es un oráculo:
--   - `_cotizacion_vehiculo(vehiculo)`: comprobar que se ve, tomarlo `for key share` (frena la papelera, que lo toma `for update`) y comprobar otra vez: 42501 «No tienes acceso a este
--     vehículo.» para el que no existe, está en la papelera o no se ve.
--   - `_cotizacion_modo(fórmula, modo)`: la clave de uno de los modos de `diseno.cabecera.modos` de esa versión, en la forma del motor (nulo: los buckets de la fórmula).
--   - `_cotizacion_guardable(resultado, overrides mandados)`: lo que el motor descarta de lo que se mandó no se guarda en silencio (22023, con su motivo); el total tiene que tener valor
--     y caber en `numeric(18,2)`; devuelve `total_base`, el total en la moneda base de la empresa (`USD` o `BOB`).
-- Ninguno lo ejecuta nadie.

create function public._cotizacion_vehiculo(p_vehiculo uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
    raise exception 'No tienes acceso a este vehículo.' using errcode = '42501';
  end if;
  perform 1 from public.vehiculos v where v.id = p_vehiculo and v.eliminado_en is null for key share;
  if not found or not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
    raise exception 'No tienes acceso a este vehículo.' using errcode = '42501';
  end if;
end $$;
revoke all on function public._cotizacion_vehiculo(uuid) from public, anon, authenticated;
comment on function public._cotizacion_vehiculo(uuid) is
  'Comprueba que quien llama ve el vehículo, lo toma for key share y vuelve a comprobar: 42501 para el que no existe, está en la papelera o no se ve. De nadie; la llaman cotizacion_crear y cotizacion_guardar.';

create function public._cotizacion_modo(p_formula uuid, p_modo_tc text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_modo jsonb;
begin
  if p_modo_tc is null then return null; end if;
  select jsonb_build_object('buckets', coalesce((select jsonb_object_agg(b ->> 'bucket', b ->> 'nodo') from jsonb_array_elements(m -> 'buckets') b), '{}'::jsonb),
                            'total_en', m ->> 'total_en')
    into v_modo
    from public.formulas f, jsonb_array_elements(coalesce(f.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) m
   where f.id = p_formula and m ->> 'clave' = p_modo_tc;
  if v_modo is null then
    perform public._motor_fallar('modo_invalido', 'modo_tc', 'El modo no es uno de los que ofrece la hoja.');
  end if;
  return v_modo;
end $$;
revoke all on function public._cotizacion_modo(uuid, text) from public, anon, authenticated;
comment on function public._cotizacion_modo(uuid, text) is
  'La clave de un modo de diseno.cabecera.modos de esa versión de la fórmula, en la forma del motor (nulo si no se pide); modo_invalido si no es uno de los de la hoja. De nadie; la llaman cotizacion_crear y cotizacion_guardar.';

create function public._cotizacion_guardable(p_res jsonb, p_mandados jsonb)
returns numeric language plpgsql stable security definer set search_path = '' as $$
declare
  v_d jsonb; v_moneda text; v_total jsonb;
begin
  -- Lo que el motor descarta de un nodo que la persona mandó no se guarda en silencio: lo guardado es lo que se mandó.
  select e into v_d from jsonb_array_elements(coalesce(p_res -> 'overrides_descartados', '[]'::jsonb)) e where p_mandados ? (e ->> 'id') limit 1;
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
  v_total := case v_moneda when 'USD' then p_res #> '{totales,usd}' when 'BOB' then p_res #> '{totales,bs}' end;
  if v_total is null and v_moneda not in ('USD', 'BOB') then
    raise exception 'La moneda base de la empresa es %: el cotizador sólo calcula en USD o en BOB.', v_moneda using errcode = '22023', hint = 'total';
  end if;
  if v_total is null or jsonb_typeof(v_total) <> 'number' then
    perform public._motor_fallar('total_sin_valor', 'total', 'No se pudo calcular el total: faltan datos de la hoja.');
  end if;
  if abs((v_total #>> '{}')::numeric) >= 1e15 then
    perform public._motor_fallar('fuera_de_rango', 'total', 'El total no cabe: revisa los montos de la hoja.');
  end if;
  return round((v_total #>> '{}')::numeric, 2);
end $$;
revoke all on function public._cotizacion_guardable(jsonb, jsonb) from public, anon, authenticated;
comment on function public._cotizacion_guardable(jsonb, jsonb) is
  'Lo que se puede guardar del resultado del motor: rechaza un override mandado que el motor descartó, un total sin valor o que no cabe, y devuelve total_base en la moneda base de la empresa. De nadie; la llaman cotizacion_crear y cotizacion_guardar.';

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
  v_obligatorio boolean;
  v_modo jsonb;
  v_visibles text[]; v_editables jsonb; v_ctx jsonb;
  v_k text; v_opc text;
  v_res jsonb;
  v_total_base numeric;
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
    perform public._cotizacion_vehiculo(p_vehiculo);
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
  v_modo := public._cotizacion_modo(a.formula_id, p_modo_tc);

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
  -- Lo que el motor descarta de un nodo visible no se guarda en silencio; el total tiene que tener valor, caber y estar en la moneda base: `_cotizacion_guardable()`.
  v_total_base := public._cotizacion_guardable(v_res, a.entrada -> 'overrides');

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
