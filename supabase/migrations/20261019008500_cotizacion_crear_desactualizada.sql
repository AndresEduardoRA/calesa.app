-- D2 en el alta, segunda parte (paso 4.10, prompt 3): la firma nueva de `cotizacion_crear()` y sus ayudantes. Las razones, en `…008400`.
--
-- `cotizacion_crear(id, origen, lead, entradas, formula_abierta, abierta_en, vehiculo?, vehiculo_nuevo?, modo_tc?, clase = 'preventa', con_la_abierta = false)`:
--   - `p_formula_abierta` y `p_abierta_en` (obligatorios): la versión de la hoja y la hora en que se abrió; los dará la lectura que abre la hoja (4.13).
--   - Si la publicada de hoy es otra: PT409 `desactualizada` (`hint formula`), sin guardar, o, con `p_con_la_abierta`, se crea con la abierta (`_cotizacion_abierta()` la valida y la toma `for share`).
--   - Si un tipo de cambio que la hoja usa cambió desde `p_abierta_en`: PT409 `desactualizada` (`hint tipo_cambio`), o, con `p_con_la_abierta`, se congelan los que valían entonces.
--   - El intento repetido vuelve antes que D2 (la misma cotización con `repetido: true`).
-- Orden de candados, sin cambios: el intento (consultivo), el lead, el vehículo y la fórmula (`for share`; con la abierta, además esa versión). Ningún candado sobre `tipos_cambio`: `tipo_cambio_guardar`
-- cambia el por defecto tomando dos filas y un candado más acá podía interbloquear; D2 lee los tipos de cambio en una sola sentencia.
--
-- `cotizacion_validar` (trigger) deja nacer una cotización de una versión archivada del origen (nunca de un borrador): sólo `cotizacion_crear()` la usa, con las reglas de arriba.

create function public._cotizacion_abierta(p_origen uuid, p_formula uuid, p_abierta_en timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_version int; v_siguiente timestamptz;
begin
  -- «Guardar con la N» no fija precios viejos para siempre: la hoja tiene que haberse abierto hace menos de un día y la versión haber dejado de ser la publicada hace menos de un día.
  if p_abierta_en < clock_timestamp() - interval '24 hours' then
    raise exception 'Abriste la hoja hace más de un día: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_vencida', hint = 'abierta';
  end if;
  select f.version into v_version from public.formulas f where f.id = p_formula and f.origen_id = p_origen and f.estado in ('publicada', 'archivada');
  if not found then
    raise exception 'La versión de la hoja que abriste ya no está disponible: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_no_disponible', hint = 'abierta';
  end if;
  select min(f.publicado_en) into v_siguiente from public.formulas f where f.origen_id = p_origen and f.version > v_version and f.estado in ('publicada', 'archivada');
  if v_siguiente is null or v_siguiente < clock_timestamp() - interval '24 hours' then
    raise exception 'Esa versión de la hoja se reemplazó hace más de un día: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_vencida', hint = 'abierta';
  end if;
  -- `for share`, como la publicada: archivada ya no cambia, pero el candado ordena esta alta con quien la borre (un origen que se elimina).
  perform 1 from public.formulas f where f.id = p_formula and f.estado in ('publicada', 'archivada') for share;
  if not found then
    raise exception 'La versión de la hoja que abriste ya no está disponible: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_no_disponible', hint = 'abierta';
  end if;
end $$;
revoke all on function public._cotizacion_abierta(uuid, uuid, timestamptz) from public, anon, authenticated;
comment on function public._cotizacion_abierta(uuid, uuid, timestamptz) is
  'Valida la versión de la hoja que se abrió para «Guardar con la N» (publicada o archivada de este origen, abierta y reemplazada hace menos de un día) y la toma for share. De nadie; la llama cotizacion_crear. docs/COTIZADOR.md › «Cómo se guarda (4.10-3)».';

create or replace function public.cotizacion_validar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and not exists (select 1 from public.formulas f where f.id = new.formula_id and f.origen_id = new.origen_id and f.estado in ('publicada', 'archivada')) then
    raise exception 'La cotización debe nacer de una versión publicada de la fórmula de su origen.' using errcode = '23514';
  end if;
  if new.clase = 'final' and new.vehiculo_id is null then
    raise exception 'Una cotización final exige un vehículo vinculado.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop function if exists public.cotizacion_crear(uuid, uuid, uuid, jsonb, uuid, jsonb, text, public.clase_cotizacion);

create function public.cotizacion_crear(
  p_id uuid,
  p_origen uuid,
  p_lead uuid,
  p_entradas jsonb,
  p_formula_abierta uuid,
  p_abierta_en timestamptz,
  p_vehiculo uuid default null,
  p_vehiculo_nuevo jsonb default null,
  p_modo_tc text default null,
  p_clase public.clase_cotizacion default 'preventa',
  p_con_la_abierta boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_yo uuid := (select auth.uid());
  c public.cotizaciones;
  a record;
  v_formula uuid; v_uso uuid; v_vuelta int := 0; v_version int;
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
  -- D2: qué versión de la hoja se abrió y cuándo (la hora es de la base: una en el futuro es de otro reloj).
  if p_formula_abierta is null or p_abierta_en is null then
    raise exception 'Falta la versión de la hoja que abriste y cuándo la abriste.' using errcode = '22023', hint = 'abierta';
  end if;
  if p_abierta_en > clock_timestamp() then
    raise exception 'La hora en que abriste la hoja es del futuro.' using errcode = '22023', hint = 'abierta';
  end if;
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

  -- D2: la hoja se abrió sobre otra versión que la publicada. Sin «Guardar con la N», se avisa y no se guarda; con ella, se usa esa versión (publicada o archivada de este origen, y reciente).
  v_uso := v_formula;
  if p_formula_abierta is distinct from v_formula then
    select f.version into v_version from public.formulas f where f.id = v_formula;
    if not p_con_la_abierta then
      raise exception 'Se publicó la versión % de la hoja mientras cotizabas.', v_version using errcode = 'PT409', detail = 'desactualizada', hint = 'formula';
    end if;
    perform public._cotizacion_abierta(p_origen, p_formula_abierta, p_abierta_en);
    v_uso := p_formula_abierta;
  end if;

  select * into a from public._cotizacion_armar(p_entradas, null, p_origen, v_veh, v_uso, p_abierta_en, p_con_la_abierta);
  if a.formula_id is distinct from v_uso then
    raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
  end if;
  -- D2: algún tipo de cambio que la hoja usa cambió desde que se abrió (ARMAR lo lee en una sola foto con los de hoy).
  if a.tc_cambiado and not p_con_la_abierta then
    raise exception 'Cambió un tipo de cambio de la hoja mientras cotizabas.' using errcode = 'PT409', detail = 'desactualizada', hint = 'tipo_cambio';
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
revoke all on function public.cotizacion_crear(uuid, uuid, uuid, jsonb, uuid, timestamptz, uuid, jsonb, text, public.clase_cotizacion, boolean) from public, anon;
grant execute on function public.cotizacion_crear(uuid, uuid, uuid, jsonb, uuid, timestamptz, uuid, jsonb, text, public.clase_cotizacion, boolean) to authenticated;
comment on function public.cotizacion_crear(uuid, uuid, uuid, jsonb, uuid, timestamptz, uuid, jsonb, text, public.clase_cotizacion, boolean) is
  'Crea una cotización calculada en la base (evaluar_formula sobre la fórmula publicada del origen, o sobre la abierta con p_con_la_abierta) y devuelve lo que quien llama ve (_cotizacion_respuesta). Idempotente por el id del intento. D2: PT409 desactualizada si la hoja que se abrió ya no es la vigente. docs/COTIZADOR.md › «En la base (4.10-2)» y «Cómo se guarda (4.10-3)».';
