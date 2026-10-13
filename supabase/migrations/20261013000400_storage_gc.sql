-- Limpieza de Storage: reclamar antes de borrar. Escrito a mano.
--
-- Un objeto se nombra por el hash de su contenido, así que borrar uno exige saber que ninguna fila
-- lo referencia. «Contar y después borrar» tiene una carrera: entre las dos cosas puede nacer una
-- fila que queda apuntando a nada. Acá el borrado pasa por tres pasos, y los dos primeros son SQL:
--   1. storage_gc_reclamar()  — con el candado del objeto tomado, recuenta. Si hay referencias, lo
--                               saca de la cola; si no, lo marca `reclamado_en` y lo devuelve.
--   2. (la edge function storage-gc borra por la API lo que le devolvieron)
--   3. storage_gc_confirmar() — saca de la cola lo que se borró.
-- Quien hace nacer una referencia llama a storage_gc_rescatar(): toma el mismo candado, y si el
-- objeto está reclamado se niega (reintentable: la persona vuelve a subir el archivo). Reclamar y
-- nacer se excluyen por el candado, gane quien gane.
--
-- El candado es consultivo y por objeto (no una fila de la cola): un objeto puede no estar en la
-- cola todavía cuando alguien lo está referenciando.

create or replace function public._candado_de_objeto(p_bucket text, p_ruta text)
returns bigint language sql immutable set search_path = '' as $$
  select hashtextextended('storage:' || p_bucket || '/' || p_ruta, 0);
$$;
revoke all on function public._candado_de_objeto(text, text) from public, anon, authenticated;

-- Lo llama, dentro de su transacción, quien está por referenciar un objeto (hoy, el trigger de
-- `vehiculos_imagenes`). Espera a que termine un reclamo en curso y después mira la cola.
create or replace function public.storage_gc_rescatar(p_bucket text, p_ruta text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_reclamado timestamptz; v_estaba boolean := false;
begin
  perform pg_advisory_xact_lock(public._candado_de_objeto(p_bucket, p_ruta));
  select c.reclamado_en, true into v_reclamado, v_estaba
  from public.cola_gc_storage c where c.bucket = p_bucket and c.ruta = p_ruta;
  if not coalesce(v_estaba, false) then
    return;
  end if;
  if v_reclamado is not null then
    raise exception 'Ese archivo se está limpiando. Vuelve a subirlo en un momento.';
  end if;
  delete from public.cola_gc_storage c where c.bucket = p_bucket and c.ruta = p_ruta;
end;
$$;
revoke all on function public.storage_gc_rescatar(text, text) from public, anon, authenticated;

-- Lo que quedó en el bucket sin ninguna fila (una subida cuya fila no llegó a guardarse, una
-- pestaña cerrada a medias): no depende de que el navegador avise. Entra a la cola con la edad
-- del objeto, así que lo viejo es reclamable en la misma pasada.
create or replace function public.storage_gc_encolar_huerfanos(p_bucket text, p_gracia interval)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into public.cola_gc_storage (bucket, ruta, encolado_en)
  select o.bucket_id, o.name, o.created_at
  from storage.objects o
  where o.bucket_id = p_bucket
    and o.created_at < now() - p_gracia
    and public.storage_refcount(o.bucket_id, o.name) = 0
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Hasta `p_max` objetos listos para borrar. Sólo mira lo que lleva más de 24 h en la cola (el
-- «Deshacer» de 10 s y cualquier subida en curso caen siempre adentro) y lo que se reclamó hace
-- más de una hora sin confirmarse (la función que borra se cayó a mitad: se reintenta).
create or replace function public.storage_gc_reclamar(p_max int default 100)
returns table (bucket text, ruta text) language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  r record;
  v_gracia constant interval := interval '24 hours';
  v_vencido constant interval := interval '1 hour';
begin
  perform public.storage_gc_encolar_huerfanos('vehiculos', v_gracia);
  for r in
    select c.bucket as su_bucket, c.ruta as su_ruta
    from public.cola_gc_storage c
    where c.encolado_en < now() - v_gracia
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

-- Lo que la función ya borró por la API. Sólo saca lo reclamado: una ruta que nadie reclamó no
-- se confirma por error.
create or replace function public.storage_gc_confirmar(p_bucket text, p_rutas text[])
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  delete from public.cola_gc_storage c
  where c.bucket = p_bucket and c.ruta = any (p_rutas) and c.reclamado_en is not null;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.storage_gc_encolar_huerfanos(text, interval), public.storage_gc_reclamar(int), public.storage_gc_confirmar(text, text[]) from public, anon, authenticated;
grant execute on function public.storage_gc_encolar_huerfanos(text, interval), public.storage_gc_reclamar(int), public.storage_gc_confirmar(text, text[]) to service_role;

create index if not exists cola_gc_storage_edad_idx on public.cola_gc_storage (encolado_en);
