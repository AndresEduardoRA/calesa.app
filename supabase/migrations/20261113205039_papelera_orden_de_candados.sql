-- El orden de candados lead → vehículo → cotización (docs/DECISIONES.md) en dos llamadas que cruzan la papelera: cotizar encima toma el lead y el vehículo
-- de la anterior antes que la anterior (mandar el vehículo a la papelera toma el vehículo y después sus cotizaciones), y restaurar cotizaciones toma sus
-- leads antes que sus vehículos (vincular toma el lead y después el vehículo). Sus carreras: scripts/carreras/candados-papelera.mjs.

CREATE OR REPLACE FUNCTION "public"."_papelera_restaurar_cotizaciones"("p_lote" "uuid", "p_ids" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  c record; v_vehiculo uuid; v_lead uuid; v_clase public.clase_cotizacion; v_vehiculo_fuera boolean; v_lead_fuera boolean;
  v_motivo text; v_restriccion text; v_quedan int; v_version timestamptz;
  v_restaurados jsonb := '[]'::jsonb; v_pendientes jsonb := '[]'::jsonb;
begin
  -- 0. Antes de tomar cotización alguna, sus leads y después sus vehículos, por id (cotizaciones_lote_papelera_idx; las PK): el orden lead → vehículo de
  -- vincular, que toma el lead y después el vehículo (al revés, 40P01).
  perform 1 from public.leads d
   where d.id in (select x.lead_id from public.cotizaciones x
                   where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_ids is null or x.id = any (p_ids)))
   order by d.id for key share;
  perform 1 from public.vehiculos v
   where v.id in (select x.vehiculo_id from public.cotizaciones x
                   where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_ids is null or x.id = any (p_ids)))
   order by v.id for key share;

  for c in
    select x.id, x.numero, coalesce(x.titulo, 'Cotización #' || x.numero) as titulo from public.cotizaciones x
     where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_ids is null or x.id = any (p_ids))
     order by x.id for no key update
  loop
    begin
      -- 1. Sobre la fila tomada (la FK pudo poner nulos el vehículo o el lead mientras se esperaba).
      select x.vehiculo_id, x.lead_id, x.clase into v_vehiculo, v_lead, v_clase from public.cotizaciones x where x.id = c.id;
      v_vehiculo_fuera := false; v_lead_fuera := false;
      if v_lead is not null then
        select d.eliminado_en is not null into v_lead_fuera from public.leads d where d.id = v_lead for key share;
      end if;
      if v_vehiculo is not null then
        select v.eliminado_en is not null into v_vehiculo_fuera from public.vehiculos v where v.id = v_vehiculo for key share;
      end if;
      v_motivo := case
        when v_vehiculo_fuera then 'Su vehículo está en la papelera.'
        when v_lead_fuera then 'Su cliente está en la papelera.'
        when v_clase = 'final' and v_vehiculo is null then 'Su vehículo ya no existe.'
      end;
      -- 2. Si nada la detiene, vuelve.
      if v_motivo is null then
        update public.cotizaciones x set eliminado_en = null, eliminado_por = null, lote_papelera_id = null where x.id = c.id;
      end if;
    exception
      when unique_violation then
        get stacked diagnostics v_restriccion = constraint_name;
        v_motivo := case v_restriccion
          when 'cotizaciones_encima_unica' then 'Esa cotización ya tiene otra versión nueva.'
          when 'cotizaciones_final_por_vehiculo' then 'Ese vehículo ya tiene otra cotización final.'
          else 'Choca con otro registro que ya existe.'
        end;
      when check_violation then
        -- La red por si la tabla suma reglas: su texto es nuestro.
        get stacked diagnostics v_motivo = message_text;
    end;
    if v_motivo is null then
      v_restaurados := v_restaurados || jsonb_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo);
    else
      v_pendientes := v_pendientes || jsonb_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo, 'motivo', v_motivo);
    end if;
  end loop;

  -- Cuántas siguen en la papelera del lote (a lo sumo 200 por lote; cotizaciones_lote_papelera_idx).
  select count(*) into v_quedan from (
    select 1 from public.cotizaciones x where x.lote_papelera_id = p_lote and x.eliminado_en is not null limit 201) q;
  if jsonb_array_length(v_restaurados) = 0 then
    return jsonb_build_object('actualizado_en', (select l.actualizado_en from public.lotes_papelera l where l.id = p_lote),
      'restaurados', v_restaurados, 'pendientes', v_pendientes, 'quedan', v_quedan);
  end if;
  update public.lotes_papelera l
  set resumen = l.resumen || jsonb_build_object('restaurados', coalesce((l.resumen ->> 'restaurados')::int, 0) + jsonb_array_length(v_restaurados)),
      restaurado_en = case when v_quedan = 0 then now() else l.restaurado_en end,
      restaurado_por = case when v_quedan = 0 then (select auth.uid()) else l.restaurado_por end
  where l.id = p_lote;
  v_version := public._lote_papelera_tocar(p_lote);
  perform public.registrar_actividad('papelera.restaurado', 'lotes_papelera', p_lote::text, null, null,
    jsonb_build_object('tipo', 'cotizaciones', 'cantidad', jsonb_array_length(v_restaurados)));
  return jsonb_build_object('actualizado_en', v_version, 'restaurados', v_restaurados, 'pendientes', v_pendientes, 'quedan', v_quedan);
end;
$$;


COMMENT ON FUNCTION "public"."_papelera_restaurar_cotizaciones"("p_lote" "uuid", "p_ids" "uuid"[]) IS 'Restaura del lote las cotizaciones en la papelera (p_ids nulo: todas), una a una por id: toma antes sus leads y sus vehículos for key share (el orden lead → vehículo); lo que choca con otra viva, cuelga de un vehículo o cliente en la papelera o es una final sin vehículo queda en pendientes con su motivo. Devuelve {actualizado_en, restaurados, pendientes, quedan}. De nadie: la llaman cotizaciones_papelera_restaurar y papelera_restaurar.';

REVOKE ALL ON FUNCTION "public"."_papelera_restaurar_cotizaciones"("p_lote" "uuid", "p_ids" "uuid"[]) FROM PUBLIC, "anon", "authenticated";
GRANT ALL ON FUNCTION "public"."_papelera_restaurar_cotizaciones"("p_lote" "uuid", "p_ids" "uuid"[]) TO "service_role";


CREATE OR REPLACE FUNCTION "public"."cotizacion_encima"("p_id" "uuid", "p_anterior" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_yo uuid := (select auth.uid());
  c public.cotizaciones; ant public.cotizaciones; a record;
  v_formula uuid; v_vuelta int := 0; v_enc uuid; v_obligatorio boolean;
  v_lleva jsonb; v_modo_tc text; v_bs boolean; v_res jsonb; v_total_base numeric; v_constraint text; v_desc int;
  v_lead uuid; v_vehiculo uuid; v_tomas int := 0;
begin
  perform public.assert_activo();
  if p_id is null or p_anterior is null then
    raise exception 'Faltan el identificador y la cotización anterior.' using errcode = '22023';
  end if;
  -- La anterior, antes que todo lo demás: una que no existe, está en la papelera o no se ve da el mismo error, con o sin permiso de cotizar y vea o no su lead.
  if not public.puede_cotizacion(p_anterior, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into ant from public.cotizaciones x where x.id = p_anterior;
  perform public.assert_permiso('cotizaciones.crear', ant.origen_id);
  perform public.assert_permiso('cotizaciones.ver', ant.origen_id);
  if ant.lead_id is null then
    raise exception 'La cotización anterior no tiene lead: cotiza una nueva.' using errcode = '22023', hint = 'lead';
  end if;
  if not public.puede_lead(ant.lead_id, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;

  -- El intento, como en `cotizacion_crear` (el mismo candado): una mía viva con ese id es la de este intento si es de esta anterior.
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || p_id::text, 0));
  select * into c from public.cotizaciones x where x.id = p_id and x.creado_por = v_yo and x.eliminado_en is null;
  if found then
    if c.cotizacion_padre_id is distinct from p_anterior then
      raise exception 'Ese intento ya se usó para otra cotización.' using errcode = '22023', detail = 'intento_reusado', hint = 'intento';
    end if;
    return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', true);
  end if;

  -- El orden de candados (lead → vehículo → cotización): el lead y el vehículo de la anterior, leídos sin candado, antes que la anterior `for share` (choca con
  -- guardarla y con mandarla a la papelera). Al revés se cruza en un 40P01 con mandar su vehículo a la papelera, que toma el vehículo y después sus cotizaciones.
  -- Sólo se toma lo que se ve: lo demás falla abajo sin esperar. Con la anterior tomada, otra vez visible y se relee lo que quedó; si mientras se esperaba
  -- cambió su lead o su vehículo, los candados son de otros y se vuelve a tomar.
  loop
    v_tomas := v_tomas + 1;
    v_lead := ant.lead_id;
    v_vehiculo := ant.vehiculo_id;
    if v_lead is not null and public.puede_lead(v_lead, 'leads.ver') then
      perform 1 from public.leads l where l.id = v_lead for key share;
    end if;
    if v_vehiculo is not null and public.puede_vehiculo(v_vehiculo, 'vehiculos.ver') then
      perform 1 from public.vehiculos v where v.id = v_vehiculo for key share;
    end if;
    perform 1 from public.cotizaciones x where x.id = p_anterior and x.eliminado_en is null for share;
    if not found or not public.puede_cotizacion(p_anterior, 'cotizaciones.ver') then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    end if;
    select * into ant from public.cotizaciones x where x.id = p_anterior;
    exit when ant.lead_id is not distinct from v_lead and ant.vehiculo_id is not distinct from v_vehiculo;
    if v_tomas >= 3 then
      raise exception 'La cotización cambió mientras cotizabas encima. Vuelve a intentarlo.' using errcode = 'PT409';
    end if;
  end loop;
  -- Una versión nueva viva por anterior (P3): de la que se ve, su id en el hint; de la que no, sólo que existe (P11).
  select x.id into v_enc from public.cotizaciones x where x.cotizacion_padre_id = p_anterior and x.eliminado_en is null limit 1;   -- cotizaciones_encima_unica
  if v_enc is not null and public.puede_cotizacion(v_enc, 'cotizaciones.ver') then
    raise exception 'Esta cotización ya tiene una versión nueva.' using errcode = 'PT409', detail = 'ya_tiene_encima', hint = v_enc::text;
  elsif v_enc is not null then
    raise exception 'Esta cotización ya tiene una versión nueva.' using errcode = 'PT409', detail = 'ya_tiene_encima';
  end if;

  -- El lead (ya tomado: volver a mirar) y el vehículo de la anterior.
  perform 1 from public.leads l where l.id = ant.lead_id and l.eliminado_en is null for key share;
  if not found or not public.puede_lead(ant.lead_id, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  if ant.vehiculo_id is not null then
    perform public._cotizacion_vehiculo(ant.vehiculo_id);
  else
    select coalesce((select e.vehiculo_obligatorio_al_cotizar from public.ajustes_empresa e where e.id = 1), true) into v_obligatorio;
    if v_obligatorio then
      raise exception 'Elige el vehículo de la cotización.' using errcode = '22023', hint = 'vehiculo';
    end if;
  end if;

  -- La publicada de hoy, `for share` (como en `cotizacion_crear`).
  loop
    v_vuelta := v_vuelta + 1;
    select f.id into v_formula from public.formulas f where f.origen_id = ant.origen_id and f.estado = 'publicada';
    if v_formula is null then
      perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
    end if;
    perform 1 from public.formulas f where f.id = v_formula and f.estado = 'publicada' for share;
    exit when found;
    if v_vuelta >= 3 then
      raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
    end if;
  end loop;

  -- La versión y las tarifas de hoy, con lo que se lleva de la anterior (P2: también lo que quien llama no ve); el modo de la anterior si sigue (si no, el primero de hoy) y
  -- «Ver total Bs» si hoy se ofrece. Un override llevado que el motor descarta no falla (nadie lo mandó): cuenta en `descartados`.
  select * into a from public._cotizacion_armar('{}'::jsonb, null, ant.origen_id, ant.vehiculo_id, v_formula);
  v_lleva := public._cotizacion_lo_que_se_lleva(a.definicion, a.entrada, ant.valores, ant.fuentes);
  select coalesce((select m ->> 'clave' from jsonb_array_elements(coalesce(f.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) m where m ->> 'clave' = ant.modo_tc),
                  case when ant.modo_tc is not null then f.diseno -> 'cabecera' -> 'modos' -> 0 ->> 'clave' end),
         ant.ver_total_bs and coalesce((f.diseno -> 'cabecera' ->> 'ver_total_bs')::boolean, false)
    into v_modo_tc, v_bs from public.formulas f where f.id = v_formula;
  v_res := public.evaluar_formula(a.definicion, a.params, v_lleva, public._cotizacion_modo(v_formula, v_modo_tc));
  v_total_base := public._cotizacion_guardable(v_res, '{}'::jsonb);
  v_desc := public._cotizacion_descartados((select f.definicion from public.formulas f where f.id = ant.formula_id),
                                           coalesce(array(select n.nodo from public._nodos_visibles(ant.formula_id) n), '{}'), ant.valores, ant.fuentes, v_lleva, v_res);

  begin
    insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, clase, formula_id, valores, fuentes, tipos_cambio, totales, total_base, modo_tc, ver_total_bs,
                                     titulo, notas, cotizacion_padre_id, version)
    values (p_id, ant.origen_id, ant.lead_id, ant.vehiculo_id, v_yo, 'preventa', v_formula, v_res -> 'valores', coalesce(v_res -> 'fuentes', '{}'::jsonb), a.entrada -> 'tipos_cambio',
            v_res -> 'totales', v_total_base, v_modo_tc, v_bs, ant.titulo, ant.notas, p_anterior, ant.version + 1)
    returning * into c;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'cotizaciones_pkey' then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    elsif v_constraint = 'cotizaciones_encima_unica' then
      raise exception 'Esta cotización ya tiene una versión nueva.' using errcode = 'PT409', detail = 'ya_tiene_encima';
    end if;
    raise;
  end;

  return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', false, 'descartados', v_desc);
end $$;


REVOKE ALL ON FUNCTION "public"."cotizacion_encima"("p_id" "uuid", "p_anterior" "uuid") FROM PUBLIC, "anon";
GRANT ALL ON FUNCTION "public"."cotizacion_encima"("p_id" "uuid", "p_anterior" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cotizacion_encima"("p_id" "uuid", "p_anterior" "uuid") TO "service_role";
