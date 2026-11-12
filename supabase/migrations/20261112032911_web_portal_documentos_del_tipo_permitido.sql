-- El portal del cliente muestra sólo los documentos de un tipo que hoy admite el portal (paso 6.05, C18; decisión D13).
--
-- 5.03 deja apagar «visible en el portal permitido» de un tipo sin tocar los documentos ya marcados (su D8). Se filtra en la lectura, sin tocar
-- documentos.visible_portal: volver a permitir el tipo los muestra de nuevo. portal_snapshot y portal_documento_ruta, desde su definición de la base,
-- suman `td.visible_portal_permitido`; lo demás, idéntico. Los grants no cambian (service_role).

CREATE OR REPLACE FUNCTION "web"."portal_documento_ruta"("p_lead" "uuid", "p_otorgado_en" timestamp with time zone, "p_documento" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select d.ruta from public.documentos d join public.vehiculos v on v.id = d.vehiculo_id
  join public.tipos_documento td on td.id = d.tipo_documento_id
  where d.id = p_documento and v.lead_id = p_lead and d.visible_portal and td.visible_portal_permitido and d.estado <> 'rechazado'
    and d.eliminado_en is null and v.eliminado_en is null
    and (public._portal_vigente(p_lead, p_otorgado_en)).lead_id is not null;
$$;


CREATE OR REPLACE FUNCTION "web"."portal_snapshot"("p_lead" "uuid", "p_otorgado_en" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if (public._portal_vigente(p_lead, p_otorgado_en)).lead_id is null then
    return null;
  end if;
  return jsonb_build_object(
    'cliente', (select jsonb_build_object('nombre', l.nombre) from public.leads l where l.id = p_lead),
    'asesor', (select jsonb_build_object('nombre', p.nombre, 'whatsapp', p.whatsapp_web, 'avatar', p.avatar_ruta) from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id where la.lead_id = p_lead and la.tipo_acceso = 'dueno' and la.revocado_en is null and la.usuario_id <> all ((select public._bajas_en_curso())::uuid[])),
    'vehiculos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', v.id, 'titulo', v.titulo, 'anio', v.anio, 'vin_parcial', case when v.vin is not null then left(v.vin, 3) || '•••••' || right(v.vin, 4) end,
        'imagenes', (select coalesce(jsonb_agg(i.ruta order by i.es_portada desc, i.orden), '[]'::jsonb) from public.vehiculos_imagenes i where i.vehiculo_id = v.id),
        'fase', case when f.visible_portal then jsonb_build_object('nombre', f.alias_portal, 'descripcion', f.descripcion_portal, 'desde', v.fase_desde) end,
        'linea_tiempo', (select coalesce(jsonb_agg(jsonb_build_object('nombre', fz.alias_portal, 'en', h.creado_en) order by h.creado_en), '[]'::jsonb) from public.historial_fases h join public.fases fz on fz.id = h.a_fase_id where h.vehiculo_id = v.id and fz.visible_portal),
        'embarque', (select jsonb_build_object('zarpe', t.zarpe_el, 'eta', t.eta_el, 'arribo', t.arribo_el) from public.transportes t where t.vehiculo_id = v.id),
        'documentos', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'tipo', td.nombre, 'estado', d.estado, 'fecha', d.creado_en)), '[]'::jsonb) from public.documentos d join public.tipos_documento td on td.id = d.tipo_documento_id where d.vehiculo_id = v.id and d.visible_portal and td.visible_portal_permitido and d.estado <> 'rechazado' and d.eliminado_en is null),
        'seguimientos', (select coalesce(jsonb_agg(jsonb_build_object('titulo', s.titulo, 'detalle', s.detalle_texto, 'en', s.ocurrido_en) order by s.ocurrido_en desc), '[]'::jsonb) from public.seguimientos s where s.lead_id = p_lead and s.vehiculo_id = v.id and s.visibilidad = 'publico' and s.eliminado_en is null),
        'pagos', (select coalesce(jsonb_agg(jsonb_build_object('concepto', pg.concepto, 'monto', pg.monto, 'moneda', pg.moneda, 'fecha', pg.fecha, 'confirmado', pg.confirmado) order by pg.fecha), '[]'::jsonb) from public.pagos pg where pg.vehiculo_id = v.id and pg.eliminado_en is null)
      )) from public.vehiculos v left join public.fases f on f.id = v.fase_id where v.lead_id = p_lead and v.eliminado_en is null), '[]'::jsonb),
    -- Lo «Visible para el cliente» que no sale con un vehículo suyo: sin vehículo, o de uno que no está
    -- vinculado a este lead (un interés, uno que se desvinculó). No se nombra el vehículo. Las 30 más nuevas.
    'novedades', coalesce((select jsonb_agg(jsonb_build_object('titulo', n.titulo, 'detalle', n.detalle_texto, 'en', n.ocurrido_en) order by n.ocurrido_en desc, n.id)
      from (select s.id, s.titulo, s.detalle_texto, s.ocurrido_en from public.seguimientos s
            where s.lead_id = p_lead and s.visibilidad = 'publico' and s.eliminado_en is null
              and (s.vehiculo_id is null or not exists (
                select 1 from public.vehiculos v where v.id = s.vehiculo_id and v.lead_id = p_lead and v.eliminado_en is null))
            order by s.ocurrido_en desc, s.id limit 30) n), '[]'::jsonb)
  );
end;
$$;
