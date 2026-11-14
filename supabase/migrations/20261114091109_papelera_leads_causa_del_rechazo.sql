-- La papelera de leads dice también *cuál* regla frenó el envío, con una clave estable en `hint` (la pantalla la vuelve acciones del aviso),
-- como la de vehículos. `_lead_bloqueo()` devuelve {causa, motivo} con las mismas reglas, en el mismo orden y con los mismos textos;
-- `_lead_motivo_de_bloqueo()` queda como su texto, así que sus llamadores (la purga y la lista de la papelera) no cambian.
-- Causas: `vinculado`, `vinculado_ajeno` (un vehículo que quien envía no ve), `pagos`, `portal` y `cotizacion_papelera` (las tres últimas sólo
-- frenan una purga).

create or replace function public._lead_bloqueo(l public.leads, p_al_enviar boolean) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
  as $$
begin
  if exists (select 1 from public.vehiculos v where v.lead_id = l.id and (not p_al_enviar or v.eliminado_en is null)) then
    if not p_al_enviar then
      return jsonb_build_object('causa', 'vinculado', 'motivo', 'Tiene un vehículo vinculado: desvincúlalo antes de purgarlo.');
    end if;
    if exists (select 1 from public.vehiculos v where v.lead_id = l.id and v.eliminado_en is null
                and not public.puede_vehiculo(v.id, 'vehiculos.ver')) then
      return jsonb_build_object('causa', 'vinculado_ajeno',
        'motivo', 'Tiene un vehículo vinculado que no ves: quien lo gestiona tiene que desvincularlo antes.');
    end if;
    return jsonb_build_object('causa', 'vinculado',
      'motivo', 'Tiene un vehículo vinculado: desvincúlalo en «Vehículos» antes de enviarlo.');
  end if;
  if not p_al_enviar then
    if exists (select 1 from public.pagos p where p.lead_id = l.id) then
      return jsonb_build_object('causa', 'pagos', 'motivo', 'Tiene pagos registrados.');
    end if;
    if exists (select 1 from public.accesos_portal a where a.lead_id = l.id and a.habilitado) then
      return jsonb_build_object('causa', 'portal', 'motivo', 'Tiene el acceso al portal vigente.');
    end if;
    -- Una cotización de la papelera que lo nombra (cotizaciones_lead_creado_idx); a una viva el `set null` la deja sin cliente, como siempre.
    if exists (select 1 from public.cotizaciones c where c.lead_id = l.id and c.eliminado_en is not null) then
      return jsonb_build_object('causa', 'cotizacion_papelera', 'motivo', 'Tiene una cotización en la papelera. Púrgala antes.');
    end if;
  end if;
  return null;
end;
$$;

revoke all on function public._lead_bloqueo(public.leads, boolean) from public, anon, authenticated;
grant execute on function public._lead_bloqueo(public.leads, boolean) to service_role;

create or replace function public._lead_motivo_de_bloqueo(l public.leads, p_al_enviar boolean) returns text
  language plpgsql stable security definer
  set search_path = ''
  as $$
begin
  return public._lead_bloqueo(l, p_al_enviar) ->> 'motivo';
end;
$$;

CREATE OR REPLACE FUNCTION "public"."leads_papelera_enviar"("p_lote" "uuid", "p_leads" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_ids uuid[]; v_id uuid; v_n int; v_alcance public.alcance_permiso; v_lote public.lotes_papelera;
  v_yo uuid := (select auth.uid()); l public.leads; v_bloqueo jsonb; v_portal int; v_version timestamptz;
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
      'enviados', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nombre', x.nombre) || public._lead_numeros(x, (select public.tiene_permiso('leads.numero_global.ver'))) order by x.numero)
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
    v_bloqueo := public._lead_bloqueo(l, true);
    if v_bloqueo is not null then
      raise exception 'No se envió nada. «%»: %', l.nombre, v_bloqueo ->> 'motivo'
        using errcode = '23514', hint = v_bloqueo ->> 'causa';
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
    'enviados', (select jsonb_agg(jsonb_build_object('id', x.id, 'nombre', x.nombre) || public._lead_numeros(x, (select public.tiene_permiso('leads.numero_global.ver'))) order by x.numero)
                 from public.leads x where x.lote_papelera_id = p_lote));
end;
$$;
