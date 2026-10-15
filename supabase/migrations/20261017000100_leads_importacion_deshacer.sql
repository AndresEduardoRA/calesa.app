-- Deshacer una importación de leads durante 24 horas (Fase 3, parte 8b). Escrito a mano. Las tres
-- columnas nuevas de `importaciones` (`deshecha_en`, `deshecha_lote`, `deshecha_resultado`) están en
-- `schemas/15_datos`.
--
-- Leído contra la base viva antes de escribir esto:
-- 1. `leads_papelera_enviar` exige `leads.eliminar` y es todo o nada (tope 200): no sirve para quien sólo
--    importa ni para dejar afuera lo que ya se tocó. El deshacer es una RPC propia, de clase X.
-- 2. `lead_version()` mueve `actualizado_en` sólo con el contenido del lead; un lead recién importado
--    tiene `actualizado_en = creado_en`. Seguimientos, cartera, teléfonos extra, vehículos, oportunidades
--    y portal no la mueven: «intacto» se mira tabla por tabla (el cinturón fija la lista).
-- 3. `authenticated` podía INSERT y DELETE directo sobre `importaciones` (policies «crear» y «borrar»):
--    con eso se fabricaba una importación con `terminada_en` en el futuro (una ventana sin fin) o se
--    borraba la propia con sus vínculos. Nada de la app los usa: se revocan.
-- 4. `leads_papelera_restaurar` deja restaurar al creador del lote: el lote del deshacer es de quien
--    importó, que así puede volver atrás desde la papelera.

-- ---------------------------------------------------------------------------------------------------
-- Las importaciones sólo se escriben por RPC.
-- ---------------------------------------------------------------------------------------------------
drop policy if exists "importaciones: crear" on public.importaciones;
drop policy if exists "importaciones: borrar" on public.importaciones;
revoke insert, update, delete, truncate on public.importaciones from authenticated, anon;

-- ---------------------------------------------------------------------------------------------------
-- Hasta cuándo se puede deshacer: 24 h desde que terminó; si nunca se cerró, desde su último lote.
-- Sin grant: la llaman las funciones «definer» de abajo.
-- ---------------------------------------------------------------------------------------------------
create or replace function public._importacion_vence_en(p public.importaciones)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select coalesce(
    case when p.estado = 'terminada' then p.terminada_en end,
    (select max(x.creado_en) from public.importaciones_leads x where x.importacion_id = p.id),
    p.iniciada_en,
    p.creado_en) + interval '24 hours';
$$;
revoke all on function public._importacion_vence_en(public.importaciones) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------
-- ¿Sigue intacto un lead importado? Nulo si sí; si no, la clave del primer motivo, en este orden. Cuenta
-- todo lo que alguien hizo con el lead, también lo que después se quitó (un compartido revocado, un
-- seguimiento eliminado, un portal revocado). No cuentan las marcas (favorito, tachado, etiquetas): son
-- de quien mira y no cambian el lead. Toda tabla con FK a `leads` está clasificada en el cinturón
-- (`supabase/tests/auditoria-leads.sql`): una nueva rompe `db:probar` hasta decidir si cuenta.
-- ---------------------------------------------------------------------------------------------------
create or replace function public._lead_motivo_para_deshacer(p_lead uuid, p_yo uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare l public.leads;
begin
  select * into l from public.leads x where x.id = p_lead;
  if not found or l.eliminado_en is not null then
    return 'papelera';
  end if;
  if not exists (select 1 from public.leads_asesores a
                  where a.lead_id = l.id and a.usuario_id = p_yo and a.tipo_acceso = 'dueno' and a.revocado_en is null) then
    return 'otra_persona';
  end if;
  if exists (select 1 from public.leads_asesores a where a.lead_id = l.id and a.usuario_id <> p_yo) then
    return 'compartido';
  end if;
  if l.actualizado_en is distinct from l.creado_en then
    return 'editado';
  end if;
  if exists (select 1 from public.seguimientos s where s.lead_id = l.id) then
    return 'seguimientos';
  end if;
  if exists (select 1 from public.recordatorios r where r.lead_id = l.id) then
    return 'recordatorios';
  end if;
  if exists (select 1 from public.leads_telefonos t where t.lead_id = l.id) then
    return 'telefonos';
  end if;
  if exists (select 1 from public.vehiculos v where v.lead_id = l.id)
     or exists (select 1 from public.vehiculos_interesados v where v.lead_id = l.id)
     or exists (select 1 from public.vehiculos_vinculos v where v.lead_id = l.id) then
    return 'vehiculos';
  end if;
  if exists (select 1 from public.oportunidades o where o.lead_id = l.id) then
    return 'oportunidades';
  end if;
  if exists (select 1 from public.accesos_portal a where a.lead_id = l.id) then
    return 'portal';
  end if;
  if exists (select 1 from public.cotizaciones c where c.lead_id = l.id)
     or exists (select 1 from public.pagos c where c.lead_id = l.id)
     or exists (select 1 from public.eventos c where c.lead_id = l.id)
     or exists (select 1 from public.tareas c where c.lead_id = l.id)
     or exists (select 1 from public.mensajes c where c.lead_id = l.id)
     or exists (select 1 from public.repuestos_proyectos c where c.lead_id = l.id)
     or exists (select 1 from public.web_testimonios c where c.lead_id = l.id)
     or exists (select 1 from public.solicitudes_contacto_web c where c.lead_id = l.id) then
    return 'otros';
  end if;
  return null;
end;
$$;
revoke all on function public._lead_motivo_para_deshacer(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Deshacer: manda a la papelera, en un solo lote de quien importó, lo importado que sigue intacto, y
-- cuenta por motivo (con el número de fila del archivo) lo que se queda. Una transacción; cada lead vale
-- por sí mismo. La puede usar sólo quien hizo la importación, con o sin `leads.crear` y `leads.eliminar`:
-- lo intacto sigue siendo sólo suyo. Idempotente: la segunda vez devuelve lo mismo y no mueve nada.
-- Candados: la importación (que también toma cada lote) y después los leads por id (el orden de la
-- papelera manual); con todo bloqueado se vuelve a mirar cada lead.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.leads_importacion_deshacer(p_importacion uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_orden constant text[] := array['papelera', 'otra_persona', 'compartido', 'editado', 'seguimientos',
    'recordatorios', 'telefonos', 'vehiculos', 'oportunidades', 'portal', 'otros'];
  i public.importaciones;
  r record;
  v_motivo text;
  v_movidos uuid[] := '{}'::uuid[];
  v_quedan jsonb := '[]'::jsonb;
  v_quedaron jsonb;
  v_por_motivo jsonb;
  v_vinculos integer;
  v_purgados integer;
  v_lote uuid;
  v_resultado jsonb;
begin
  perform public.assert_activo();
  if p_importacion is null then
    raise exception 'Falta el identificador de la importación.' using errcode = '22023';
  end if;
  -- Primero se mira sin bloquear: a una importación ajena no se le toma el candado. Ajena, inexistente o
  -- de otra cosa que leads dicen lo mismo.
  if not exists (select 1 from public.importaciones x where x.id = p_importacion and x.usuario_id = v_yo and x.entidad = 'leads') then
    raise exception 'No encontramos esta importación.' using errcode = '42501';
  end if;
  select * into i from public.importaciones x where x.id = p_importacion for update;
  if i.usuario_id is distinct from v_yo or i.entidad <> 'leads' then
    raise exception 'No encontramos esta importación.' using errcode = '42501';
  end if;
  -- Ya deshecha: lo mismo que la primera vez (un doble clic o un reintento tardío no son un error).
  if i.deshecha_en is not null then
    return i.deshecha_resultado || jsonb_build_object('repetido', true);
  end if;
  if now() >= public._importacion_vence_en(i) then
    raise exception 'Pasaron más de 24 horas desde esta importación: ya no se puede deshacer.' using errcode = '22023';
  end if;

  -- Los leads, bloqueados en orden; con el candado, cada uno se mira de nuevo (pudo cambiar mientras tanto).
  perform 1 from public.leads x
   where x.id in (select il.lead_id from public.importaciones_leads il where il.importacion_id = i.id)
   order by x.id for update;
  for r in select il.lead_id, il.fila from public.importaciones_leads il where il.importacion_id = i.id order by il.fila loop
    v_motivo := public._lead_motivo_para_deshacer(r.lead_id, v_yo);
    if v_motivo is null then
      v_movidos := v_movidos || r.lead_id;
    else
      v_quedan := v_quedan || jsonb_build_object('motivo', v_motivo, 'fila', r.fila);
    end if;
  end loop;
  v_vinculos := (select count(*) from public.importaciones_leads il where il.importacion_id = i.id);
  -- Lo que ya se purgó de la papelera se fue con su vínculo (cascada).
  v_purgados := greatest(coalesce(i.filas_ok, 0) - v_vinculos, 0);

  if cardinality(v_movidos) > 0 then
    v_lote := gen_random_uuid();
    insert into public.lotes_papelera (id, tipo, creado_por, resumen)
    values (v_lote, 'leads', v_yo, jsonb_build_object('cantidad', cardinality(v_movidos), 'restaurados', 0, 'purgados', 0,
                                                      'importacion', i.id));
    update public.leads x set eliminado_en = now(), eliminado_por = v_yo, lote_papelera_id = v_lote
     where x.id = any (v_movidos);
    perform public._lote_papelera_tocar(v_lote);
    perform public.registrar_actividad('papelera.enviado', 'lotes_papelera', v_lote::text, null, null,
      jsonb_build_object('tipo', 'leads', 'cantidad', cardinality(v_movidos), 'portal_revocados', 0, 'desde', 'importacion'));
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('motivo', m.motivo, 'cantidad', m.cantidad, 'filas', m.filas)
                            order by array_position(v_orden, m.motivo)), '[]'::jsonb),
         coalesce(jsonb_object_agg(m.motivo, m.cantidad), '{}'::jsonb)
    into v_quedaron, v_por_motivo
    from (select e ->> 'motivo' as motivo, count(*)::int as cantidad,
                 jsonb_agg((e ->> 'fila')::int order by (e ->> 'fila')::int) as filas
            from jsonb_array_elements(v_quedan) e group by 1) m;
  v_resultado := jsonb_build_object('importacion', i.id, 'movidos', cardinality(v_movidos),
    'quedaron', v_quedaron, 'purgados', v_purgados);

  -- Queda marcada; si seguía abierta, se cierra (un lote tardío de otra pestaña ya no crea nada). Sin
  -- `terminada_en`: su plazo y su fecha siguen siendo las del último lote.
  update public.importaciones x
     set deshecha_en = now(), deshecha_lote = v_lote, deshecha_resultado = v_resultado,
         estado = case when x.estado = 'procesando' then 'terminada'::public.estado_importacion else x.estado end
   where x.id = i.id;
  perform public.registrar_actividad('leads.importacion_deshecha', 'importaciones', i.id::text, null, null,
    jsonb_build_object('movidos', cardinality(v_movidos), 'quedaron', jsonb_array_length(v_quedan),
                       'por_motivo', v_por_motivo, 'purgados', v_purgados));
  return v_resultado || jsonb_build_object('repetido', false);
end;
$$;
revoke all on function public.leads_importacion_deshacer(uuid) from public, anon;
grant execute on function public.leads_importacion_deshacer(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- «Tus importaciones recientes»: sólo las propias, de las últimas 24 h (y las deshechas en ese lapso),
-- con números y nada del archivo ni de los leads. `intactos` es lo que el deshacer movería ahora.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.leads_importaciones_recientes()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_yo uuid := (select auth.uid());
begin
  perform public.assert_activo();
  return coalesce((
    select jsonb_agg(x.fila order by x.vence_en desc, x.id)
    from (
      select i.id, v.vence_en, jsonb_build_object(
        'id', i.id,
        'fecha', v.vence_en - interval '24 hours',
        'vence_en', v.vence_en,
        'estado', case when i.deshecha_en is not null then 'deshecha'
                       when i.estado = 'terminada' then 'terminada' else 'abierta' end,
        'creadas', coalesce(i.filas_ok, 0),
        'ya_existian', (a.detalle ->> 'ya_existian')::int,
        'rechazadas', (a.detalle ->> 'rechazadas')::int,
        'intactos', case when i.deshecha_en is null then (
          select count(*)::int from public.importaciones_leads il
           where il.importacion_id = i.id and public._lead_motivo_para_deshacer(il.lead_id, v_yo) is null) end,
        'deshecha_en', i.deshecha_en,
        'resultado', i.deshecha_resultado) as fila
      from public.importaciones i
      cross join lateral (select public._importacion_vence_en(i) as vence_en) v
      left join lateral (
        select y.detalle from public.actividad y
         where y.tabla = 'importaciones' and y.registro_id = i.id::text and y.accion = 'leads.importado'
         order by y.id desc limit 1) a on true
      where i.usuario_id = v_yo and i.entidad = 'leads'
        and (i.deshecha_en > now() - interval '24 hours' or (i.deshecha_en is null and v.vence_en > now()))
      order by v.vence_en desc, i.id
      limit 20
    ) x), '[]'::jsonb);
end;
$$;
revoke all on function public.leads_importaciones_recientes() from public, anon;
grant execute on function public.leads_importaciones_recientes() to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- El vínculo importación → lead sólo sirve para deshacer: se borra 7 días después de que venció el plazo
-- (o de que se deshizo). La fila de `importaciones` queda, con números.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.importaciones_vinculos_purgar()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_n integer;
begin
  delete from public.importaciones_leads il
   where il.importacion_id in (
     select i.id from public.importaciones i
      where i.entidad = 'leads'
        and coalesce(i.deshecha_en, public._importacion_vence_en(i)) < now() - interval '7 days');
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.importaciones_vinculos_purgar() from public, anon, authenticated;

do $$
begin
  if to_regprocedure('cron.schedule(text, text, text)') is null then
    raise exception 'pg_cron no está disponible: los vínculos de las importaciones no se borrarían nunca.';
  end if;
  perform cron.schedule('importaciones-vinculos-purgar', '35 3 * * *', 'select public.importaciones_vinculos_purgar()');
end $$;
