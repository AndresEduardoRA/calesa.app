-- storage-gc: el barrido de huérfanos con un cursor persistido (cierre 1 de la Fase 3).
--
-- Medido: `storage_gc_encolar_huerfanos` hacía un anti-join sobre el bucket entero en cada pasada (hasta 5 por corrida de la
-- función): con 301.000 objetos ya encolados, 208 ms aunque no quedara nada que encolar, y crece con el bucket. Ahora cada
-- pasada examina los 10.000 objetos siguientes por nombre (`bucketid_objname`, el índice único de `storage.objects`), encola
-- los huérfanos de esa ventana y deja el último nombre en `cola_gc_barrido`; al llegar al final, la vuelta siguiente empieza
-- de nuevo. El tope pasa a ser lo **examinado**, no lo encolado. Un objeto de menos de 24 h (la gracia) que la ventana pasa
-- lo toma la vuelta siguiente.

create table if not exists public.cola_gc_barrido (
  bucket         text primary key,
  ultimo_nombre  text not null default '',
  vuelta_desde   timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
alter table public.cola_gc_barrido enable row level security;
revoke all on table public.cola_gc_barrido from anon, authenticated;
grant select, insert, update, delete on table public.cola_gc_barrido to service_role;

create or replace function public.storage_gc_encolar_huerfanos(p_bucket text, p_gracia interval)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_ventana constant int := 10000;
  v_desde text;
  v_ultimo text;
  v_vistos int;
  n int;
begin
  insert into public.cola_gc_barrido (bucket) values (p_bucket) on conflict (bucket) do nothing;
  -- Una pasada a la vez por bucket: dos corridas que se cruzan no examinan la misma ventana.
  select b.ultimo_nombre into v_desde from public.cola_gc_barrido b where b.bucket = p_bucket for update;
  select count(*), max(o.name) into v_vistos, v_ultimo
    from (select o.name from storage.objects o
           where o.bucket_id = p_bucket and o.name > v_desde
           order by o.name limit v_ventana) o;
  if p_bucket = 'vehiculos' then
    insert into public.cola_gc_storage (bucket, ruta, encolado_en)
    select o.bucket_id, o.name, o.created_at
    from storage.objects o
    where o.bucket_id = 'vehiculos' and o.name > v_desde and o.name <= v_ultimo
      and o.created_at < now() - p_gracia
      and not exists (select 1 from public.vehiculos_imagenes i where i.ruta = o.name)
      and not exists (select 1 from public.vehiculos_imagenes i where i.ruta_miniatura = o.name)
      and not exists (select 1 from public.cola_gc_storage c where c.bucket = 'vehiculos' and c.ruta = o.name)
    on conflict do nothing;
  else
    insert into public.cola_gc_storage (bucket, ruta, encolado_en)
    select o.bucket_id, o.name, o.created_at
    from storage.objects o
    where o.bucket_id = p_bucket and o.name > v_desde and o.name <= v_ultimo
      and o.created_at < now() - p_gracia
      and public.storage_refcount(o.bucket_id, o.name) = 0
    on conflict do nothing;
  end if;
  get diagnostics n = row_count;
  -- La ventana no se llenó: se llegó al final del bucket y la próxima pasada empieza otra vuelta.
  update public.cola_gc_barrido
     set ultimo_nombre = case when v_vistos < v_ventana then '' else v_ultimo end,
         vuelta_desde = case when v_vistos < v_ventana then now() else vuelta_desde end,
         actualizado_en = now()
   where bucket = p_bucket;
  return n;
end;
$$;
revoke all on function public.storage_gc_encolar_huerfanos(text, interval) from public, anon, authenticated;
grant execute on function public.storage_gc_encolar_huerfanos(text, interval) to service_role;
