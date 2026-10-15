-- Anotar y agendar bloquean el lead y vuelven a mirar (Fase 3, parte 6b).
--
-- La prueba de carreras con dos conexiones (`pnpm db:carreras`) encontró que un compartido al que le
-- quitaban el acceso mientras anotaba dejaba su seguimiento igual: `seguimiento_crear` y
-- `recordatorio_crear` llamaban a `_lead_mio(p_lead)` sin bloquear (el permiso se miraba antes y la FK
-- sólo esperaba el lock), y editar, eliminar o restaurar un seguimiento (`_seguimiento_mio`) no miraba
-- el lead con lock. Es la carrera que la 6a cerró en el resto de la clase 1.

-- Por omisión, quien actúa sobre un lead lo bloquea y vuelve a mirar: no hay que acordarse de pedirlo.
create or replace function public._lead_mio(p_lead uuid, p_clave text default 'leads.editar', p_bloquear boolean default true)
returns public.leads language plpgsql security definer set search_path = '' as $$
declare l public.leads;
begin
  perform public.assert_activo();
  if not public.puede_actuar_lead(p_lead, p_clave) then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  if p_bloquear then
    select * into l from public.leads x where x.id = p_lead and x.eliminado_en is null for update;
  else
    select * into l from public.leads x where x.id = p_lead and x.eliminado_en is null;
  end if;
  if not found then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  -- Quien esperaba el lock pudo perder el acceso mientras tanto (le quitaron la cartera, lo
  -- transfirieron): se vuelve a mirar ya con el lead bloqueado, sobre lo que quedó confirmado.
  if p_bloquear and not public.puede_actuar_lead(p_lead, p_clave) then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  return l;
end;
$$;

-- Editar, eliminar o restaurar un seguimiento: el seguimiento y después su lead, con lock, y se vuelve a
-- mirar la cartera. El orden (seguimiento → lead) no cruza con anotar (lead → un seguimiento nuevo).
create or replace function public._seguimiento_mio(p_id uuid)
returns public.seguimientos language plpgsql security definer set search_path = '' as $$
declare s public.seguimientos;
begin
  perform public.assert_activo();
  select * into s from public.seguimientos x where x.id = p_id for update;
  if not found
     or s.usuario_id <> (select auth.uid())
     or not public.puede_actuar_lead(s.lead_id, 'leads.editar') then
    raise exception 'No encontramos este seguimiento o no tienes acceso.' using errcode = '42501';
  end if;
  perform 1 from public.leads x where x.id = s.lead_id for update;
  if not public.puede_actuar_lead(s.lead_id, 'leads.editar') then
    raise exception 'No encontramos este seguimiento o no tienes acceso.' using errcode = '42501';
  end if;
  return s;
end;
$$;
