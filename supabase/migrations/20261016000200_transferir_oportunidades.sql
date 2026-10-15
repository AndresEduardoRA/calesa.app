-- Transferir un lead con oportunidades (Fase 3, parte 7a). Escrito a mano.
--
-- Antes: `lead_transferir` pasaba las oportunidades abiertas del saliente al destino cambiando sólo
-- `usuario_id`: quedaban en el embudo y la etapa del saliente (con las FK compuestas de la 7a, ya ni
-- se podía). Ahora:
-- 1. Las ABIERTAS (y vivas) del saliente pasan al destino, a su embudo por defecto (creado si no tiene
--    ninguno), a la etapa abierta con el mismo nombre sin importar mayúsculas o, si no hay, a su
--    inicial. Nunca a una ganada o perdida por coincidir el nombre. Queda una fila de historial (con
--    quien transfiere) y la constancia `oportunidad.transferida`, sin montos.
-- 2. Las cerradas (ganadas, perdidas, canceladas) y las eliminadas se quedan con quien las tenía.
-- 3. El saliente queda compartido y deja de ver las que pasaron: ya no son suyas.
-- 4. Revocar, salirse y la papelera no tocan las oportunidades: la RLS las oculta mientras la persona
--    no tenga el lead, y vuelven si lo recupera. La baja las cancela (`equipo_dar_de_baja`, sin cambios).
-- Candados: el lead (como siempre) y después las oportunidades: el mismo orden que mover.

create or replace function public.lead_transferir(p_lead uuid, p_destino uuid, p_dueno_esperado uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  l public.leads; v_dueno uuid; v_alcance public.alcance_permiso; v_yo uuid := (select auth.uid()); v_nombre text;
  o public.oportunidades; v_embudo uuid; v_etapa uuid; v_movidas int := 0;
begin
  l := public._lead_para_mover(p_lead);
  v_dueno := public._lead_dueno(l.id);
  v_alcance := public.alcance_de('leads.transferir');
  if v_alcance is null then
    raise exception 'No tienes permiso para transferir este lead.' using errcode = '42501';
  end if;
  -- Ya está como se pidió: un reintento tras perder la respuesta no choca consigo mismo.
  if v_dueno is not null and v_dueno = p_destino then
    return jsonb_build_object('resultado', 'sin_cambios', 'dueno', v_dueno, 'cartera', public._lead_cartera_json(l.id),
      'oportunidades', 0);
  end if;
  if v_alcance <> 'todos' and v_dueno is distinct from v_yo then
    raise exception 'Sólo quien es dueño del lead lo transfiere.' using errcode = '42501';
  end if;
  -- Nadie se concede un lead que no es suyo, ni como destino: ni la supervisión ni un compartido.
  if p_destino = v_yo then
    raise exception 'No puedes transferirte un lead que no es tuyo.' using errcode = '42501', hint = 'usuario';
  end if;
  perform public._lead_destino_validar(p_destino);
  if p_dueno_esperado is distinct from v_dueno then
    select nullif(btrim(p.nombre), '') into v_nombre from public.perfiles p where p.id = v_dueno;
    raise exception 'Este lead cambió de dueño: ahora lo tiene %. Recarga para ver quién lo tiene.',
      case when v_dueno = v_yo then 'tú' else coalesce(v_nombre, 'otra persona') end
      using errcode = 'PT409';
  end if;

  -- El saliente conserva acceso compartido.
  update public.leads_asesores set tipo_acceso = 'compartido'
  where lead_id = l.id and tipo_acceso = 'dueno' and revocado_en is null;
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso) values (l.id, p_destino, 'dueno')
  on conflict (lead_id, usuario_id) do update set tipo_acceso = 'dueno', revocado_en = null, revocado_por = null, desde = now();

  -- Las abiertas del saliente pasan al embudo por defecto del destino.
  if v_dueno is not null then
    for o in
      select * from public.oportunidades x
       where x.lead_id = l.id and x.usuario_id = v_dueno and x.estado = 'abierta' and x.eliminado_en is null
       order by x.id for update
    loop
      if v_embudo is null then
        v_embudo := public._embudo_defecto_de(p_destino);
      end if;
      select s.id into v_etapa
        from public.embudos_etapas s join public.embudos_etapas a on a.id = o.etapa_id
       where s.embudo_id = v_embudo and lower(s.nombre) = lower(a.nombre) and not s.es_ganada and not s.es_perdida;
      if v_etapa is null then
        select s.id into v_etapa from public.embudos_etapas s where s.embudo_id = v_embudo and s.es_inicial;
      end if;
      update public.oportunidades x set usuario_id = p_destino, embudo_id = v_embudo, etapa_id = v_etapa,
        actualizado_en = greatest(clock_timestamp(), o.actualizado_en + interval '1 microsecond')
      where x.id = o.id;
      v_movidas := v_movidas + 1;
    end loop;
    if v_movidas > 0 then
      perform public.registrar_actividad('oportunidad.transferida', 'leads', l.id::text,
        jsonb_build_object('de', v_dueno), jsonb_build_object('a', p_destino), jsonb_build_object('cantidad', v_movidas));
    end if;
  end if;

  perform public.registrar_actividad('lead.transferido', 'leads', l.id::text,
    jsonb_build_object('de', v_dueno), jsonb_build_object('a', p_destino));
  return jsonb_build_object('resultado', 'transferido', 'dueno', p_destino, 'cartera', public._lead_cartera_json(l.id),
    'oportunidades', v_movidas);
end;
$$;
revoke all on function public.lead_transferir(uuid, uuid, uuid) from public, anon;
grant execute on function public.lead_transferir(uuid, uuid, uuid) to authenticated;
