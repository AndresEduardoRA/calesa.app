-- Un vehículo con una cotización final activa y viva no va a la papelera aunque no esté vinculado: purgar el lead de la final deja la final y el vehículo
-- sin lead, y el vínculo ya no frenaba. El predicado es el de `cotizaciones_final_por_vehiculo` (el mismo ancla de `_limpieza_ancla`). Enviar toma el
-- vehículo `for update` antes de mirar y marcar o crear una final lo toman `for key share`: se esperan. Su prueba: supabase/tests/areas/papelera/vehiculo-con-final.sql.

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
