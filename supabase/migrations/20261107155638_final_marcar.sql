-- Marcar una cotización como final en el orden de candados de vincular (paso 4.25-1; decisiones P1–P6 a de la persona, 2026-11-07).
--
-- `cotizacion_marcar_final` tomaba primero su cotización, después las preventas y al final el vehículo (el `update` del vínculo) y el lead (la FK, `for key
-- share`): al revés que vincular (lead → vehículo) y que la papelera de vehículos (vehículo → sus cotizaciones), con un 40P01 posible contra cada una. Tampoco
-- miraba el lead (en la papelera, fuera de la cartera), ni ver antes de tomar, ni el vínculo de otro lead (lo dejaba en silencio), y no pasaba el lead a cliente.
-- Ahora:
--   C1. Mira sin candado: la cotización viva y visible (si no, el 42501 de lo inexistente), `cotizaciones.final.gestionar`, el vehículo, el lead (vivo, fuera de
--       la papelera, en la cartera con `leads.editar`: P2 a) y que quien marca pueda mandar a la papelera todas las demás vivas del vehículo (P3 a).
--   C2. Toma (1) el lead `for no key update`, (2) el vehículo `for key share` y (3) en una sola pasada por id la cotización y todas las vivas del vehículo.
--       El vehículo se escribe recién con todo tomado (el vínculo, en `_final_aplicar`). `for key share` en el vehículo choca con vincular, las papeleras de
--       vehículos y la limpieza (`for update`) y convive con el trigger `trg_vehiculo_cotizado` de crear, encima y guardar, que escribe el vehículo después
--       de tomar su cotización; el lead `for no key update` choca con vincular, `_lead_mio`, la papelera de leads y otro marcar, y convive con el `for key
--       share` de crear, encima, guardar y restaurar. La tabla de pares va en las decisiones del paso 4.25.
--   C3. Si lo tomado ya no está vivo o cambió (otro vehículo u otro lead), suelta la vuelta (una subtransacción con SQLSTATE propio, `PF425`) y empieza de
--       nuevo desde C1, que responde sin candado; a la tercera, PT409. Con todo tomado vuelve a mirar el lead, ver, P3 a y el vínculo, éste con una
--       sentencia nueva después de la pasada (P4 a: otro marcar pudo vincularlo mientras se esperaba).
--   C5. Los efectos, en `_final_aplicar(c, tomadas)` (de nadie; lo reusa el 4.25-1b): la final anterior que se tomó baja a preventa, la cotización pasa a
--       final, las preventas tomadas van a un lote de la papelera de quien marca, el vehículo sin lead queda con el de la cotización (cinturón: otro lead,
--       23514), el lead pasa al primer tipo activo de la clase cliente por orden y nombre si no era de esa clase, y la actividad.
-- Firma y privilegios de marcar no cambian (las carreras del A la llaman con un argumento). Pruebas: `supabase/tests/areas/final/marcar.sql`,
-- `marcar-candados.sql` y `carreras.mjs`.

create function public._final_aplicar(c public.cotizaciones, p_tomadas uuid[]) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare v_ids uuid[]; v_lote uuid; v_n int := 0; v_lead uuid; v_es_cliente boolean; v_tipo uuid; v_a_cliente boolean := false;
begin
  -- 1. La final anterior baja a preventa sólo si se tomó en la pasada: por id, nunca por el vehículo (una final que se confirmó después da 23505 en el paso 2).
  update public.cotizaciones x set clase = 'preventa'
   where x.id = any (p_tomadas) and x.id <> c.id and x.clase = 'final' and x.eliminado_en is null;
  -- 2. La cotización, final (una que ya lo es no se toca).
  update public.cotizaciones x set clase = 'final' where x.id = c.id and x.clase <> 'final';
  -- 3. Las preventas tomadas (con la que bajó), a un lote de la papelera de quien marca, como `_cotizacion_a_papelera`.
  v_ids := array(select x.id from public.cotizaciones x
                  where x.id = any (p_tomadas) and x.id <> c.id and x.clase = 'preventa' and x.eliminado_en is null order by x.id);
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

comment on function public._final_aplicar(public.cotizaciones, uuid[]) is 'Los efectos de marcar final, llamado con todo tomado (el lead, el vehículo y las cotizaciones p_tomadas): la final anterior tomada baja a preventa, c pasa a final, las preventas tomadas van a un lote de la papelera de quien llama, el vehículo sin lead queda con el de c (con otro lead, 23514), el lead pasa al primer tipo activo de la clase cliente y la actividad. No toma candados y escribe cotizaciones sólo por id. De nadie: lo llama cotizacion_marcar_final (y el 4.25-1b, cotizacion_crear).';
revoke all on function public._final_aplicar(public.cotizaciones, uuid[]) from public, anon, authenticated;
grant execute on function public._final_aplicar(public.cotizaciones, uuid[]) to service_role;

create or replace function public.cotizacion_marcar_final(p_cotizacion uuid) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare c public.cotizaciones; c2 public.cotizaciones; v_vuelta int := 0; v_tomadas uuid[]; v_lead_del_vehiculo uuid;
begin
  perform public.assert_activo();
  loop
    v_vuelta := v_vuelta + 1;
    -- C1. Sin candado: lo que no se ve da lo mismo que lo inexistente y no espera nada.
    select * into c from public.cotizaciones x where x.id = p_cotizacion and x.eliminado_en is null;
    if not found or not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    end if;
    if not public.tiene_permiso('cotizaciones.final.gestionar', c.origen_id) then
      raise exception 'No tienes permiso para marcar la final.' using errcode = '42501';
    end if;
    if c.vehiculo_id is null then
      raise exception 'Una final exige vehículo vinculado.' using errcode = '23514';
    end if;
    if c.lead_id is null then
      raise exception 'Esta cotización no tiene lead: no se puede marcar final.' using errcode = '23514';
    end if;
    if exists (select 1 from public.leads l where l.id = c.lead_id and l.eliminado_en is not null) then
      raise exception 'El lead de esta cotización está en la papelera. Restáuralo antes de marcarla final.' using errcode = '23514';
    end if;
    if not public.puede_actuar_lead(c.lead_id, 'leads.editar') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
    if exists (select 1 from public.cotizaciones z
                where z.vehiculo_id = c.vehiculo_id and z.eliminado_en is null and z.id <> c.id
                  and not (public.puede_cotizacion(z.id, 'cotizaciones.ver')
                           and case when z.clase = 'final' then public.tiene_permiso('cotizaciones.final.gestionar', z.origen_id)
                                    else public.puede_cotizacion(z.id, 'cotizaciones.editar') or public.tiene_permiso('cotizaciones.moderar') end)) then
      raise exception 'Este vehículo tiene preventas que no puedes mandar a la papelera. Pídeselo a quien las cotizó o a quien modera.' using errcode = '42501';
    end if;

    begin
      -- C2. (1) el lead, (2) el vehículo, (3) la cotización y todas las vivas del vehículo en una pasada por id. Lo que ya no está vivo: otra vuelta.
      perform 1 from public.leads l where l.id = c.lead_id and l.eliminado_en is null for no key update;
      if not found then raise exception using errcode = 'PF425'; end if;
      perform 1 from public.vehiculos v where v.id = c.vehiculo_id and v.eliminado_en is null for key share;
      if not found then raise exception using errcode = 'PF425'; end if;
      v_tomadas := array(select z.id from public.cotizaciones z
                          where (z.vehiculo_id = c.vehiculo_id or z.id = c.id) and z.eliminado_en is null order by z.id for no key update);
      -- C3. Lo que cambió mientras se esperaba (guardar le cambió el vehículo o el lead, o se fue a la papelera): otra vuelta.
      select * into c2 from public.cotizaciones x where x.id = c.id;
      if c2.eliminado_en is not null or c2.vehiculo_id is distinct from c.vehiculo_id or c2.lead_id is distinct from c.lead_id
         or not (c.id = any (v_tomadas)) then
        raise exception using errcode = 'PF425';
      end if;
      c := c2;
      -- Con todo tomado, sobre lo confirmado: (i) el lead, (ii) ver, (iii) P3 a, (iv) el vínculo, leído ahora (otro marcar pudo escribirlo).
      if not public.puede_actuar_lead(c.lead_id, 'leads.editar') then
        raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
      end if;
      if not public.puede_cotizacion(c.id, 'cotizaciones.ver') then
        raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
      end if;
      if exists (select 1 from public.cotizaciones z
                  where z.id = any (v_tomadas) and z.id <> c.id
                    and not (public.puede_cotizacion(z.id, 'cotizaciones.ver')
                             and case when z.clase = 'final' then public.tiene_permiso('cotizaciones.final.gestionar', z.origen_id)
                                      else public.puede_cotizacion(z.id, 'cotizaciones.editar') or public.tiene_permiso('cotizaciones.moderar') end)) then
        raise exception 'Este vehículo tiene preventas que no puedes mandar a la papelera. Pídeselo a quien las cotizó o a quien modera.' using errcode = '42501';
      end if;
      select v.lead_id into v_lead_del_vehiculo from public.vehiculos v where v.id = c.vehiculo_id;
      if v_lead_del_vehiculo is not null and v_lead_del_vehiculo <> c.lead_id then
        raise exception 'Este vehículo está vinculado a otro lead. Desvincúlalo antes de marcar la final.' using errcode = '23514';
      end if;
      -- C5. Los efectos, con todo tomado.
      perform public._final_aplicar(c, v_tomadas);
      return;
    exception when sqlstate 'PF425' then
      if v_vuelta >= 3 then
        raise exception 'La cotización cambió mientras la marcabas. Vuelve a intentarlo.' using errcode = 'PT409';
      end if;
    end;
  end loop;
end;
$$;

comment on function public.cotizacion_marcar_final(uuid) is 'Marca una cotización como final (4.25-1): mira sin candado (ver, cotizaciones.final.gestionar, vehículo, lead vivo y en la cartera con leads.editar, que pueda mandar las demás del vehículo a la papelera); toma lead (no key update) → vehículo (key share) → la cotización y las vivas del vehículo en una pasada por id; si algo cambió, otra vuelta (a la tercera, PT409); con todo tomado vuelve a mirar y el vínculo (otro lead: 23514); los efectos, en _final_aplicar.';
-- `create or replace` conserva los privilegios de la base; se repiten explícitos (redundante a propósito).
revoke all on function public.cotizacion_marcar_final(uuid) from public, anon;
grant execute on function public.cotizacion_marcar_final(uuid) to authenticated, service_role;
