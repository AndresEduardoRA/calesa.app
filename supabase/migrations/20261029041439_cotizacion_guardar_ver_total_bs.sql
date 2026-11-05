-- «Ver total Bs» al guardar (paso 4.13-4b1, segunda parte): cotizacion_guardar() recibe p_ver_total_bs, sin valor por omisión (como p_modo_tc, recibe el estado entero de lo
-- que se edita). Se valida contra el diseño de SU versión con _cotizacion_ver_total_bs(), entra en la huella del intento y en «nada cambió», y el `update` lo escribe: cambiar sólo
-- esto mueve la versión y deja una revisión con diff.ver_total_bs. La firma vieja se borra: sin sobrecargas.

drop function public.cotizacion_guardar(uuid, uuid, timestamptz, jsonb, text, text, text, uuid);

CREATE FUNCTION "public"."cotizacion_guardar"("p_id" "uuid", "p_intento" "uuid", "p_actualizado_en_esperado" timestamp with time zone, "p_entradas" "jsonb", "p_modo_tc" "text", "p_titulo" "text", "p_notas" "text", "p_vehiculo" "uuid", "p_ver_total_bs" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
                                     'titulo', p_titulo, 'notas', p_notas, 'vehiculo', p_vehiculo, 'ver_total_bs', p_ver_total_bs)::text);
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
  -- «Ver total Bs»: contra el diseño de SU versión, como el modo (una final también lo cambia).
  perform public._cotizacion_ver_total_bs(c.formula_id, p_ver_total_bs);

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
     and c.vehiculo_id is not distinct from p_vehiculo and c.ver_total_bs is not distinct from p_ver_total_bs then
    return public._cotizacion_respuesta(c, v_ctx) || jsonb_build_object('repetido', false);
  end if;

  perform set_config('importadora.guardado', jsonb_build_object('intento', p_intento, 'huella', v_huella)::text, true);
  update public.cotizaciones x
     set valores = v_res -> 'valores', fuentes = coalesce(v_res -> 'fuentes', '{}'::jsonb), totales = v_res -> 'totales', total_base = v_total_base,
         modo_tc = p_modo_tc, titulo = v_titulo, notas = v_notas, vehiculo_id = p_vehiculo, ver_total_bs = p_ver_total_bs
   where x.id = p_id
   returning * into c;
  perform set_config('importadora.guardado', '', true);

  return public._cotizacion_respuesta(c, v_ctx) || jsonb_build_object('repetido', false);
end $$;

COMMENT ON FUNCTION "public"."cotizacion_guardar"("p_id" "uuid", "p_intento" "uuid", "p_actualizado_en_esperado" timestamp with time zone, "p_entradas" "jsonb", "p_modo_tc" "text", "p_titulo" "text", "p_notas" "text", "p_vehiculo" "uuid", "p_ver_total_bs" boolean) IS 'Guarda una cotización calculada en la base con SU versión de la fórmula y SUS tipos de cambio; lo que quien guarda no ve ni edita se conserva de lo guardado. Versión esperada (PT409), intento idempotente y devuelve lo que quien llama ve (_cotizacion_respuesta) con repetido. «Ver total Bs» (p_ver_total_bs, sin valor por omisión: el estado entero de lo que se edita) se valida contra el diseño de SU versión (_cotizacion_ver_total_bs). docs/COTIZADOR.md › «Cómo se guarda (4.10-3)».';
REVOKE ALL ON FUNCTION "public"."cotizacion_guardar"("p_id" "uuid", "p_intento" "uuid", "p_actualizado_en_esperado" timestamp with time zone, "p_entradas" "jsonb", "p_modo_tc" "text", "p_titulo" "text", "p_notas" "text", "p_vehiculo" "uuid", "p_ver_total_bs" boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."cotizacion_guardar"("p_id" "uuid", "p_intento" "uuid", "p_actualizado_en_esperado" timestamp with time zone, "p_entradas" "jsonb", "p_modo_tc" "text", "p_titulo" "text", "p_notas" "text", "p_vehiculo" "uuid", "p_ver_total_bs" boolean) TO authenticated, service_role;
