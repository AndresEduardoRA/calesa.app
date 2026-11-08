-- Marcar o crear otra final no se lleva una cotización con comprobante (paso 4.26-1, P7 a de la persona, 2026-11-08).
--
-- `_final_aplicar` (la de `…_final_marcar.sql`, que llaman `cotizacion_marcar_final` y `cotizacion_crear` con clase final) bajaba la final anterior del
-- vehículo a preventa y mandaba las preventas tomadas a la papelera con un `update` directo, sin pasar por `_cotizacion_a_papelera`: la final con su
-- comprobante vigente terminaba en la papelera, bloqueada en la purga para siempre. Ahora, con las filas ya tomadas por quien llama:
--   0. si otra de las tomadas tiene un comprobante vigente, 23514 «La final actual tiene un comprobante vigente: anúlalo antes de marcar otra final.»;
--   3. las que tienen sólo comprobantes anulados bajan a preventa y quedan vivas (la venta se deshizo y el vehículo puede venderse otra vez).
-- Misma firma y privilegios. Pruebas: E6 de `supabase/tests/areas/comprobantes/final.sql` y K7 de `areas/comprobantes/carreras-papelera.mjs`.

create or replace function public._final_aplicar(c public.cotizaciones, p_tomadas uuid[]) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare v_ids uuid[]; v_lote uuid; v_n int := 0; v_lead uuid; v_es_cliente boolean; v_tipo uuid; v_a_cliente boolean := false;
begin
  -- 0. (4.26-1, P7 a) Una tomada con un comprobante vigente no se reemplaza: hay que anularlo antes. Quien llama ya tomó esas filas y emitir toma la misma
  --    fila de la cotización, así que no se cuela un comprobante entre esta mirada y los `update`. El texto no dice cuál (su serie y su número): el
  --    inventario del número global de los leads tomaría a esta ayudante, y a quienes la llaman, por una fuente. La pantalla lo muestra en «Comprobantes».
  if exists (select 1 from public.comprobantes cp where cp.cotizacion_id = any (p_tomadas) and cp.cotizacion_id <> c.id and cp.anulado_en is null) then
    raise exception 'La final actual tiene un comprobante vigente: anúlalo antes de marcar otra final.' using errcode = '23514';
  end if;
  -- 1. La final anterior baja a preventa sólo si se tomó en la pasada: por id, nunca por el vehículo (una final que se confirmó después da 23505 en el paso 2).
  update public.cotizaciones x set clase = 'preventa'
   where x.id = any (p_tomadas) and x.id <> c.id and x.clase = 'final' and x.eliminado_en is null;
  -- 2. La cotización, final (una que ya lo es no se toca).
  update public.cotizaciones x set clase = 'final' where x.id = c.id and x.clase <> 'final';
  -- 3. Las preventas tomadas (con la que bajó), a un lote de la papelera de quien marca, como `_cotizacion_a_papelera`. Una con comprobante (sólo anulados, por
  --    el paso 0) baja y queda viva: ninguna cotización con comprobante entra a la papelera (4.26-1, P7 a).
  v_ids := array(select x.id from public.cotizaciones x
                  where x.id = any (p_tomadas) and x.id <> c.id and x.clase = 'preventa' and x.eliminado_en is null
                    and not exists (select 1 from public.comprobantes cp where cp.cotizacion_id = x.id)
                  order by x.id);
  v_n := coalesce(array_length(v_ids, 1), 0);
  if v_n > 0 then
    insert into public.lotes_papelera (tipo, creado_por) values ('cotizaciones', (select auth.uid())) returning id into v_lote;
    update public.cotizaciones x set eliminado_en = now(), eliminado_por = (select auth.uid()), lote_papelera_id = v_lote where x.id = any (v_ids);
    update public.lotes_papelera l set resumen = jsonb_build_object('cantidad', v_n, 'restaurados', 0, 'purgados', 0) where l.id = v_lote;
    perform public._lote_papelera_tocar(v_lote);
    perform public.registrar_actividad('papelera.enviado', 'lotes_papelera', v_lote::text, null, jsonb_build_object('tipo', 'cotizaciones', 'cantidad', v_n));
  end if;
  -- 4. El vínculo (el historial lo escribe su trigger). Cinturón: si ya es de otro lead, el 23514 de P4 a; si ya es de éste, no se escribe.
  update public.vehiculos v set lead_id = c.lead_id where v.id = c.vehiculo_id and v.lead_id is null;
  if not found then
    select v.lead_id into v_lead from public.vehiculos v where v.id = c.vehiculo_id;
    if v_lead is distinct from c.lead_id then
      raise exception 'Este vehículo está vinculado a otro lead. Desvincúlalo antes de marcar la final.' using errcode = '23514';
    end if;
  end if;
  -- 5. El lead, a cliente: al primer tipo activo de esa clase por orden y nombre (el orden de `_tipo_lead_por_defecto`), si no era de esa clase.
  select t.clase = 'cliente' into v_es_cliente from public.leads l join public.tipos_lead t on t.id = l.tipo_lead_id where l.id = c.lead_id;
  if not coalesce(v_es_cliente, false) then
    select t.id into v_tipo from public.tipos_lead t where t.clase = 'cliente' and t.activo order by t.orden, t.nombre limit 1;
    if v_tipo is null then
      raise exception 'No hay un tipo de lead activo de la clase cliente.' using errcode = '23514';
    end if;
    update public.leads l set tipo_lead_id = v_tipo where l.id = c.lead_id;
    v_a_cliente := true;
  end if;
  -- 6. La actividad.
  perform public.registrar_actividad('cotizacion.final', 'cotizaciones', c.id::text, null,
    jsonb_build_object('vehiculo', c.vehiculo_id, 'preventas_a_papelera', v_n, 'lead_a_cliente', v_a_cliente));
end;
$$;

comment on function public._final_aplicar(public.cotizaciones, uuid[]) is 'Los efectos de marcar final, llamado con todo tomado (el lead, el vehículo y las cotizaciones p_tomadas): si otra tomada tiene un comprobante vigente, 23514 (4.26-1); la final anterior tomada baja a preventa, c pasa a final, las preventas tomadas sin comprobante van a un lote de la papelera de quien llama (con uno anulado bajan y quedan vivas), el vehículo sin lead queda con el de c (con otro lead, 23514), el lead pasa al primer tipo activo de la clase cliente y la actividad. No toma candados y escribe cotizaciones sólo por id. De nadie: lo llama cotizacion_marcar_final (y el 4.25-1b, cotizacion_crear).';
revoke all on function public._final_aplicar(public.cotizaciones, uuid[]) from public, anon, authenticated;
grant execute on function public._final_aplicar(public.cotizaciones, uuid[]) to service_role;
