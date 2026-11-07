-- Purgar la papelera de cotizaciones por lote (4.24-1b).
--
-- `papelera_purgar('cotizaciones')` encolaba los adjuntos del lote sin mirar si otra cotización nombraba su ruta, y antes de borrar; después un `delete`
-- masivo que una cotización con comprobante (la FK `restrict` da 23001) abortaba entero. Ahora un ayudante purga una a una, cada una en su bloque: lo que
-- otra tabla necesita queda «bloqueado» y sigue en la papelera (P4 a), el resto se borra con sus hijas en cascada y sus rutas se encolan después del
-- borrado, sólo si ya nadie las nombra (`_encolar_para_limpiar`, por refcount).
--
-- La cotización se toma `for update`: el `delete` pide ese candado, y tomarlo de entrada evita subirlo a mitad (restaurar la toma `for no key update`).
-- La propia, `cotizaciones_papelera_purgar(lote, versión, [ids])`, como la de vehículos: la clave `cotizaciones.papelera.purgar` antes de mirar el lote
-- (también el propio), y la versión del lote. La genérica conserva firma, retorno y textos (P2 a), y ya no aborta con una bloqueada.
-- Pruebas: `supabase/tests/areas/papelera/purgar.sql`.

create function public._papelera_purgar_cotizaciones(p_lote uuid, p_ids uuid[]) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  c record; v_rutas text[]; v_quedan int; v_version timestamptz;
  v_purgados jsonb := '[]'::jsonb; v_bloqueados jsonb := '[]'::jsonb;
begin
  for c in
    select x.id, x.numero, coalesce(x.titulo, 'Cotización #' || x.numero) as titulo from public.cotizaciones x
     where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_ids is null or x.id = any (p_ids))
     order by x.id for update
  loop
    begin
      select array_agg(a.ruta) into v_rutas from public.cotizaciones_adjuntos a where a.cotizacion_id = c.id;
      delete from public.cotizaciones x where x.id = c.id;
      -- Después del borrado: el refcount ya no la cuenta (cotizaciones_adjuntos_ruta_idx).
      perform public._encolar_para_limpiar('cotizaciones', v_rutas, false);
      v_purgados := v_purgados || jsonb_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo);
    exception when foreign_key_violation or restrict_violation then
      v_bloqueados := v_bloqueados || jsonb_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo, 'motivo', 'Otros registros dependen de ella.');
    end;
  end loop;

  -- Cuántas siguen en la papelera del lote (a lo sumo 200 por lote; cotizaciones_lote_papelera_idx).
  select count(*) into v_quedan from (
    select 1 from public.cotizaciones x where x.lote_papelera_id = p_lote and x.eliminado_en is not null limit 201) q;
  if jsonb_array_length(v_purgados) = 0 then
    return jsonb_build_object('actualizado_en', (select l.actualizado_en from public.lotes_papelera l where l.id = p_lote),
      'purgados', v_purgados, 'bloqueados', v_bloqueados, 'quedan', v_quedan);
  end if;
  update public.lotes_papelera l
  set resumen = l.resumen || jsonb_build_object('purgados', coalesce((l.resumen ->> 'purgados')::int, 0) + jsonb_array_length(v_purgados)),
      purgado_en = case when v_quedan = 0 then now() else l.purgado_en end
  where l.id = p_lote;
  v_version := public._lote_papelera_tocar(p_lote);
  perform public.registrar_actividad('papelera.purgado', 'lotes_papelera', p_lote::text, null, null,
    jsonb_build_object('tipo', 'cotizaciones', 'cantidad', jsonb_array_length(v_purgados), 'automatica', (select auth.uid()) is null));
  return jsonb_build_object('actualizado_en', v_version, 'purgados', v_purgados, 'bloqueados', v_bloqueados, 'quedan', v_quedan);
end;
$$;

comment on function public._papelera_purgar_cotizaciones(uuid, uuid[]) is 'Borra para siempre del lote las cotizaciones en la papelera (p_ids nulo: todas), una a una por id, con sus hijas; encola las rutas de sus adjuntos que ya nadie nombra; lo que otra tabla necesita (un comprobante) queda en bloqueados. Devuelve {actualizado_en, purgados, bloqueados, quedan}. De nadie: la llaman cotizaciones_papelera_purgar, papelera_purgar y papelera_purgar_vencidos.';
revoke all on function public._papelera_purgar_cotizaciones(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public._papelera_purgar_cotizaciones(uuid, uuid[]) to service_role;

create function public.cotizaciones_papelera_purgar(p_lote uuid, p_actualizado_en_esperado timestamptz, p_cotizaciones uuid[] default null) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare l public.lotes_papelera;
begin
  perform public.assert_activo();
  -- Antes de mirar el lote: sin la clave no se sabe ni si existe.
  if not public.tiene_permiso('cotizaciones.papelera.purgar') then
    raise exception 'No tienes permiso para purgar la papelera.' using errcode = '42501';
  end if;
  select * into l from public.lotes_papelera x
   where x.id = p_lote and x.tipo = 'cotizaciones' and x.purgado_en is null and x.restaurado_en is null for no key update;
  if not found then
    raise exception 'Ese lote ya no está en la papelera.' using errcode = 'PT409';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;
  if l.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('lotes_papelera', l.id, l.actualizado_en, 'este lote de la papelera');
  end if;
  return public._papelera_purgar_cotizaciones(l.id, p_cotizaciones);
end;
$$;

comment on function public.cotizaciones_papelera_purgar(uuid, timestamptz, uuid[]) is 'Purga un lote de la papelera de cotizaciones (o sólo p_cotizaciones) con la versión que quien llama tenía en pantalla; pide cotizaciones.papelera.purgar antes de mirar el lote. Lo bloqueado se queda. Devuelve {actualizado_en, purgados: [{id, numero, titulo}], bloqueados: [{id, numero, titulo, motivo}], quedan}.';
revoke all on function public.cotizaciones_papelera_purgar(uuid, timestamptz, uuid[]) from public, anon;
grant execute on function public.cotizaciones_papelera_purgar(uuid, timestamptz, uuid[]) to authenticated, service_role;

create or replace function public.papelera_purgar(p_lote uuid)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare v_tipo public.tipo_lote_papelera; r jsonb;
begin
  if (select auth.uid()) is not null and not public.tiene_permiso('cotizaciones.papelera.purgar') then raise exception 'Sin permiso para purgar.' using errcode = '42501'; end if;
  -- Sin candado: un lote de otro tipo da su 22023 sin esperar a nadie.
  select tipo into v_tipo from public.lotes_papelera where id = p_lote and purgado_en is null and restaurado_en is null;
  if not found then return 0; end if;
  perform public._papelera_solo_cotizaciones(v_tipo);
  perform 1 from public.lotes_papelera l where l.id = p_lote and l.purgado_en is null and l.restaurado_en is null for no key update;
  if not found then return 0; end if;
  r := public._papelera_purgar_cotizaciones(p_lote, null);
  return jsonb_array_length(r -> 'purgados');
end;
$$;

-- `create or replace` conserva los privilegios; se repiten explícitos (redundante a propósito).
revoke all on function public.papelera_purgar(uuid) from public, anon;
grant execute on function public.papelera_purgar(uuid) to authenticated, service_role;
