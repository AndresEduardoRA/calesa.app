-- Purgar un vehículo o un lead que nombra una cotización de la papelera queda bloqueado: el `on delete set null` le quitaría el vehículo o el cliente a algo
-- que todavía se puede restaurar, y a una final sin vehículo `cotizacion_validar` la rechaza con 23514, que hacía caer la purga entera del lote. Las
-- cotizaciones del propio lote de un vehículo no frenan: se purgan con él. Enviar a la papelera no las mira. Su prueba:
-- supabase/tests/areas/papelera/purga-con-cotizacion.sql.

-- Las cotizaciones de la papelera por vehículo: la purga y la lista de la papelera de vehículos lo preguntan por fila.
CREATE INDEX "cotizaciones_vehiculo_papelera_idx" ON "public"."cotizaciones" USING "btree" ("vehiculo_id") WHERE ("eliminado_en" IS NOT NULL);

CREATE OR REPLACE FUNCTION "public"."_vehiculo_motivo_de_bloqueo"("v" "public"."vehiculos", "p_al_enviar" boolean) RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_fase public.fases;
begin
  if v.lead_id is not null then
    return 'Está vinculado a un lead. Quita el vínculo antes.';
  end if;
  if p_al_enviar and v.fase_id is not null then
    select * into v_fase from public.fases f where f.id = v.fase_id;
    if not v_fase.es_inicial then
      return format('Está en «%s». Sólo va a la papelera lo que sigue en su fase inicial.', v_fase.nombre);
    end if;
  end if;
  if exists (select 1 from public.comprobantes cp join public.cotizaciones c on c.id = cp.cotizacion_id where c.vehiculo_id = v.id) then
    return 'Tiene un comprobante emitido.';
  end if;
  -- Una final activa y viva (cotizaciones_final_por_vehiculo), también sin lead; después del comprobante, que no deja mandarla a la papelera.
  -- En la papelera ninguna está viva: se fueron con el vehículo.
  if exists (select 1 from public.cotizaciones c
              where c.vehiculo_id = v.id and c.clase = 'final' and c.estado = 'activa' and c.eliminado_en is null) then
    return 'Tiene una cotización final. Mándala a la papelera antes.';
  end if;
  -- Purgar frena con una cotización de otro lote de la papelera que lo nombra (cotizaciones_vehiculo_papelera_idx): las de su lote se purgan con él.
  if not p_al_enviar and exists (select 1 from public.cotizaciones c
                                  where c.vehiculo_id = v.id and c.eliminado_en is not null
                                    and c.lote_papelera_id is distinct from v.lote_papelera_id) then
    return 'Tiene una cotización en la papelera. Púrgala antes.';
  end if;
  -- Enviar a la papelera (y la limpieza, que pregunta con p_al_enviar) frena con documentos vivos: los cargó alguien y son de la logística. La purga
  -- de lo que ya está en la papelera no frena: junta sus rutas y las encola para limpiar (`_papelera_purgar_vehiculos`), como siempre.
  if p_al_enviar and exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.eliminado_en is null) then
    return 'Tiene documentos cargados.';
  end if;
  if exists (select 1 from public.pagos p where p.vehiculo_id = v.id) or exists (select 1 from public.gastos g where g.vehiculo_id = v.id) then
    return 'Tiene pagos o gastos registrados.';
  end if;
  if exists (select 1 from public.declaraciones_vehiculos d where d.vehiculo_id = v.id and d.removido_en is null) then
    return 'Está en una declaración aduanera.';
  end if;
  if exists (select 1 from public.repuestos_proyectos r where r.vehiculo_id = v.id and r.eliminado_en is null) then
    return 'Tiene un proyecto de repuestos.';
  end if;
  return null;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."_lead_motivo_de_bloqueo"("l" "public"."leads", "p_al_enviar" boolean) RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if exists (select 1 from public.vehiculos v where v.lead_id = l.id and (not p_al_enviar or v.eliminado_en is null)) then
    if not p_al_enviar then
      return 'Tiene un vehículo vinculado: desvincúlalo antes de purgarlo.';
    end if;
    if exists (select 1 from public.vehiculos v where v.lead_id = l.id and v.eliminado_en is null
                and not public.puede_vehiculo(v.id, 'vehiculos.ver')) then
      return 'Tiene un vehículo vinculado que no ves: quien lo gestiona tiene que desvincularlo antes.';
    end if;
    return 'Tiene un vehículo vinculado: desvincúlalo en «Vehículos» antes de enviarlo.';
  end if;
  if not p_al_enviar then
    if exists (select 1 from public.pagos p where p.lead_id = l.id) then
      return 'Tiene pagos registrados.';
    end if;
    if exists (select 1 from public.accesos_portal a where a.lead_id = l.id and a.habilitado) then
      return 'Tiene el acceso al portal vigente.';
    end if;
    -- Una cotización de la papelera que lo nombra (cotizaciones_lead_creado_idx); a una viva el `set null` la deja sin cliente, como siempre.
    if exists (select 1 from public.cotizaciones c where c.lead_id = l.id and c.eliminado_en is not null) then
      return 'Tiene una cotización en la papelera. Púrgala antes.';
    end if;
  end if;
  return null;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."_papelera_purgar_leads"("p_lote" "uuid", "p_leads" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  x public.leads; v_motivo text; v_quedan int; v_version timestamptz;
  v_purgados jsonb := '[]'::jsonb; v_bloqueados jsonb := '[]'::jsonb;
  v_ve boolean := public.tiene_permiso('leads.numero_global.ver');
begin
  for x in
    select * from public.leads y
    where y.lote_papelera_id = p_lote and y.eliminado_en is not null and (p_leads is null or y.id = any (p_leads))
    order by y.id for update
  loop
    -- Sus cotizaciones, tomadas antes de mirar (lead → cotizaciones, el orden de candados; las mismas filas que el `set null` toma al borrar): una que
    -- otro manda a la papelera mientras tanto se ve aquí y frena, en vez de quedarse sin cliente.
    perform 1 from public.cotizaciones c where c.lead_id = x.id order by c.id for no key update;
    v_motivo := public._lead_motivo_de_bloqueo(x, false);
    if v_motivo is null then
      begin
        delete from public.leads y where y.id = x.id;
        v_purgados := v_purgados || (jsonb_build_object('id', x.id, 'nombre', x.nombre) || public._lead_numeros(x, v_ve));
      exception when foreign_key_violation or check_violation then
        v_motivo := 'Otros registros dependen de él.';
      end;
    end if;
    if v_motivo is not null then
      v_bloqueados := v_bloqueados || (jsonb_build_object('id', x.id, 'nombre', x.nombre, 'motivo', v_motivo) || public._lead_numeros(x, v_ve));
    end if;
  end loop;

  select count(*) into v_quedan from public.leads y where y.lote_papelera_id = p_lote and y.eliminado_en is not null;
  if jsonb_array_length(v_purgados) = 0 then
    return jsonb_build_object('actualizado_en', (select z.actualizado_en from public.lotes_papelera z where z.id = p_lote),
      'purgados', v_purgados, 'bloqueados', v_bloqueados, 'quedan', v_quedan);
  end if;
  update public.lotes_papelera z
  set resumen = z.resumen || jsonb_build_object('purgados', coalesce((z.resumen ->> 'purgados')::int, 0) + jsonb_array_length(v_purgados)),
      purgado_en = case when v_quedan = 0 then now() else z.purgado_en end
  where z.id = p_lote;
  v_version := public._lote_papelera_tocar(p_lote);
  perform public.registrar_actividad('papelera.purgado', 'lotes_papelera', p_lote::text, null, null,
    jsonb_build_object('tipo', 'leads', 'cantidad', jsonb_array_length(v_purgados), 'automatica', (select auth.uid()) is null));
  return jsonb_build_object('actualizado_en', v_version, 'purgados', v_purgados, 'bloqueados', v_bloqueados, 'quedan', v_quedan);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."_papelera_purgar_vehiculos"("p_lote" "uuid", "p_vehiculos" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v public.vehiculos; v_motivo text; v_fotos text[]; v_documentos text[]; v_adjuntos text[]; v_quedan int; v_version timestamptz;
  v_purgados jsonb := '[]'::jsonb; v_bloqueados jsonb := '[]'::jsonb;
begin
  for v in
    select * from public.vehiculos x
    where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_vehiculos is null or x.id = any (p_vehiculos))
    order by x.id for update
  loop
    v_motivo := public._vehiculo_motivo_de_bloqueo(v, false);
    if v_motivo is null then
      begin
        select array_agg(distinct r) into v_fotos from (
          select unnest(array[i.ruta, i.ruta_miniatura]) as r from public.vehiculos_imagenes i where i.vehiculo_id = v.id
          union all
          select o.name from storage.objects o where o.bucket_id = 'vehiculos' and o.name like v.id::text || '/%'
          union all
          select c.ruta from public.cola_gc_storage c where c.bucket = 'vehiculos' and c.ruta like v.id::text || '/%' and c.reclamado_en is null
        ) x;
        select array_agg(d.ruta) into v_documentos from public.documentos d where d.vehiculo_id = v.id and d.ruta is not null;
        select array_agg(a.ruta) into v_adjuntos
        from public.cotizaciones_adjuntos a join public.cotizaciones c on c.id = a.cotizacion_id
        where c.vehiculo_id = v.id and c.lote_papelera_id = p_lote;

        delete from public.cotizaciones c where c.vehiculo_id = v.id and c.lote_papelera_id = p_lote;
        delete from public.vehiculos x where x.id = v.id;

        perform public._encolar_para_limpiar('vehiculos', v_fotos, true);
        perform public._encolar_para_limpiar('documentos', v_documentos, false);
        perform public._encolar_para_limpiar('cotizaciones', v_adjuntos, false);
        v_purgados := v_purgados || jsonb_build_object('id', v.id, 'numero', v.numero, 'titulo', v.titulo);
      -- La red por si otra tabla suma un `check` sobre una FK `set null`: el vehículo queda bloqueado y el lote sigue.
      exception when foreign_key_violation or check_violation then
        v_motivo := 'Otros registros dependen de él.';
      end;
    end if;
    if v_motivo is not null then
      v_bloqueados := v_bloqueados || jsonb_build_object('id', v.id, 'numero', v.numero, 'titulo', v.titulo, 'motivo', v_motivo);
    end if;
  end loop;

  select count(*) into v_quedan from public.vehiculos x where x.lote_papelera_id = p_lote and x.eliminado_en is not null;
  if jsonb_array_length(v_purgados) = 0 then
    return jsonb_build_object('actualizado_en', (select l.actualizado_en from public.lotes_papelera l where l.id = p_lote),
      'purgados', v_purgados, 'bloqueados', v_bloqueados, 'quedan', v_quedan);
  end if;
  update public.lotes_papelera l
  set resumen = l.resumen || jsonb_build_object('purgados', coalesce((l.resumen ->> 'purgados')::int, 0) + jsonb_array_length(v_purgados)),
      purgado_en = case when v_quedan = 0 then now() else l.purgado_en end
  where l.id = p_lote;
  v_version := public._lote_papelera_tocar(p_lote);
  perform public.registrar_actividad('papelera.purgado', 'lotes_papelera', p_lote::text, null, null,
    jsonb_build_object('cantidad', jsonb_array_length(v_purgados), 'automatica', (select auth.uid()) is null));
  return jsonb_build_object('actualizado_en', v_version, 'purgados', v_purgados, 'bloqueados', v_bloqueados, 'quedan', v_quedan);
end;
$$;
