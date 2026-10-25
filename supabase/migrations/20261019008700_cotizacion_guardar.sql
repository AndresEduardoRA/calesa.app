-- `cotizacion_guardar()`: la única edición de una cotización (paso 4.10, prompt 3; D7: «guardar conserva lo que quien guarda no ve»).
--
-- Hasta acá una cotización se creaba con `cotizacion_crear()` y nadie la editaba: `…007900` cerró el `update` directo. Esta RPC calcula en la base, con SU versión de la fórmula (nunca la
-- publicada de hoy), SUS tipos de cambio congelados y lo que la persona edita, y guarda el snapshot entero. Devuelve lo que quien llama ve (`_cotizacion_respuesta()`, el mismo recorte
-- de `cotizacion_leer()`) y `repetido`. Qué columnas edita y cuáles no, y por qué, en docs/COTIZADOR.md › «Cómo se guarda (4.10-3)».
--
--   cotizacion_guardar(id, intento, actualizado_en_esperado, entradas, modo_tc, titulo, notas, vehiculo)
--
-- Se recibe el estado entero de lo que la persona edita (como un formulario): título, notas, modo y vehículo sin valor por omisión (nulo es un valor: sin título, los buckets de la
-- fórmula…); en `entradas`, lo que edita y no manda queda sin tipear (↺). Lo que NO edita (un nodo que no ve, o que ve y no edita) se completa con lo guardado antes del motor
-- (`_cotizacion_conservar()`): lo oculto se conserva byte a byte; lo oculto que se DERIVA de lo visible se recalcula (límite aceptado de D7).
--
-- Qué se exige, en este orden (cada error, igual para lo que no existe y para lo que no se ve: sin oráculo):
--   1. Permiso: una preventa pide `cotizaciones.editar` sobre la cotización (`puede_cotizacion`, el mismo criterio que la lectura); una final, además de verla, `cotizaciones.final.gestionar` de su
--      origen (hasta `…007900` la policy de editar lo pedía así; `cotizacion_validar` nunca miró permisos, sólo exige el vehículo). Una que no existe, está en la papelera o no se ve:
--      42501 «No tienes acceso a esta cotización.», el texto de `cotizacion_leer()`. El permiso se vuelve a mirar con la fila tomada.
--   2. Candados (abajo). 3. El intento. 4. La versión. 5. Título, notas, vehículo y modo. 6. ARMAR con SU versión, lo tipeado, lo que no se edita, el motor y lo guardable.
--   7. Si nada cambió, no escribe (ni versión ni revisión). Si no, `update` con `importadora.guardado` fijado: la revisión guarda el diff por nodo, el intento y la huella.
--
-- El intento (`p_intento`, un uuid que genera el cliente por cada guardado): repetir el mismo intento, de la misma persona y con los mismos datos, devuelve lo guardado con `repetido: true` y no
-- cae en PT409 (la versión ya la movió ese mismo guardado); el mismo intento con otros datos es 22023 `intento_reusado` («Ese guardado ya se hizo con otros datos»): nunca devuelve lo viejo en
-- silencio. Vive en la revisión (`cotizaciones_revisiones.intento`, índice único por cotización) y se compara por la huella (md5 de lo que mandó, con la versión esperada).
--
-- ORDEN DE CANDADOS. En este código los padres se toman antes que sus cotizaciones: la papelera de vehículos (también por lotes, en orden de id) toma el vehículo `for update` y después
-- sus cotizaciones; purgar un lead lo toma `for update` y el `on delete set null` actualiza sus cotizaciones. Tomar la cotización y después un vehículo interbloquea con ellas. Por eso:
--   vehículo(s) → cotización, y sólo cuando el vehículo CAMBIA: el actual y el nuevo, `for key share`, en orden de id. Si no cambia, sólo la cotización (`for no key update`; una cotización
--   que la papelera toma después espera por la fila). NI el lead (guardar no crea una referencia a él: una transferencia en medio equivale a «guardó y después se transfirió») NI la fórmula (SU
--   versión no cambia: `formulas` es append-only, así que publicar una nueva no espera a guardar ni al revés). Compatible con `cotizacion_crear` (intento → lead → vehículo → fórmula; crear no
--   toma cotizaciones existentes) y con `cotizacion_marcar_final` (cotización → lo demás; `…008200`). Si mientras esperaba le cambiaron el vehículo a la cotización, la versión también cambió: el conflicto de la versión (PT409) lo dice.

create function public.cotizacion_guardar(
  p_id uuid,
  p_intento uuid,
  p_actualizado_en_esperado timestamptz,
  p_entradas jsonb,
  p_modo_tc text,
  p_titulo text,
  p_notas text,
  p_vehiculo uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_yo uuid := (select auth.uid());
  c0 record;
  c public.cotizaciones;
  r public.cotizaciones_revisiones;
  a record;
  v_ids uuid[]; v_v uuid; v_puede boolean;
  v_huella text;
  v_titulo text := nullif(btrim(p_titulo), '');
  v_notas text := nullif(btrim(p_notas), '');
  v_nuevo_veh uuid;
  v_modo jsonb;
  v_visibles text[]; v_editables jsonb; v_ctx jsonb;
  v_k text; v_ent jsonb; v_res jsonb; v_total_base numeric;
begin
  perform public.assert_activo();
  if p_id is null or p_intento is null then
    raise exception 'Faltan el identificador de la cotización y el del guardado.' using errcode = '22023';
  end if;

  -- Sin candado: sólo para saber qué vehículo hay que tomar antes que la cotización.
  select x.origen_id, x.clase, x.vehiculo_id into c0 from public.cotizaciones x where x.id = p_id and x.eliminado_en is null;
  if not found then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  -- (La condición va aparte: un `if` de plpgsql termina en el primer `then`, también en el de un `case`.)
  v_puede := case c0.clase
    when 'preventa' then public.puede_cotizacion(p_id, 'cotizaciones.editar')
    else public.puede_cotizacion(p_id, 'cotizaciones.ver') and public.tiene_permiso('cotizaciones.final.gestionar', c0.origen_id) end;
  if not v_puede then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;

  -- El vehículo: sólo cambia el de una preventa y nunca se quita. Lo que se pide se valida antes de tomar nada.
  if p_vehiculo is distinct from c0.vehiculo_id then
    if c0.clase = 'final' then
      raise exception 'Una cotización final no cambia de vehículo.' using errcode = '22023', hint = 'vehiculo';
    end if;
    if p_vehiculo is null then
      raise exception 'No se quita el vehículo de una cotización: elige otro.' using errcode = '22023', hint = 'vehiculo';
    end if;
    if not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
      raise exception 'No tienes acceso a este vehículo.' using errcode = '42501';
    end if;
    -- El actual y el nuevo, en orden de id (como la papelera por lotes), antes que la cotización.
    v_ids := array(select distinct x from unnest(array[c0.vehiculo_id, p_vehiculo]) x where x is not null order by 1);
    foreach v_v in array v_ids loop
      perform 1 from public.vehiculos v where v.id = v_v for key share;
    end loop;
    perform 1 from public.vehiculos v where v.id = p_vehiculo and v.eliminado_en is null;
    if not found or not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
      raise exception 'No tienes acceso a este vehículo.' using errcode = '42501';
    end if;
  end if;

  select * into c from public.cotizaciones x where x.id = p_id and x.eliminado_en is null for no key update;
  if not found then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  -- Si mientras esperaba le cambiaron el vehículo, los candados de arriba son de otro vehículo. No hace falta una comprobación aparte: cualquier cambio de la fila mueve su versión
  -- (`cotizacion_version()`), así que quien la tenía en pantalla recibe el conflicto de la versión más abajo, y el repetido de un intento ya guardado no mira candados.

  -- El permiso con la fila tomada (la clase o el alcance pudieron cambiar mientras esperaba).
  v_puede := case c.clase
    when 'preventa' then public.puede_cotizacion(p_id, 'cotizaciones.editar')
    else public.puede_cotizacion(p_id, 'cotizaciones.ver') and public.tiene_permiso('cotizaciones.final.gestionar', c.origen_id) end;
  if not v_puede then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;

  -- El intento: la misma persona con los mismos datos recibe lo guardado; otros datos, un error claro.
  v_huella := md5(jsonb_build_object('version', to_char(p_actualizado_en_esperado at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'), 'entradas', p_entradas, 'modo', p_modo_tc,
                                     'titulo', p_titulo, 'notas', p_notas, 'vehiculo', p_vehiculo)::text);
  select * into r from public.cotizaciones_revisiones x where x.cotizacion_id = p_id and x.intento = p_intento;
  if found then
    if r.usuario_id is distinct from v_yo or r.huella is distinct from v_huella then
      raise exception 'Ese guardado ya se hizo con otros datos. Recarga la cotización.' using errcode = '22023', detail = 'intento_reusado', hint = 'intento';
    end if;
    return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', true);
  end if;

  -- La versión.
  if p_actualizado_en_esperado is null then
    perform public._exigir_version(c.actualizado_en, null, '');
  elsif c.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('cotizaciones', c.id, c.actualizado_en, 'esta cotización');
  end if;

  -- Título y notas.
  if char_length(v_titulo) > 120 then
    raise exception 'El título tiene como máximo 120 caracteres.' using errcode = '22023', hint = 'titulo';
  end if;
  if char_length(v_notas) > 2000 then
    raise exception 'Las notas tienen como máximo 2.000 caracteres.' using errcode = '22023', hint = 'notas';
  end if;

  -- SU versión de la fórmula, SUS tipos de cambio y (si cambia) el vehículo nuevo; el modo de esa versión.
  v_nuevo_veh := case when p_vehiculo is distinct from c.vehiculo_id then p_vehiculo end;
  select * into a from public._cotizacion_armar(p_entradas, p_id, null, v_nuevo_veh);
  v_modo := public._cotizacion_modo(c.formula_id, p_modo_tc);

  -- Lo que se ve y lo que se edita, y la revisión de lo tipeado (la misma de `cotizacion_evaluar()` y `cotizacion_crear()`).
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb) into v_visibles, v_editables from public._nodos_visibles(a.formula_id) n;
  v_ctx := public._cotizacion_contexto(v_visibles, a.definicion, a.visibilidad);
  perform public._cotizacion_tipeado(a.definicion, a.entrada, v_modo, v_ctx -> 'ok', true);
  -- Un override de un nodo que no se ve y uno de un nodo que no existe: el mismo error (el primero por id, en bytes).
  select min(k collate "C") into v_k from jsonb_object_keys(a.entrada -> 'overrides') k where not (v_ctx -> 'ok') ? k;
  if v_k is not null then
    raise exception 'La hoja no tiene un nodo «%».', v_k using errcode = '22023', detail = 'nodo_inexistente', hint = v_k;
  end if;

  -- Lo que no se edita sale de lo guardado; el motor; y lo guardable.
  v_ent := public._cotizacion_conservar(a.definicion, a.entrada, v_editables, a.guardado);
  v_res := public.evaluar_formula(a.definicion, a.params, v_ent, v_modo);
  v_total_base := public._cotizacion_guardable(v_res, a.entrada -> 'overrides');

  -- Nada cambió: no se escribe (ni la versión ni la revisión).
  if c.valores is not distinct from (v_res -> 'valores') and c.fuentes is not distinct from coalesce(v_res -> 'fuentes', '{}'::jsonb) and c.totales is not distinct from (v_res -> 'totales')
     and c.total_base = v_total_base and c.modo_tc is not distinct from p_modo_tc and c.titulo is not distinct from v_titulo and c.notas is not distinct from v_notas
     and c.vehiculo_id is not distinct from p_vehiculo then
    return public._cotizacion_respuesta(c, v_ctx) || jsonb_build_object('repetido', false);
  end if;

  perform set_config('importadora.guardado', jsonb_build_object('intento', p_intento, 'huella', v_huella)::text, true);
  update public.cotizaciones x
     set valores = v_res -> 'valores', fuentes = coalesce(v_res -> 'fuentes', '{}'::jsonb), totales = v_res -> 'totales', total_base = v_total_base,
         modo_tc = p_modo_tc, titulo = v_titulo, notas = v_notas, vehiculo_id = p_vehiculo
   where x.id = p_id
   returning * into c;
  perform set_config('importadora.guardado', '', true);

  return public._cotizacion_respuesta(c, v_ctx) || jsonb_build_object('repetido', false);
end $$;
revoke all on function public.cotizacion_guardar(uuid, uuid, timestamptz, jsonb, text, text, text, uuid) from public, anon;
grant execute on function public.cotizacion_guardar(uuid, uuid, timestamptz, jsonb, text, text, text, uuid) to authenticated;
comment on function public.cotizacion_guardar(uuid, uuid, timestamptz, jsonb, text, text, text, uuid) is
  'Guarda una cotización calculada en la base con SU versión de la fórmula y SUS tipos de cambio; lo que quien guarda no ve ni edita se conserva de lo guardado. Versión esperada (PT409), intento idempotente y devuelve lo que quien llama ve (_cotizacion_respuesta) con repetido. docs/COTIZADOR.md › «Cómo se guarda (4.10-3)».';

-- El enforcement de `cotizaciones.editar` ya no es sólo la policy (que se fue): lo aplican `puede_cotizacion`, las papeleras y esta función.
update public.permisos set aplicado_en = 'puede_cotizacion, cotizacion_guardar, papeleras' where clave = 'cotizaciones.editar';
update public.permisos set aplicado_en = 'cotizacion_marcar_final, cotizacion_crear, cotizacion_guardar' where clave = 'cotizaciones.final.gestionar';
