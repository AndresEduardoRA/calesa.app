-- No cambiar el vínculo de un vehículo con cotización final (paso 4.25-1, P5 a de la persona, 2026-11-07).
--
-- `vehiculo_vincular` desvinculaba o reemplazaba el lead de un vehículo con una final activa: la final quedaba de un lead y el vehículo de otro (o de
-- nadie). Ahora, con el vehículo tomado, después de «sin cambios» y de la versión y antes de la regla de reemplazar: si el vehículo tiene una final activa
-- y viva con lead y el pedido es otro (desvincular o reemplazar), 23514. Se compara con el lead de la final, no con el del vehículo: con un dato viejo (la
-- final de L1, el vehículo de L2) desvincular o pasar a L3 frenan y pasar a L1 vuelve a dejarlo coherente. Una final en la papelera, reportada, inválida o
-- sin lead (lo purgaron) no frena. La consulta va por `cotizaciones_final_por_vehiculo`. Marcar final toma el vehículo `for key share` y vincular `for
-- update`: no se cruzan a medias. Pruebas: `supabase/tests/areas/final/ancla-y-desvincular.sql` (A3).

create or replace function public.vehiculo_vincular(p_vehiculo uuid, p_actualizado_en_esperado timestamptz, p_lead uuid) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare v public.vehiculos; v_resultado text; v_lead_de_la_final uuid;
begin
  perform public.assert_activo();
  -- Primero se mira, sin bloquear: lo que no se ve (también la papelera y lo inexistente) da lo mismo.
  if p_vehiculo is null or not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
    raise exception 'Ese vehículo no existe o no tienes acceso.' using errcode = '42501';
  end if;
  if not public.puede_vehiculo(p_vehiculo, 'vehiculos.editar') then
    raise exception 'No tienes permiso para editar este vehículo.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;
  -- Vincular le da el vehículo a la cartera de ese lead: exige tenerlo en la propia. El lead se bloquea
  -- (y se vuelve a mirar) antes que el vehículo: así la papelera, que bloquea el lead, no lo envía con un
  -- vínculo a medio escribir. Desvincular (p_lead nulo) es una acción sobre el vehículo.
  if p_lead is not null then
    perform public._lead_mio(p_lead, 'leads.editar', true);
  end if;
  select * into v from public.vehiculos x where x.id = p_vehiculo and x.eliminado_en is null for update;
  -- Con el vehículo bloqueado se vuelve a mirar: pudo irse a la papelera, o perderse el lead que daba el acceso.
  if not found or not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
    raise exception 'Ese vehículo no existe o no tienes acceso.' using errcode = '42501';
  end if;
  if not public.puede_vehiculo(p_vehiculo, 'vehiculos.editar') then
    raise exception 'No tienes permiso para editar este vehículo.' using errcode = '42501';
  end if;
  -- Ya está como se pidió: un reintento no choca consigo mismo.
  if v.lead_id is not distinct from p_lead then
    return jsonb_build_object('resultado', 'sin_cambios', 'actualizado_en', v.actualizado_en, 'limpieza_el', public.limpieza_el(v));
  end if;
  if v.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('vehiculos', v.id, v.actualizado_en, 'este vehículo');
  end if;
  -- Con una cotización final activa (con lead), el vínculo es el de la final: no se desvincula ni se pasa a otro (P5 a, 4.25-1).
  select c.lead_id into v_lead_de_la_final from public.cotizaciones c
   where c.vehiculo_id = v.id and c.clase = 'final' and c.estado = 'activa' and c.eliminado_en is null and c.lead_id is not null
   limit 1;   -- cotizaciones_final_por_vehiculo
  if v_lead_de_la_final is not null and p_lead is distinct from v_lead_de_la_final then
    raise exception 'Este vehículo tiene una cotización final: su vínculo no cambia. Para cambiarlo, manda la final a la papelera.'
      using errcode = '23514';
  end if;
  -- Reemplazar le quita el vehículo a la cartera del lead actual: sólo quien también lo tiene en la suya
  -- (y puede nombrarlo). Si no, se desvincula primero, desde el vehículo. No se dice cuál es.
  if p_lead is not null and v.lead_id is not null and not public.puede_actuar_lead(v.lead_id, 'leads.editar') then
    raise exception 'Este vehículo ya está vinculado a otro lead. Para cambiarlo, desvincúlalo desde la ficha del vehículo.'
      using errcode = '23514';
  end if;
  v_resultado := case when p_lead is null then 'desvinculado' when v.lead_id is null then 'vinculado' else 'reemplazado' end;
  update public.vehiculos x set lead_id = p_lead where x.id = v.id returning * into v;
  return jsonb_build_object('resultado', v_resultado, 'actualizado_en', v.actualizado_en, 'limpieza_el', public.limpieza_el(v));
end;
$$;

-- `create or replace` conserva los privilegios de la base; se repiten explícitos (redundante a propósito).
revoke all on function public.vehiculo_vincular(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.vehiculo_vincular(uuid, timestamptz, uuid) to authenticated, service_role;
