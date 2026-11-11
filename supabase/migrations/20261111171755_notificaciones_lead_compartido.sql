-- Compartir un lead avisa a quien lo recibe (paso 7.01-2): `lead_compartir` (misma firma) es la de la base sin cambios, salvo el aviso
-- `lead_compartido` por `notificar()` después de escribir la cartera, y sólo cuando el resultado es `compartido` (las dos ramas `sin_cambios`
-- no avisan). Ningún título ni cuerpo lleva teléfono, número ni nombre del lead (un lead puede llamarse como su teléfono, y el aviso queda
-- después de que le quiten el acceso): el lead se abre por la `ruta`. Volver a compartir reemplaza el aviso abierto de antes. La puerta de la
-- tabla descarta a quien no puede recibir sin hacer fallar la operación.
-- Lo prueba `supabase/tests/areas/notificaciones/avisos-de-cartera.sql` (A1–A3).

create or replace function public.lead_compartir(p_lead uuid, p_usuario uuid) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare l public.leads; v_dueno uuid; v_alcance public.alcance_permiso; v_yo uuid := (select auth.uid());
begin
  l := public._lead_para_mover(p_lead);
  v_dueno := public._lead_dueno(l.id);
  v_alcance := public.alcance_de('leads.compartir');
  if v_alcance is null then
    raise exception 'No tienes permiso para compartir este lead.' using errcode = '42501';
  end if;
  if v_alcance <> 'todos' and v_dueno is distinct from v_yo then
    raise exception 'Sólo quien es dueño del lead lo comparte.' using errcode = '42501';
  end if;
  -- Nadie se da acceso a sí mismo: si ya lo tiene no pasa nada, si no, no se lo puede dar.
  if p_usuario = v_yo then
    if public.en_cartera(l.id) then
      return jsonb_build_object('resultado', 'sin_cambios', 'cartera', public._lead_cartera_json(l.id));
    end if;
    raise exception 'No puedes darte acceso a un lead que no tienes.' using errcode = '42501', hint = 'usuario';
  end if;
  perform public._lead_destino_validar(p_usuario);
  if exists (select 1 from public.leads_asesores a where a.lead_id = l.id and a.usuario_id = p_usuario and a.revocado_en is null) then
    return jsonb_build_object('resultado', 'sin_cambios', 'cartera', public._lead_cartera_json(l.id));
  end if;
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por)
  values (l.id, p_usuario, 'compartido', v_yo)
  on conflict (lead_id, usuario_id) do update set tipo_acceso = 'compartido', revocado_en = null, revocado_por = null,
    compartido_por = excluded.compartido_por, desde = now();
  perform public.registrar_actividad('lead.compartido', 'leads', l.id::text, null, jsonb_build_object('con', p_usuario));
  -- El aviso a quien recibe: sin teléfono, número ni nombre del lead; el abierto de antes se reemplaza (si no, el antispam lo tragaría).
  delete from public.notificaciones n
  where n.usuario_id = p_usuario and n.tipo = 'lead_compartido' and n.referencia_id = l.id and n.accionada_en is null;
  perform public.notificar(p_usuario, 'lead_compartido',
    coalesce((select nullif(btrim(p.nombre), '') from public.perfiles p where p.id = v_yo), 'Alguien') || ' te compartió un lead',
    null, 'lead', l.id, '/leads/' || l.id, false);
  return jsonb_build_object('resultado', 'compartido', 'cartera', public._lead_cartera_json(l.id));
end;
$$;

revoke all on function public.lead_compartir(uuid, uuid) from public, anon;
grant execute on function public.lead_compartir(uuid, uuid) to authenticated, service_role;
