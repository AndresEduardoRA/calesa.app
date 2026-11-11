-- Los recordatorios avisan solos (paso 7.01-1): `recordatorios_notificar()` (misma firma) corre cada minuto por pg_cron.
--   · Toma hasta 200 vencidos en orden por `recordatorios_pendientes_idx`, con `skip locked`: dos corridas solapadas no se pisan.
--   · Uno eliminado se sella sin avisar (si sólo se filtrara, quedaría al frente del índice en cada corrida).
--   · La `ruta` nombra el lead sólo si el dueño del recordatorio todavía lo tiene vivo en la cartera (la regla de `recordatorios_vista`);
--     si no, `/agenda?recordatorio=<id>`: nunca un lead que ya no ve.
--   · Antes de avisar borra el aviso abierto del mismo recordatorio (el de la hora vieja, si se cambió la hora): si quedara, el antispam
--     se tragaría el nuevo y `notificado_en` quedaría sellado sin aviso.
-- La puerta de la tabla decide baja y bloqueo.

create or replace function public.recordatorios_notificar() returns integer
  language plpgsql security definer
  set search_path = ''
as $$
declare r record; n int := 0; v_ruta text;
begin
  for r in
    select x.id, x.usuario_id, x.lead_id, x.titulo, x.eliminado_en
    from public.recordatorios x
    where x.notificado_en is null and x.completado_en is null and x.recordar_en <= now()
    order by x.recordar_en, x.id
    limit 200
    for update skip locked
  loop
    if r.eliminado_en is null then
      v_ruta := case
        when r.lead_id is not null and exists (
          select 1 from public.leads_asesores la join public.leads l on l.id = la.lead_id
          where la.lead_id = r.lead_id and la.usuario_id = r.usuario_id and la.revocado_en is null and l.eliminado_en is null
        ) then '/leads/' || r.lead_id
        else '/agenda?recordatorio=' || r.id
      end;
      delete from public.notificaciones
      where usuario_id = r.usuario_id and tipo = 'recordatorio' and referencia_id = r.id and accionada_en is null;
      perform public.notificar(r.usuario_id, 'recordatorio', r.titulo, null, 'recordatorio', r.id, v_ruta, true);
    end if;
    update public.recordatorios set notificado_en = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.recordatorios_notificar() from public, anon, authenticated;
grant execute on function public.recordatorios_notificar() to service_role;

select cron.schedule('recordatorios-notificar', '* * * * *', 'select public.recordatorios_notificar()');
