-- Ajustes a la auditoría de leads (Fase 3, parte 6a), tras la revisión adversarial.
--
-- 1. Carreras: `_lead_mio()`, `_lead_para_mover()` y `leads_papelera_enviar()` autorizaban antes de
--    tomar el lock y no volvían a mirar. Quien esperaba el lock mientras le quitaban la cartera (o le
--    transferían el lead) escribía igual al despertar. Ahora se vuelve a mirar con el lead bloqueado.
-- 2. Un reintento de `leads_papelera_enviar` con el mismo lote y otros leads se rechaza.
-- 3. `lead_id` en otras tablas (pagos, tareas, eventos, mensajes, repuestos, testimonios): se podía
--    escribir el de cualquier lead, lo viera o no (le impedía purgarse, y el error de la FK decía si
--    existía). Un trigger común exige que quien escribe vea ese lead.

create or replace function public._lead_mio(p_lead uuid, p_clave text default 'leads.editar', p_bloquear boolean default false)
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

create or replace function public._lead_para_mover(p_lead uuid)
returns public.leads language plpgsql security definer set search_path = '' as $$
declare l public.leads;
begin
  perform public.assert_activo();
  if p_lead is null or not public.puede_lead(p_lead, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  select * into l from public.leads x where x.id = p_lead and x.eliminado_en is null for update;
  if not found or not public.puede_lead(p_lead, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  return l;
end;
$$;

create or replace function public.leads_papelera_enviar(p_lote uuid, p_leads uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_ids uuid[]; v_id uuid; v_n int; v_alcance public.alcance_permiso; v_lote public.lotes_papelera;
  v_yo uuid := (select auth.uid()); l public.leads; v_motivo text; v_portal int; v_version timestamptz;
begin
  perform public.assert_activo();
  if p_lote is null then
    raise exception 'Falta el identificador del envío.' using errcode = '22023';
  end if;
  if coalesce(array_length(p_leads, 1), 0) = 0 then
    raise exception 'Nada que enviar.' using errcode = '22023';
  end if;
  if array_length(p_leads, 1) > 200 then
    raise exception 'Máximo 200 por lote.' using errcode = '22023';
  end if;
  if array_position(p_leads, null) is not null then
    raise exception 'Uno de los leads llegó incompleto. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;
  select array_agg(distinct x order by x) into v_ids from unnest(p_leads) x;

  -- Un reintento con el mismo lote no manda dos veces: devuelve lo que ya se mandó.
  select * into v_lote from public.lotes_papelera x where x.id = p_lote;
  if found then
    if v_lote.tipo <> 'leads' or v_lote.creado_por is distinct from v_yo then
      raise exception 'No pudimos enviar estos leads. Vuelve a intentarlo.' using errcode = '22023';
    end if;
    -- El mismo lote con otros leads no es un reintento: se rechaza en vez de decir «ya se envió».
    if exists (select 1 from unnest(v_ids) x where not exists (
         select 1 from public.leads l2 where l2.id = x and l2.lote_papelera_id = v_lote.id)) then
      raise exception 'Ese envío ya existe con otros leads. Vuelve a intentarlo.' using errcode = '22023';
    end if;
    return jsonb_build_object('lote', v_lote.id, 'actualizado_en', v_lote.actualizado_en, 'repetido', true,
      'portal_revocados', 0,
      'enviados', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'numero', x.numero, 'nombre', x.nombre) order by x.numero)
                            from public.leads x where x.lote_papelera_id = v_lote.id and x.eliminado_en is not null), '[]'::jsonb));
  end if;

  v_alcance := public.alcance_de('leads.eliminar');
  if v_alcance is null then
    raise exception 'No tienes permiso para enviar leads a la papelera.' using errcode = '42501';
  end if;
  -- Primero se mira, sin bloquear: lo que no se ve da el mensaje de siempre y no dice cuál falló.
  foreach v_id in array v_ids loop
    if not public.puede_lead(v_id, 'leads.ver') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
    if v_alcance <> 'todos' and public._lead_dueno(v_id) is distinct from v_yo then
      raise exception 'Sólo quien es dueño de un lead lo envía a la papelera.' using errcode = '42501';
    end if;
  end loop;
  -- Después se bloquea lo que se ve, en orden, y se vuelve a mirar: algo pudo irse mientras tanto.
  select count(*) into v_n from (
    select x.id from public.leads x where x.id = any (v_ids) and x.eliminado_en is null order by x.id for update) s;
  if v_n <> array_length(v_ids, 1) then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  for l in select * from public.leads x where x.id = any (v_ids) order by x.numero loop
    -- Con el lead bloqueado se vuelve a mirar quién es el dueño: pudo transferirse mientras esperaba.
    if v_alcance <> 'todos' and public._lead_dueno(l.id) is distinct from v_yo then
      raise exception 'Sólo quien es dueño de un lead lo envía a la papelera.' using errcode = '42501';
    end if;
    v_motivo := public._lead_motivo_de_bloqueo(l, true);
    if v_motivo is not null then
      raise exception 'No se envió nada. «%»: %', l.nombre, v_motivo using errcode = '23514';
    end if;
  end loop;

  begin
    insert into public.lotes_papelera (id, tipo, creado_por, resumen)
    values (p_lote, 'leads', v_yo, jsonb_build_object('cantidad', v_n, 'restaurados', 0, 'purgados', 0));
  exception when unique_violation then
    raise exception 'Ese envío ya se estaba procesando. Vuelve a intentarlo.' using errcode = 'PT409';
  end;
  update public.leads x set eliminado_en = now(), eliminado_por = v_yo, lote_papelera_id = p_lote
  where x.id = any (v_ids) and x.eliminado_en is null;
  update public.accesos_portal a set habilitado = false, revocado_por = v_yo, revocado_en = now()
  where a.lead_id = any (v_ids) and a.habilitado;
  get diagnostics v_portal = row_count;
  v_version := public._lote_papelera_tocar(p_lote);
  perform public.registrar_actividad('papelera.enviado', 'lotes_papelera', p_lote::text, null, null,
    jsonb_build_object('tipo', 'leads', 'cantidad', v_n, 'portal_revocados', v_portal));
  return jsonb_build_object('lote', p_lote, 'actualizado_en', v_version, 'repetido', false, 'portal_revocados', v_portal,
    'enviados', (select jsonb_agg(jsonb_build_object('id', x.id, 'numero', x.numero, 'nombre', x.nombre) order by x.numero)
                 from public.leads x where x.lote_papelera_id = p_lote));
end;
$$;

-- ---------------------------------------------------------------------------
-- `lead_id` en las demás tablas: sólo de un lead que quien escribe ve
-- ---------------------------------------------------------------------------
-- Corre antes de la FK, así que un lead inexistente y uno que no se ve dan el mismo mensaje. Sin
-- sesión (el job, el cliente de servicio, la web pública) no mira: ahí no hay quien «vea».
create or replace function public.lead_visible_al_escribir()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.lead_id is not null and (select auth.uid()) is not null
     and (tg_op = 'INSERT' or new.lead_id is distinct from old.lead_id)
     and not public.puede_lead(new.lead_id, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501', hint = 'lead_id';
  end if;
  return new;
end;
$$;
revoke all on function public.lead_visible_al_escribir() from public, anon, authenticated;

do $$
declare t text;
begin
  for t in select unnest(array['pagos', 'tareas', 'eventos', 'mensajes', 'repuestos_proyectos', 'web_testimonios']) loop
    execute format('drop trigger if exists trg_lead_visible on public.%I', t);
    execute format('create trigger trg_lead_visible before insert or update on public.%I
                    for each row execute function public.lead_visible_al_escribir()', t);
  end loop;
end $$;
