-- Las imágenes de un ítem de repuestos (paso 8.09-3, C0–C4): hasta 8 por ítem, sólo de su carpeta y ya subidas, y la cola de limpieza al borrar.
-- La tabla, el bucket `repuestos` y `storage_refcount()` ya existían; faltaban el tope, la comprobación de la ruta, el rescate y el encolado.
-- Sólo se escribe por INSERT y DELETE: sin UPDATE nadie cambia `item_id` o `ruta` y se salta lo de abajo (mismo patrón que `repuestos_items`).

-- C0. Sin UPDATE directo.
drop policy "repuestos_items_imagenes: editar" on public.repuestos_items_imagenes;
revoke update on public.repuestos_items_imagenes from authenticated;

-- C3. Una ruta, una vez por ítem (la ruta lleva la carpeta del ítem, así que nunca la comparten dos). Sostiene también el borrado por ruta.
create unique index repuestos_items_imagenes_item_ruta_key on public.repuestos_items_imagenes (item_id, ruta);

-- C1, C2, C3 y C4 (rescate). El tope es 8; vive aquí y en `entities/items/imagenes.ts`.
create function public.repuestos_imagen_integridad() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  i public.repuestos_items;
  p public.repuestos_proyectos;
  v_patron text := '^' || new.item_id::text || '/[0-9a-f]{64}\.(webp|jpg)$';
begin
  -- El ítem y su proyecto se leen `for share`: eliminar el ítem (`for update`) espera a esta imagen, o esta imagen lo ve eliminado.
  select * into i from public.repuestos_items x where x.id = new.item_id for share;
  if found then
    select * into p from public.repuestos_proyectos x where x.id = i.proyecto_id for share;
  end if;
  if i.id is null or i.eliminado_en is not null or p.id is null or p.eliminado_en is not null then
    raise exception 'Este ítem ya no existe.' using errcode = '23514', hint = 'item';
  end if;
  if p.cerrado_en is not null then
    raise exception 'El proyecto está cerrado: reábrelo para cambiar las imágenes.' using errcode = '23514', hint = 'proyecto';
  end if;
  if new.ruta !~ v_patron then
    raise exception 'La imagen no está en la carpeta de este ítem.' using errcode = '23514', hint = 'ruta';
  end if;

  -- El tope, bajo un candado por ítem: dos imágenes a la vez no pasan de 8. Conteo acotado: nunca recorre más de 8 filas (índice por `item_id`).
  perform pg_advisory_xact_lock(hashtextextended('repuestos_imagenes:' || new.item_id::text, 0));
  if (select count(*) from (select 1 from public.repuestos_items_imagenes m where m.item_id = new.item_id limit 8) t) >= 8 then
    raise exception 'Un ítem lleva hasta 8 imágenes.' using errcode = '23514', hint = 'imagenes';
  end if;

  -- «Deshacer» de quitar: la ruta sale de la cola de limpieza (falla con su mensaje si la limpieza ya la reclamó).
  perform public.storage_gc_rescatar('repuestos', new.ruta);
  if not exists (select 1 from storage.objects o where o.bucket_id = 'repuestos' and o.name = new.ruta) then
    raise exception 'La imagen no terminó de subir. Vuelve a intentarlo.' using errcode = '23514', hint = 'ruta';
  end if;

  new.orden := coalesce((select max(m.orden) + 1 from public.repuestos_items_imagenes m where m.item_id = new.item_id), 0);
  return new;
end;
$$;

-- C4. Quien borra la fila encola la ruta (sólo si ninguna otra la usa: `_encolar_para_limpiar` mira `storage_refcount`). `cola_gc_storage` sólo
-- la escribe `service_role`, así que sin este trigger borrar una imagen dejaría el objeto para siempre.
create function public.repuestos_imagen_encolar() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public._encolar_para_limpiar('repuestos', array[old.ruta], false);
  return old;
end;
$$;

revoke all on function public.repuestos_imagen_integridad() from public, anon, authenticated;
revoke all on function public.repuestos_imagen_encolar() from public, anon, authenticated;

create trigger repuestos_imagen_integridad before insert on public.repuestos_items_imagenes
  for each row execute function public.repuestos_imagen_integridad();
create trigger repuestos_imagen_encolar after delete on public.repuestos_items_imagenes
  for each row execute function public.repuestos_imagen_encolar();
