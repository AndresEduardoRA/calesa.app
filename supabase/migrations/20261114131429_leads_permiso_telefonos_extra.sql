-- Permiso propio para agregar, rotular y quitar los teléfonos extra de un lead (clase 1: cartera y permiso).
-- Cambiar el principal sigue pidiendo `leads.editar`. A quien hoy puede editar leads se le concede el nuevo con el
-- mismo alcance y origen: nadie pierde nada.

insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden)
values ('leads.telefonos_extra.editar', 'leads', 'Editar teléfonos extra',
        'Agregar, rotular y quitar los teléfonos extra de los leads de mi cartera', false, true,
        'lead_telefono_guardar, lead_telefono_quitar, verificar_telefono_extra', 165)
on conflict (clave) do update
  set modulo = excluded.modulo, nombre = excluded.nombre, descripcion = excluded.descripcion, por_origen = excluded.por_origen,
      con_alcance = excluded.con_alcance, aplicado_en = excluded.aplicado_en, orden = excluded.orden;

insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
select rp.rol_id, 'leads.telefonos_extra.editar', rp.origen_id, rp.alcance
  from public.roles_permisos rp
 where rp.permiso_clave = 'leads.editar'
on conflict do nothing;

create or replace function public.lead_telefono_guardar(p_lead uuid, p_id uuid, p_cc text, p_tel text, p_etiqueta text DEFAULT NULL::text, p_creado_en timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  l public.leads;
  t public.leads_telefonos;
  v_cc text;
  v_tel text;
  v_etiqueta text;
  v_msg text;
begin
  l := public._lead_mio(p_lead, 'leads.telefonos_extra.editar', true);
  if p_id is null then
    raise exception 'Falta el identificador del teléfono.' using errcode = '22023';
  end if;
  v_etiqueta := nullif(btrim(coalesce(p_etiqueta, '')), '');
  if char_length(v_etiqueta) > 40 then
    raise exception 'La etiqueta admite hasta 40 caracteres.' using errcode = '22023', hint = 'etiqueta';
  end if;
  v_cc := coalesce(nullif(btrim(p_cc), ''), (select e.telefono_cc from public.ajustes_empresa e where e.id = 1));
  begin
    v_tel := public.normalizar_telefono(v_cc, p_tel);
  exception when sqlstate '22023' then
    get stacked diagnostics v_msg = message_text;
    raise exception '%', v_msg using errcode = '22023', hint = 'telefono';
  end;

  select * into t from public.leads_telefonos x where x.id = p_id;
  if found then
    if t.lead_id <> l.id then
      raise exception 'No pudimos guardar este teléfono. Vuelve a intentarlo.' using errcode = '22023';
    end if;
    if t.telefono <> v_tel then
      raise exception 'Para cambiar el número, quita este teléfono y agrega el nuevo.'
        using errcode = '22023', hint = 'telefono';
    end if;
    if t.etiqueta is distinct from v_etiqueta then
      update public.leads_telefonos x set etiqueta = v_etiqueta where x.id = t.id;
      perform public.registrar_actividad('lead.telefono_extra_rotulado', 'leads', l.id::text, null, null,
        jsonb_build_object('telefono', public.enmascarar_telefono(v_tel)));
      return public._lead_telefonos_estado(l.id, 'rotulado');
    end if;
    return public._lead_telefonos_estado(l.id, 'sin_cambios');
  end if;

  if v_tel = l.telefono_principal
     or exists (select 1 from public.leads_telefonos x where x.lead_id = l.id and x.telefono = v_tel) then
    raise exception 'Ese número ya está en este lead.' using errcode = '22023', hint = 'telefono';
  end if;
  if (select count(*) from public.leads_telefonos x where x.lead_id = l.id) >= 10 then
    raise exception 'Un lead admite hasta 10 teléfonos extra. Quita uno para agregar otro.'
      using errcode = '22023', hint = 'telefono';
  end if;
  insert into public.leads_telefonos (id, lead_id, telefono, etiqueta, creado_en)
  values (p_id, l.id, v_tel, v_etiqueta, least(coalesce(p_creado_en, now()), now()));
  perform public.registrar_actividad('lead.telefono_extra_agregado', 'leads', l.id::text, null, null,
    jsonb_build_object('telefono', public.enmascarar_telefono(v_tel)));
  return public._lead_telefonos_estado(l.id, 'agregado');
end;
$$;

revoke all on function public.lead_telefono_guardar(p_lead uuid, p_id uuid, p_cc text, p_tel text, p_etiqueta text, p_creado_en timestamp with time zone) from public, anon;
grant execute on function public.lead_telefono_guardar(p_lead uuid, p_id uuid, p_cc text, p_tel text, p_etiqueta text, p_creado_en timestamp with time zone) to authenticated, service_role;

create or replace function public.lead_telefono_quitar(p_lead uuid, p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  l public.leads;
  t public.leads_telefonos;
begin
  l := public._lead_mio(p_lead, 'leads.telefonos_extra.editar', true);
  delete from public.leads_telefonos x where x.id = p_id and x.lead_id = l.id returning * into t;
  if not found then
    return public._lead_telefonos_estado(l.id, 'sin_cambios') || jsonb_build_object('quitado', null);
  end if;
  perform public.registrar_actividad('lead.telefono_extra_quitado', 'leads', l.id::text, null, null,
    jsonb_build_object('telefono', public.enmascarar_telefono(t.telefono)));
  return public._lead_telefonos_estado(l.id, 'quitado') || jsonb_build_object('quitado',
    jsonb_build_object('id', t.id, 'telefono', t.telefono, 'etiqueta', t.etiqueta, 'creado_en', t.creado_en));
end;
$$;

revoke all on function public.lead_telefono_quitar(p_lead uuid, p_id uuid) from public, anon;
grant execute on function public.lead_telefono_quitar(p_lead uuid, p_id uuid) to authenticated, service_role;

