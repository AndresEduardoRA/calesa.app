-- Restaurar la papelera de cotizaciones por lote, sin el 23505 (4.24-1b, cierra 4-70).
--
-- `papelera_restaurar('cotizaciones')` hacía un `update` masivo: una versión nueva cuya anterior ya tenía otra viva (`cotizaciones_encima_unica`) o una
-- final cuando el vehículo ya tenía otra (`cotizaciones_final_por_vehiculo`) abortaban el lote con un 23505 sin texto, y una final sin vehículo con el 23514
-- de `cotizacion_validar`. Ahora un ayudante restaura una a una, cada una en su bloque: lo que choca o cuelga de algo en la papelera queda «pendiente» con
-- su motivo y el resto vuelve (P5 a, P7 a). Una preventa sin vehículo o una sin cliente vuelve: después del `set null` de la FK no se distingue de una que
-- nunca lo tuvo (P12 a: el A bloqueará purgar un vehículo o un lead que una cotización de la papelera nombre).
--
-- Los candados, en el orden de quien purga o manda a la papelera un vehículo o un lead (primero su fila, después la cotización): el ayudante toma `for key
-- share` los vehículos y después los leads del lote, por id, antes de tomar cotización alguna; si no, restaurar contra purgar el vehículo es un 40P01.
-- La cotización se toma `for no key update` (no choca con el `for key share` de sus hijas).
--
-- La propia, `cotizaciones_papelera_restaurar(lote, versión, [ids])`, como la de vehículos: quién (quien lo envió o `cotizaciones.papelera.purgar`, P10 a)
-- antes de tomar el lote, y otra vez sobre el lote tomado; la versión del lote. No mira ver por cotización (P11 a): restaurar deshace el propio envío.
-- La genérica conserva firma, retorno y textos (P2 a) y es todo o nada: con algo pendiente, PT409 con el motivo de la primera y nada vuelve.
-- Pruebas: `supabase/tests/areas/papelera/restaurar.sql` y `restaurar-generica.sql`.

create function public._papelera_restaurar_cotizaciones(p_lote uuid, p_ids uuid[]) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  c record; v_vehiculo uuid; v_lead uuid; v_clase public.clase_cotizacion; v_vehiculo_fuera boolean; v_lead_fuera boolean;
  v_motivo text; v_restriccion text; v_quedan int; v_version timestamptz;
  v_restaurados jsonb := '[]'::jsonb; v_pendientes jsonb := '[]'::jsonb;
begin
  -- 0. Antes de tomar cotización alguna, sus vehículos y después sus leads, por id (cotizaciones_lote_papelera_idx; las PK).
  perform 1 from public.vehiculos v
   where v.id in (select x.vehiculo_id from public.cotizaciones x
                   where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_ids is null or x.id = any (p_ids)))
   order by v.id for key share;
  perform 1 from public.leads d
   where d.id in (select x.lead_id from public.cotizaciones x
                   where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_ids is null or x.id = any (p_ids)))
   order by d.id for key share;

  for c in
    select x.id, x.numero, coalesce(x.titulo, 'Cotización #' || x.numero) as titulo from public.cotizaciones x
     where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_ids is null or x.id = any (p_ids))
     order by x.id for no key update
  loop
    begin
      -- 1. Sobre la fila tomada (la FK pudo poner nulos el vehículo o el lead mientras se esperaba).
      select x.vehiculo_id, x.lead_id, x.clase into v_vehiculo, v_lead, v_clase from public.cotizaciones x where x.id = c.id;
      v_vehiculo_fuera := false; v_lead_fuera := false;
      if v_vehiculo is not null then
        select v.eliminado_en is not null into v_vehiculo_fuera from public.vehiculos v where v.id = v_vehiculo for key share;
      end if;
      if v_lead is not null then
        select d.eliminado_en is not null into v_lead_fuera from public.leads d where d.id = v_lead for key share;
      end if;
      v_motivo := case
        when v_vehiculo_fuera then 'Su vehículo está en la papelera.'
        when v_lead_fuera then 'Su cliente está en la papelera.'
        when v_clase = 'final' and v_vehiculo is null then 'Su vehículo ya no existe.'
      end;
      -- 2. Si nada la detiene, vuelve.
      if v_motivo is null then
        update public.cotizaciones x set eliminado_en = null, eliminado_por = null, lote_papelera_id = null where x.id = c.id;
      end if;
    exception
      when unique_violation then
        get stacked diagnostics v_restriccion = constraint_name;
        v_motivo := case v_restriccion
          when 'cotizaciones_encima_unica' then 'Esa cotización ya tiene otra versión nueva.'
          when 'cotizaciones_final_por_vehiculo' then 'Ese vehículo ya tiene otra cotización final.'
          else 'Choca con otro registro que ya existe.'
        end;
      when check_violation then
        -- La red por si la tabla suma reglas: su texto es nuestro.
        get stacked diagnostics v_motivo = message_text;
    end;
    if v_motivo is null then
      v_restaurados := v_restaurados || jsonb_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo);
    else
      v_pendientes := v_pendientes || jsonb_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo, 'motivo', v_motivo);
    end if;
  end loop;

  -- Cuántas siguen en la papelera del lote (a lo sumo 200 por lote; cotizaciones_lote_papelera_idx).
  select count(*) into v_quedan from (
    select 1 from public.cotizaciones x where x.lote_papelera_id = p_lote and x.eliminado_en is not null limit 201) q;
  if jsonb_array_length(v_restaurados) = 0 then
    return jsonb_build_object('actualizado_en', (select l.actualizado_en from public.lotes_papelera l where l.id = p_lote),
      'restaurados', v_restaurados, 'pendientes', v_pendientes, 'quedan', v_quedan);
  end if;
  update public.lotes_papelera l
  set resumen = l.resumen || jsonb_build_object('restaurados', coalesce((l.resumen ->> 'restaurados')::int, 0) + jsonb_array_length(v_restaurados)),
      restaurado_en = case when v_quedan = 0 then now() else l.restaurado_en end,
      restaurado_por = case when v_quedan = 0 then (select auth.uid()) else l.restaurado_por end
  where l.id = p_lote;
  v_version := public._lote_papelera_tocar(p_lote);
  perform public.registrar_actividad('papelera.restaurado', 'lotes_papelera', p_lote::text, null, null,
    jsonb_build_object('tipo', 'cotizaciones', 'cantidad', jsonb_array_length(v_restaurados)));
  return jsonb_build_object('actualizado_en', v_version, 'restaurados', v_restaurados, 'pendientes', v_pendientes, 'quedan', v_quedan);
end;
$$;

comment on function public._papelera_restaurar_cotizaciones(uuid, uuid[]) is 'Restaura del lote las cotizaciones en la papelera (p_ids nulo: todas), una a una por id: toma antes sus vehículos y sus leads for key share; lo que choca con otra viva, cuelga de un vehículo o cliente en la papelera o es una final sin vehículo queda en pendientes con su motivo. Devuelve {actualizado_en, restaurados, pendientes, quedan}. De nadie: la llaman cotizaciones_papelera_restaurar y papelera_restaurar.';
revoke all on function public._papelera_restaurar_cotizaciones(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public._papelera_restaurar_cotizaciones(uuid, uuid[]) to service_role;

create function public.cotizaciones_papelera_restaurar(p_lote uuid, p_actualizado_en_esperado timestamptz, p_cotizaciones uuid[] default null) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare l public.lotes_papelera;
begin
  perform public.assert_activo();
  -- Sin candado: quien no puede nunca espera el del lote.
  select * into l from public.lotes_papelera x
   where x.id = p_lote and x.tipo = 'cotizaciones' and x.purgado_en is null and x.restaurado_en is null;
  if not found then
    raise exception 'Ese lote ya no está en la papelera.' using errcode = 'PT409';
  end if;
  if l.creado_por is distinct from (select auth.uid()) and not public.tiene_permiso('cotizaciones.papelera.purgar') then
    raise exception 'Sólo lo restaura quien lo envió o quien puede vaciar la papelera.' using errcode = '42501';
  end if;
  -- El lote tomado (no se borra: no choca con quien lo nombra) y otra vez las dos miradas.
  select * into l from public.lotes_papelera x
   where x.id = p_lote and x.tipo = 'cotizaciones' and x.purgado_en is null and x.restaurado_en is null for no key update;
  if not found then
    raise exception 'Ese lote ya no está en la papelera.' using errcode = 'PT409';
  end if;
  if l.creado_por is distinct from (select auth.uid()) and not public.tiene_permiso('cotizaciones.papelera.purgar') then
    raise exception 'Sólo lo restaura quien lo envió o quien puede vaciar la papelera.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;
  if l.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('lotes_papelera', l.id, l.actualizado_en, 'este lote de la papelera');
  end if;
  return public._papelera_restaurar_cotizaciones(l.id, p_cotizaciones);
end;
$$;

comment on function public.cotizaciones_papelera_restaurar(uuid, timestamptz, uuid[]) is 'Restaura un lote de la papelera de cotizaciones (o sólo p_cotizaciones) con la versión que quien llama tenía en pantalla: quien lo envió o quien tiene cotizaciones.papelera.purgar, mirado antes de tomar el lote. Lo que no puede volver queda en pendientes con su motivo. Devuelve {actualizado_en, restaurados: [{id, numero, titulo}], pendientes: [{id, numero, titulo, motivo}], quedan}.';
revoke all on function public.cotizaciones_papelera_restaurar(uuid, timestamptz, uuid[]) from public, anon;
grant execute on function public.cotizaciones_papelera_restaurar(uuid, timestamptz, uuid[]) to authenticated, service_role;

create or replace function public.papelera_restaurar(p_lote uuid)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare v_tipo public.tipo_lote_papelera; v_por uuid; v_restaurado timestamptz; r jsonb;
begin
  perform public.assert_activo();
  select tipo, creado_por into v_tipo, v_por from public.lotes_papelera where id = p_lote and purgado_en is null;
  if not found then raise exception 'Lote inexistente o ya purgado.' using errcode = '22023'; end if;
  perform public._papelera_solo_cotizaciones(v_tipo);
  if v_por <> (select auth.uid()) and not public.tiene_permiso('cotizaciones.papelera.purgar') then raise exception 'Sólo quien lo envió (o quien purga) lo restaura.' using errcode = '42501'; end if;
  select l.restaurado_en into v_restaurado from public.lotes_papelera l where l.id = p_lote and l.purgado_en is null for no key update;
  if not found then raise exception 'Lote inexistente o ya purgado.' using errcode = '22023'; end if;
  -- Uno ya restaurado no se vuelve a sellar.
  if v_restaurado is not null then return 0; end if;
  r := public._papelera_restaurar_cotizaciones(p_lote, null);
  -- Todo o nada: el motivo de la primera pendiente (por id) deshace lo restaurado.
  if jsonb_array_length(r -> 'pendientes') > 0 then
    raise exception '%', r -> 'pendientes' -> 0 ->> 'motivo' using errcode = 'PT409';
  end if;
  return jsonb_array_length(r -> 'restaurados');
end;
$$;

-- `create or replace` conserva los privilegios; se repiten explícitos (redundante a propósito).
revoke all on function public.papelera_restaurar(uuid) from public, anon;
grant execute on function public.papelera_restaurar(uuid) to authenticated, service_role;
