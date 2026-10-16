-- Escala (9e): los jobs, con tope por lote y por corrida.
--
-- Medido con 100.000 filas por purgar (`pnpm db:medir:volumen`, `supabase/tests/medir-jobs.sql`):
--   papelera-purgar          29 s en una sola corrida (500 lotes de 200 leads) y sin tope por corrida;
--   limpieza-automatica      24 s: movía 200 y seguía revisando los 100.800 restantes sólo para contarlos;
--   importaciones-vinculos   0,85 s, un solo DELETE de 100.000 filas;
--   apibara-consultas        0,08 s, un solo DELETE de 100.000 filas;
--   storage-gc               0,9 s la primera vez (encolaba los 100.000 huérfanos de una vez) y 90 ms
--                            después (el anti-join sobre todo el bucket, hasta 5 veces por corrida).
-- Cada job pasa a trabajar por lotes con un tope por lote y otro por corrida; lo que no entra queda para
-- la próxima:
--   * `apibara_consultas_purgar` e `importaciones_vinculos_purgar`: lotes de 10.000, hasta 10 por corrida.
--   * `papelera_purgar_vencidos`: hasta 50 lotes por corrida (~3 s) y corre cada hora, no una vez al día
--     (50 por hora son 1.200 lotes, 240.000 leads, por día). El filtro nombra `purgado_en is null and
--     restaurado_en is null` para usar `lotes_papelera_tipo_idx`.
--   * `limpieza_automatica_correr`: con el lote lleno (200) revisa a lo sumo 1.000 más (para decir cuántos
--     esperan) y corta; `vehiculos_limpieza_orden_idx` le da el orden sin ordenar 100.000 filas.
--   * `storage_gc_encolar_huerfanos`: encola a lo sumo 2.000 por pasada.

create index if not exists vehiculos_limpieza_orden_idx
  on public.vehiculos ((coalesce(subasta_fin_en, subasta_en, apibara_sync_en)), id)
  where eliminado_en is null and importado_apibara;

-- apibara_consultas: se borran las de más de 48 h, de a 10.000 por `apibara_consultas_creado_en_idx`.
create or replace function public.apibara_consultas_purgar()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n integer; v_total integer := 0; i integer;
begin
  for i in 1..10 loop
    delete from public.apibara_consultas c
     where c.id in (select x.id from public.apibara_consultas x
                     where x.creado_en < now() - interval '48 hours' order by x.creado_en limit 10000);
    get diagnostics v_n = row_count;
    v_total := v_total + v_n;
    exit when v_n < 10000;
  end loop;
  return v_total;
end;
$$;

-- importaciones_leads: los vínculos de una importación vencida (deshecha o con más de 7 días), de a
-- 10.000 por la clave primaria `(importacion_id, lead_id)`.
create or replace function public.importaciones_vinculos_purgar()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n integer; v_total integer := 0; i integer;
begin
  for i in 1..10 loop
    delete from public.importaciones_leads il
     where (il.importacion_id, il.lead_id) in (
       select y.importacion_id, y.lead_id from public.importaciones_leads y
        where y.importacion_id in (
          select im.id from public.importaciones im
           where im.entidad = 'leads'
             and coalesce(im.deshecha_en, public._importacion_vence_en(im)) < now() - interval '7 days')
        limit 10000);
    get diagnostics v_n = row_count;
    v_total := v_total + v_n;
    exit when v_n < 10000;
  end loop;
  return v_total;
end;
$$;

-- La papelera: hasta 50 lotes vencidos por corrida, del más viejo al más nuevo.
create or replace function public.papelera_purgar_vencidos()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_dias int; r record; v_resultado jsonb; total int := 0;
begin
  select e.papelera_dias into v_dias from public.ajustes_empresa e where e.id = 1;
  for r in
    select l.id, l.tipo from public.lotes_papelera l
    where l.tipo in ('vehiculos', 'leads') and l.purgado_en is null and l.restaurado_en is null
      and l.creado_en < now() - make_interval(days => v_dias)
      and ((l.tipo = 'vehiculos' and exists (select 1 from public.vehiculos v where v.lote_papelera_id = l.id and v.eliminado_en is not null))
        or (l.tipo = 'leads' and exists (select 1 from public.leads x where x.lote_papelera_id = l.id and x.eliminado_en is not null)))
    order by l.creado_en
    limit 50
  loop
    begin
      perform 1 from public.lotes_papelera l where l.id = r.id for update;
      if r.tipo = 'vehiculos' then
        v_resultado := public._papelera_purgar_vehiculos(r.id, null);
      else
        v_resultado := public._papelera_purgar_leads(r.id, null);
      end if;
      total := total + jsonb_array_length(v_resultado -> 'purgados');
    exception when others then
      raise warning 'papelera: no se pudo purgar el lote %: %', r.id, sqlerrm;
    end;
  end loop;
  return total;
end;
$$;

-- Corre cada hora (era una vez al día): 50 lotes por corrida alcanzan para un día movido.
do $$
begin
  if to_regprocedure('cron.schedule(text, text, text)') is null then
    return;
  end if;
  perform cron.schedule('papelera-purgar', '30 * * * *', 'select public.papelera_purgar_vencidos()');
end $$;

-- La limpieza automática: el mismo job, con el recorte de lo que revisa tras llenar el lote.
CREATE OR REPLACE FUNCTION public.limpieza_automatica_correr(p_ahora timestamp with time zone DEFAULT now(), p_origenes uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  a public.ajustes_empresa; v public.vehiculos; r record;
  v_hoy date; v_corrida uuid; v_lote uuid; v_ancla text;
  v_parcial boolean := p_origenes is not null;
  v_tope constant int := 200;
  -- Cuántas filas más se revisan después de llenar el lote, para contar lo que espera a la noche siguiente.
  v_revision constant int := 1000;
  v_tras_tope int := 0;
  v_movidos int := 0; v_pendientes int := 0; v_saltados jsonb := '{}'::jsonb;
begin
  select * into a from public.ajustes_empresa e where e.id = 1;
  if not a.limpieza_automatica then
    return jsonb_build_object('estado', 'apagada');
  end if;
  v_hoy := (p_ahora at time zone a.zona_horaria)::date;

  if v_parcial then
    insert into public.limpieza_corridas (fecha, parcial) values (v_hoy, true) returning id into v_corrida;
  else
    if (p_ahora at time zone a.zona_horaria)::time < make_time(public._limpieza_hora(), 0, 0) then
      return jsonb_build_object('estado', 'temprano');
    end if;
    -- La corrida del día se reserva antes de mover nada: dos a la vez no duplican lotes.
    insert into public.limpieza_corridas (fecha, parcial) values (v_hoy, false)
    on conflict (fecha) where not parcial do nothing returning id into v_corrida;
    if v_corrida is null then
      return jsonb_build_object('estado', 'ya_corrio', 'fecha', v_hoy);
    end if;
  end if;

  for r in
    select x.id from public.vehiculos x join public.origenes o on o.id = x.origen_id
    where x.eliminado_en is null and x.importado_apibara and o.tipo = 'subasta'
      and (p_origenes is null or x.origen_id = any (p_origenes))
      and (x.subasta_en is not null or x.subasta_fin_en is not null or x.estado_subasta in ('terminada', 'vendida'))
    order by coalesce(x.subasta_fin_en, x.subasta_en, x.apibara_sync_en), x.id
  loop
    -- Con el lote lleno no hace falta revisar los 100.000 que siguen: se cuentan los próximos
    -- `v_revision` (vencen de a poco: van ordenados por su fecha) y el resto queda para mañana.
    if v_movidos >= v_tope then
      v_tras_tope := v_tras_tope + 1;
      exit when v_tras_tope > v_revision;
    end if;
    begin
      select * into v from public.vehiculos x where x.id = r.id and x.eliminado_en is null for update skip locked;
      if not found then
        v_saltados := v_saltados || jsonb_build_object('ocupado', coalesce((v_saltados ->> 'ocupado')::int, 0) + 1);
        continue;
      end if;
      -- Se decide de nuevo, con la fila ya bloqueada. Todavía no le toca: no es de esta corrida.
      if public._limpieza_vence(v, p_ahora) is null or public._limpieza_vence(v, p_ahora) > v_hoy then
        continue;
      end if;
      v_ancla := public._limpieza_ancla(v);
      if v_ancla is not null then
        v_saltados := v_saltados || jsonb_build_object(v_ancla, coalesce((v_saltados ->> v_ancla)::int, 0) + 1);
        continue;
      end if;
      if v_movidos >= v_tope then
        v_pendientes := v_pendientes + 1;
        continue;
      end if;
      if v_lote is null then
        insert into public.lotes_papelera (tipo, creado_por, es_limpieza, resumen)
        values ('vehiculos', null, true, jsonb_build_object('cantidad', 0, 'restaurados', 0, 'purgados', 0))
        returning id into v_lote;
      end if;
      perform public._vehiculo_a_lote(v, v_lote);
      v_movidos := v_movidos + 1;
    exception when others then
      raise warning 'limpieza: no se pudo mover el vehículo %: %', r.id, sqlerrm;
      v_saltados := v_saltados || jsonb_build_object('error', coalesce((v_saltados ->> 'error')::int, 0) + 1);
    end;
  end loop;

  if v_lote is not null then
    update public.lotes_papelera l set resumen = jsonb_build_object('cantidad', v_movidos, 'restaurados', 0, 'purgados', 0)
    where l.id = v_lote;
    perform public._lote_papelera_tocar(v_lote);
  end if;
  update public.limpieza_corridas c
  set lote_id = v_lote, movidos = v_movidos, saltados = v_saltados, pendientes = v_pendientes, termino_en = clock_timestamp()
  where c.id = v_corrida;
  perform public.registrar_actividad('limpieza.corrida', 'limpieza_corridas', v_corrida::text, null, null,
    jsonb_build_object('fecha', v_hoy, 'movidos', v_movidos, 'saltados', v_saltados, 'pendientes', v_pendientes,
      'lote', v_lote, 'parcial', v_parcial));
  return jsonb_build_object('estado', 'corrida', 'corrida', v_corrida, 'fecha', v_hoy, 'lote', v_lote,
    'movidos', v_movidos, 'saltados', v_saltados, 'pendientes', v_pendientes);
end;
$function$;

-- storage-gc: encola a lo sumo 2.000 huérfanos por pasada (el resto, en la siguiente).
create or replace function public.storage_gc_encolar_huerfanos(p_bucket text, p_gracia interval)
returns integer language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if p_bucket = 'vehiculos' then
    insert into public.cola_gc_storage (bucket, ruta, encolado_en)
    select o.bucket_id, o.name, o.created_at
    from storage.objects o
    where o.bucket_id = 'vehiculos'
      and o.created_at < now() - p_gracia
      and not exists (select 1 from public.vehiculos_imagenes i where i.ruta = o.name)
      and not exists (select 1 from public.vehiculos_imagenes i where i.ruta_miniatura = o.name)
      and not exists (select 1 from public.cola_gc_storage c where c.bucket = 'vehiculos' and c.ruta = o.name)
    limit 2000
    on conflict do nothing;
  else
    insert into public.cola_gc_storage (bucket, ruta, encolado_en)
    select o.bucket_id, o.name, o.created_at
    from storage.objects o
    where o.bucket_id = p_bucket
      and o.created_at < now() - p_gracia
      and public.storage_refcount(o.bucket_id, o.name) = 0
    limit 2000
    on conflict do nothing;
  end if;
  get diagnostics n = row_count;
  return n;
end;
$$;
