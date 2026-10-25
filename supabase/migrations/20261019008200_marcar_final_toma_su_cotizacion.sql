-- `cotizacion_marcar_final()` toma su cotización antes de leerla (paso 4.10, prompt 3; adelanto mínimo del 4.25).
--
-- Leía la cotización sin candado y con esa copia decidía todo: a qué vehículo vincular el lead, qué preventas mandar a la papelera y qué finales volver preventa. Desde el prompt 3
-- `cotizacion_guardar()` puede cambiarle el vehículo a una cotización: si lo cambia mientras esta función espera (su `update` de la clase espera a la fila), la función seguía
-- con el vehículo viejo, vinculaba el lead al viejo, mandaba a la papelera las preventas del viejo y dejaba la cotización final en el nuevo, que podía chocar con el índice de «una final
-- por vehículo» con un error en crudo. Ahora la toma `for no key update` (Postgres vuelve a evaluar la fila si cambió mientras esperaba, así que se lee la de ahora), y las preventas del
-- vehículo también se toman (y sólo quedan las que siguen en ese vehículo cuando se las tiene): una preventa que `cotizacion_guardar()` acaba de mover a otro vehículo no se manda a la papelera.
-- Orden de candados: la cotización antes que sus hermanas, como `cotizacion_guardar()`. Todo lo demás sigue igual (4-17 y el orden vehículo → lead son del 4.25).

create or replace function public.cotizacion_marcar_final(p_cotizacion uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.cotizaciones; v_ids uuid[];
begin
  select * into c from public.cotizaciones where id = p_cotizacion and eliminado_en is null for no key update;
  if c.id is null then raise exception 'Cotización inexistente.' using errcode = '22023'; end if;
  perform public.assert_permiso('cotizaciones.final.gestionar', c.origen_id);
  if c.vehiculo_id is null then raise exception 'Una final exige vehículo vinculado.' using errcode = '23514'; end if;
  update public.cotizaciones set clase = 'preventa' where vehiculo_id = c.vehiculo_id and clase = 'final' and id <> c.id and eliminado_en is null;
  update public.cotizaciones set clase = 'final' where id = c.id;
  select array_agg(x.id) into v_ids
    from (select z.id from public.cotizaciones z where z.vehiculo_id = c.vehiculo_id and z.clase = 'preventa' and z.eliminado_en is null order by z.id for no key update) x;
  if v_ids is not null then perform public.papelera_enviar('cotizaciones', v_ids); end if;
  if c.lead_id is not null then update public.vehiculos set lead_id = c.lead_id where id = c.vehiculo_id and lead_id is null; end if;
  perform public.registrar_actividad('cotizacion.final', 'cotizaciones', c.id::text, null, jsonb_build_object('vehiculo', c.vehiculo_id, 'preventas_a_papelera', coalesce(array_length(v_ids, 1), 0)));
end;
$$;
