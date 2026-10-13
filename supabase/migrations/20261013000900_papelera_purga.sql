-- Purga de vehículos: manual y automática, la misma función. Escrito a mano.
--
-- Hasta acá `papelera_purgar(p_lote)` borraba el lote entero sin versión, sin mirar qué se llevaba
-- la cascada (pagos, gastos, documentos) y encolando sólo la foto completa, con 24 h de espera; y
-- `papelera_purgar_vencidos()` abortaba entera si un solo lote fallaba. Ahora:
--   vehiculos_papelera_purgar() — el lote o algunos de sus vehículos, con la versión del lote
--   papelera_purgar_vencidos()  — lo que pasó `papelera_dias`; la corre el job, sin sesión
-- Las dos llaman a `_papelera_purgar_vehiculos()`, que vuelve a preguntar qué no se purga
-- (`_vehiculo_motivo_de_bloqueo`): la automática no puede purgar lo que la manual bloquearía.
-- Lo bloqueado se queda en la papelera, y la lista dice por qué.
--
-- Purgar borra filas y **encola** objetos: los archivos sólo se borran por la API de Storage, y eso
-- lo hace la función `storage-gc` (`…001000`).

-- ---------------------------------------------------------------------------
-- La cola: cuánto espera un objeto, y cómo se encola
-- ---------------------------------------------------------------------------
-- La espera protege el «Deshacer» de una foto eliminada y las subidas en curso. `encolado_en` es
-- «desde cuándo corre la espera»: el barrido de huérfanos ya lo retro-fecha a la edad del objeto.
create or replace function public._gracia_de_storage()
returns interval language sql immutable set search_path = '' as $$ select interval '24 hours' $$;
revoke all on function public._gracia_de_storage() from public, anon, authenticated;

-- Encola sólo lo que ya nadie referencia. Con `p_ya`, sin espera: es lo de un vehículo purgado, que
-- no tiene «Deshacer». Si alguien volviera a referenciar el objeto, `storage_gc_rescatar()` lo saca
-- de la cola o, si la limpieza ya lo reclamó, se niega: el candado es el mismo.
create or replace function public._encolar_para_limpiar(p_bucket text, p_rutas text[], p_ya boolean)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into public.cola_gc_storage as c (bucket, ruta, encolado_en)
  select distinct p_bucket, r, case when p_ya then now() - public._gracia_de_storage() - interval '1 second' else now() end
  from unnest(p_rutas) as r
  where r is not null and public.storage_refcount(p_bucket, r) = 0
  on conflict (bucket, ruta) do update set encolado_en = least(c.encolado_en, excluded.encolado_en) where c.reclamado_en is null;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public._encolar_para_limpiar(text, text[], boolean) from public, anon, authenticated;

-- Igual que antes, con la espera en un solo lugar.
create or replace function public.storage_gc_reclamar(p_max int default 100)
returns table (bucket text, ruta text) language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  r record;
  v_vencido constant interval := interval '1 hour';
begin
  perform public.storage_gc_encolar_huerfanos('vehiculos', public._gracia_de_storage());
  for r in
    select c.bucket as su_bucket, c.ruta as su_ruta
    from public.cola_gc_storage c
    where c.encolado_en < now() - public._gracia_de_storage()
      and (c.reclamado_en is null or c.reclamado_en < now() - v_vencido)
    order by c.encolado_en
    limit greatest(coalesce(p_max, 0), 0)
  loop
    -- Alguien lo está referenciando ahora mismo: se deja para la próxima pasada.
    if not pg_try_advisory_xact_lock(public._candado_de_objeto(r.su_bucket, r.su_ruta)) then
      continue;
    end if;
    -- Con el candado tomado, toda referencia confirmada ya se ve, y ninguna puede nacer.
    if public.storage_refcount(r.su_bucket, r.su_ruta) > 0 then
      delete from public.cola_gc_storage c where c.bucket = r.su_bucket and c.ruta = r.su_ruta;
    else
      update public.cola_gc_storage c set reclamado_en = now()
      where c.bucket = r.su_bucket and c.ruta = r.su_ruta;
      if found then
        bucket := r.su_bucket;
        ruta := r.su_ruta;
        return next;
      end if;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Purgar
-- ---------------------------------------------------------------------------
-- Sin permiso ni versión: eso lo ponen quienes la llaman. Cada vehículo en su subtransacción.
-- De cada uno junta sus fotos (los dos tamaños), lo que haya quedado en su carpeta del bucket, sus
-- documentos y los adjuntos de las cotizaciones que viajaron con él; borra; y encola lo que quedó
-- sin referencia. Las fotos, sin espera; documentos y adjuntos, con las 24 h (sus tablas no tienen
-- el trigger de rescate).
create or replace function public._papelera_purgar_vehiculos(p_lote uuid, p_vehiculos uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.vehiculos; v_motivo text; v_fotos text[]; v_documentos text[]; v_adjuntos text[]; v_quedan int; v_version timestamptz;
  v_purgados jsonb := '[]'::jsonb; v_bloqueados jsonb := '[]'::jsonb;
begin
  for v in
    select * from public.vehiculos x
    where x.lote_papelera_id = p_lote and x.eliminado_en is not null and (p_vehiculos is null or x.id = any (p_vehiculos))
    order by x.id for update
  loop
    v_motivo := public._vehiculo_motivo_de_bloqueo(v, false);
    if v_motivo is null then
      begin
        select array_agg(distinct r) into v_fotos from (
          select unnest(array[i.ruta, i.ruta_miniatura]) as r from public.vehiculos_imagenes i where i.vehiculo_id = v.id
          union all
          select o.name from storage.objects o where o.bucket_id = 'vehiculos' and o.name like v.id::text || '/%'
          union all
          select c.ruta from public.cola_gc_storage c where c.bucket = 'vehiculos' and c.ruta like v.id::text || '/%' and c.reclamado_en is null
        ) x;
        select array_agg(d.ruta) into v_documentos from public.documentos d where d.vehiculo_id = v.id and d.ruta is not null;
        select array_agg(a.ruta) into v_adjuntos
        from public.cotizaciones_adjuntos a join public.cotizaciones c on c.id = a.cotizacion_id
        where c.vehiculo_id = v.id and c.lote_papelera_id = p_lote;

        delete from public.cotizaciones c where c.vehiculo_id = v.id and c.lote_papelera_id = p_lote;
        delete from public.vehiculos x where x.id = v.id;

        perform public._encolar_para_limpiar('vehiculos', v_fotos, true);
        perform public._encolar_para_limpiar('documentos', v_documentos, false);
        perform public._encolar_para_limpiar('cotizaciones', v_adjuntos, false);
        v_purgados := v_purgados || jsonb_build_object('id', v.id, 'numero', v.numero, 'titulo', v.titulo);
      exception when foreign_key_violation then
        v_motivo := 'Otros registros dependen de él.';
      end;
    end if;
    if v_motivo is not null then
      v_bloqueados := v_bloqueados || jsonb_build_object('id', v.id, 'numero', v.numero, 'titulo', v.titulo, 'motivo', v_motivo);
    end if;
  end loop;

  select count(*) into v_quedan from public.vehiculos x where x.lote_papelera_id = p_lote and x.eliminado_en is not null;
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
    jsonb_build_object('cantidad', jsonb_array_length(v_purgados), 'automatica', (select auth.uid()) is null));
  return jsonb_build_object('actualizado_en', v_version, 'purgados', v_purgados, 'bloqueados', v_bloqueados, 'quedan', v_quedan);
end;
$$;
revoke all on function public._papelera_purgar_vehiculos(uuid, uuid[]) from public, anon, authenticated;

-- El lote entero (`p_vehiculos` nulo) o algunos de sus vehículos. Si otra persona restauró o purgó
-- algo de ese lote desde que se lo miró, es `PT409` y dice quién.
create or replace function public.vehiculos_papelera_purgar(p_lote uuid, p_actualizado_en_esperado timestamptz, p_vehiculos uuid[] default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare l public.lotes_papelera;
begin
  perform public.assert_activo();
  if not public.tiene_permiso('vehiculos.papelera.purgar') then
    raise exception 'No tienes permiso para purgar la papelera.' using errcode = '42501';
  end if;
  select * into l from public.lotes_papelera x where x.id = p_lote and x.tipo = 'vehiculos' for update;
  if not found then
    raise exception 'Ese lote ya no está en la papelera.' using errcode = 'PT409';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if l.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('lotes_papelera', l.id, l.actualizado_en, 'este lote de la papelera');
  end if;
  return public._papelera_purgar_vehiculos(l.id, p_vehiculos);
end;
$$;
revoke all on function public.vehiculos_papelera_purgar(uuid, timestamptz, uuid[]) from public, anon;
grant execute on function public.vehiculos_papelera_purgar(uuid, timestamptz, uuid[]) to authenticated;

-- La automática: los lotes de vehículos que pasaron `papelera_dias`. Cada lote en su
-- subtransacción: uno que falle no frena a los demás, y queda dicho en el log de la base.
-- Sólo vehículos por ahora: los lotes de leads y de cotizaciones se purgan con las reglas que
-- traigan sus fases (hoy `papelera_purgar()` los borra sin mirar nada).
create or replace function public.papelera_purgar_vencidos()
returns int language plpgsql security definer set search_path = '' as $$
declare v_dias int; r record; v_resultado jsonb; total int := 0;
begin
  select e.papelera_dias into v_dias from public.ajustes_empresa e where e.id = 1;
  for r in
    select l.id from public.lotes_papelera l
    where l.tipo = 'vehiculos' and l.creado_en < now() - make_interval(days => v_dias)
      and exists (select 1 from public.vehiculos v where v.lote_papelera_id = l.id and v.eliminado_en is not null)
    order by l.creado_en
  loop
    begin
      perform 1 from public.lotes_papelera l where l.id = r.id for update;
      v_resultado := public._papelera_purgar_vehiculos(r.id, null);
      total := total + jsonb_array_length(v_resultado -> 'purgados');
    exception when others then
      raise warning 'papelera: no se pudo purgar el lote %: %', r.id, sqlerrm;
    end;
  end loop;
  return total;
end;
$$;
revoke all on function public.papelera_purgar_vencidos() from public, anon, authenticated;
grant execute on function public.papelera_purgar_vencidos() to service_role;

comment on table public.cola_gc_storage is 'Objetos de Storage que quizá ya nadie referencia: los encolan la purga de la papelera, el borrado de una foto y el barrido de huérfanos. encolado_en es desde cuándo corre la espera de 24 h (la purga y el barrido lo retro-fechan). storage_gc_reclamar() recuenta bajo candado y marca reclamado_en; sólo lo reclamado se borra por la API, y storage_gc_confirmar() lo saca. Sólo service_role.';
