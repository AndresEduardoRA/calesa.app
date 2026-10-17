-- Un lote de la baja contaba al limbo los leads del lote con la cartera vacía, también uno que otra corrida de la misma baja ya
-- había aplicado (y contado) entre leer los ids y bloquear: el número se inflaba. La carrera es de dos corridas de la misma baja
-- a la vez (una llamada manual de `equipo_bajas_continuar()` mientras corre la de `pg_cron`), no la de otra RPC: quien llama a
-- `_lead_aplicar_bajas` deja al lead fuera del limbo (adoptar suma a quien adopta) o se revierte (salir y quitar acceso rechazan
-- dejarlo vacío), así que esas no cuentan dos veces (cierre 2, 0b; `scripts/carreras/cartera.mjs` la provoca sin `sleep`).
-- Cuenta sólo los leads cuya fila revocó su sentencia.

create or replace function public._baja_lote_desde(p_usuario uuid, p_lote int, p_desde uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_baja public.equipo_bajas;
  v_ids uuid[];
  v_leads uuid[];
  v_hechos uuid[];
  v_limbo int := 0;
  v_canceladas int;
  v_n int := greatest(coalesce(p_lote, 0), 1);
begin
  select * into v_baja from public.equipo_bajas b where b.usuario_id = p_usuario and b.terminada_en is null;
  if not found then
    return null;
  end if;
  -- Los ids que siguen, por leads_asesores_usuario_vigente_idx (usuario_id, lead_id) where revocado_en is null: ordenados y
  -- con `limit`, sin unir con `leads` (unidas, con una cartera que es un tercio de la tabla, el planificador prefería
  -- recorrer las dos y ordenar: crece con la tabla, no con la persona).
  if p_desde is null then
    v_ids := array(select la.lead_id from public.leads_asesores la
                    where la.usuario_id = p_usuario and la.revocado_en is null
                    order by la.lead_id limit v_n);
  else
    v_ids := array(select la.lead_id from public.leads_asesores la
                    where la.usuario_id = p_usuario and la.revocado_en is null and la.lead_id > p_desde
                    order by la.lead_id limit v_n);
  end if;
  -- Después los leads, por su clave, en orden de id y sin esperar: uno que otra RPC tiene bloqueado lo toma la corrida
  -- siguiente (el cursor avanza igual: lo saltado no vuelve en esta corrida).
  v_leads := array(select l.id from public.leads l where l.id = any (v_ids) order by l.id for update skip locked);
  if cardinality(v_leads) > 0 then
    -- La sentencia dispara el recálculo de la cartera de esos leads (ya bloqueados: el trigger no espera).
    -- Se cuentan sólo los leads cuya fila revocó esta sentencia: uno que otra corrida de esta misma baja ya aplicó (y contó)
    -- entre leer los ids y bloquear no se cuenta dos veces.
    with hechas as (
      update public.leads_asesores la set revocado_en = now(), revocado_por = v_baja.por
       where la.lead_id = any (v_leads) and la.usuario_id = p_usuario and la.revocado_en is null
      returning la.lead_id
    )
    select coalesce(array_agg(h.lead_id), '{}') into v_hechos from hechas h;
    select count(*) into v_limbo from public.leads l
     where l.id = any (v_hechos) and l.eliminado_en is null and l.cartera = '{}';
  end if;
  -- Sus oportunidades abiertas (sólo las ve su dueña: nadie ve el estado intermedio). oportunidades_abiertas_usuario_idx.
  with lote as (
    select o.id from public.oportunidades o
     where o.usuario_id = p_usuario and o.estado = 'abierta'
     order by o.id limit v_n
       for update skip locked
  )
  update public.oportunidades o set estado = 'cancelada' from lote where o.id = lote.id;
  get diagnostics v_canceladas = row_count;

  if v_limbo > 0 or v_canceladas > 0 then
    update public.equipo_bajas
       set leads_al_limbo = leads_al_limbo + v_limbo, oportunidades_canceladas = oportunidades_canceladas + v_canceladas
     where usuario_id = p_usuario;
  end if;
  return v_ids[cardinality(v_ids)];
end;
$$;
