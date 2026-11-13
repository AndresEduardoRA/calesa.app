-- Las escrituras directas de repuestos miran lo mismo que sus RPC: el `update` por columna de un ítem, borrar una imagen y subir a Storage.
-- Prueba: supabase/tests/areas/repuestos/escritura-directa.sql; la carrera, K4 y K5 de scripts/carreras/repuestos-stock.mjs.

-- 1 · El `update` por columna de un ítem (la hoja guarda celda a celda): ítem vivo, proyecto vivo y abierto, catálogo de su tipo y activo, y una
-- cantidad que no baja de lo que ya entró a stock por `sobrante`. Sólo mira las columnas que cambian; las RPC que tocan otras (fase, stock,
-- eliminar) no lo disparan, y la de aceptar una cotización ya exige el proyecto abierto.
create or replace function public.repuestos_item_escritura() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare
  p public.repuestos_proyectos;
  v_entrado integer;
begin
  if (new.descripcion, new.tipo_pieza_id, new.condicion_id, new.pais_origen_id, new.modo_transporte_id, new.cantidad, new.precio_cliente,
      new.moneda, new.tracking, new.notas)
     is not distinct from
     (old.descripcion, old.tipo_pieza_id, old.condicion_id, old.pais_origen_id, old.modo_transporte_id, old.cantidad, old.precio_cliente,
      old.moneda, old.tracking, old.notas) then
    return new;
  end if;
  if old.eliminado_en is not null then
    raise exception 'Este ítem ya no existe.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  -- La fila del ítem ya la tomó el `update`. El proyecto, `for share`: cerrarlo o eliminarlo (`for update`) espera a este cambio, o este cambio
  -- lo ve cerrado. Mismo orden que `repuestos_imagen_integridad` y que aceptar una cotización: ítem, después proyecto.
  select * into p from public.repuestos_proyectos x where x.id = new.proyecto_id for share;
  if not found or p.eliminado_en is not null then
    raise exception 'Este ítem ya no existe.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  if p.cerrado_en is not null then
    raise exception 'El proyecto está cerrado: reábrelo para cambiar los ítems.' using errcode = '23514', hint = 'proyecto';
  end if;

  -- El valor que ya tenía se conserva aunque se haya desactivado: sólo se valida el que cambia.
  if new.tipo_pieza_id is distinct from old.tipo_pieza_id then
    perform public._repuesto_catalogo(jsonb_build_object('tipo_pieza_id', new.tipo_pieza_id), 'tipo_pieza_id', 'tipo_pieza');
  end if;
  if new.condicion_id is distinct from old.condicion_id then
    perform public._repuesto_catalogo(jsonb_build_object('condicion_id', new.condicion_id), 'condicion_id', 'condicion');
  end if;
  if new.pais_origen_id is distinct from old.pais_origen_id then
    perform public._repuesto_catalogo(jsonb_build_object('pais_origen_id', new.pais_origen_id), 'pais_origen_id', 'pais_origen');
  end if;
  if new.modo_transporte_id is distinct from old.modo_transporte_id then
    perform public._repuesto_catalogo(jsonb_build_object('modo_transporte_id', new.modo_transporte_id), 'modo_transporte_id', 'modo_transporte');
  end if;

  -- El tope de `sobrante` en `repuesto_stock_mover` es la cantidad menos lo ya entrado: bajarla por debajo lo rompería. Se cuenta tras el candado
  -- del ítem, que `repuesto_stock_mover` también toma (`for update`), en una sentencia aparte: ve lo que otro acaba de confirmar.
  -- repuestos_stock_movimientos_item_id_idx: (item_id). Un ítem tiene pocos movimientos.
  if new.cantidad < old.cantidad then
    select coalesce(sum(m.cantidad), 0) into v_entrado
      from public.repuestos_stock_movimientos m where m.item_id = new.id and m.motivo = 'sobrante';
    if new.cantidad < v_entrado then
      raise exception 'Ya pasaron % de este ítem a stock: la cantidad no puede ser menor.', v_entrado using errcode = '23514', hint = 'cantidad';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.repuestos_item_escritura() from public, anon, authenticated;
grant execute on function public.repuestos_item_escritura() to service_role;

create trigger repuestos_item_escritura
  before update of descripcion, tipo_pieza_id, condicion_id, pais_origen_id, modo_transporte_id, cantidad, precio_cliente, moneda, tracking, notas
  on public.repuestos_items
  for each row execute function public.repuestos_item_escritura();

-- 2 · Borrar una imagen: como al agregarla, sólo de un ítem vivo de un proyecto abierto. Sin el ítem (se está borrando con él, en cascada), pasa.
create or replace function public.repuestos_imagen_quitar() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare
  i public.repuestos_items;
  p public.repuestos_proyectos;
begin
  -- `for share`, como `repuestos_imagen_integridad`: eliminar el ítem o cerrar el proyecto espera a este borrado, o este borrado lo ve.
  select * into i from public.repuestos_items x where x.id = old.item_id for share;
  if not found then
    return old;
  end if;
  select * into p from public.repuestos_proyectos x where x.id = i.proyecto_id for share;
  if not found then
    return old;
  end if;
  if i.eliminado_en is not null or p.eliminado_en is not null then
    raise exception 'Este ítem ya no existe.' using errcode = '23514', hint = 'item';
  end if;
  if p.cerrado_en is not null then
    raise exception 'El proyecto está cerrado: reábrelo para cambiar las imágenes.' using errcode = '23514', hint = 'proyecto';
  end if;
  return old;
end;
$$;

revoke all on function public.repuestos_imagen_quitar() from public, anon, authenticated;
grant execute on function public.repuestos_imagen_quitar() to service_role;

create trigger repuestos_imagen_quitar
  before delete on public.repuestos_items_imagenes
  for each row execute function public.repuestos_imagen_quitar();

-- 3 · Editar un ítem o sus imágenes pide también `repuestos.ver`: sin él, un `update` o `delete` sin `where` no pasa por la policy de leer.
alter policy "repuestos_items: editar" on public.repuestos_items
  using ((select public.tiene_permiso('repuestos.editar')) and (select public.tiene_permiso('repuestos.ver')))
  with check ((select public.tiene_permiso('repuestos.editar')) and (select public.tiene_permiso('repuestos.ver')));

alter policy "repuestos_items_imagenes: borrar" on public.repuestos_items_imagenes
  using ((select public.tiene_permiso('repuestos.editar')) and (select public.tiene_permiso('repuestos.ver')));

alter policy "repuestos_items_imagenes: crear" on public.repuestos_items_imagenes
  with check ((select public.tiene_permiso('repuestos.editar')) and (select public.tiene_permiso('repuestos.ver')));

-- 4 · Storage `repuestos`: se sube a `<ítem>/…` de un ítem vivo de un proyecto abierto, con `repuestos.ver` y `repuestos.editar`. Nadie borra objetos
-- desde la app: borrar la fila encola la ruta (`repuestos_imagen_encolar`) y la limpieza borra con la clave de servicio.
create or replace function public.puede_objeto_de_repuesto(p_nombre text) returns boolean
  language sql stable security definer
  set search_path = ''
as $$
  select case
    when p_nombre ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
      then public.tiene_permiso('repuestos.ver') and public.tiene_permiso('repuestos.editar')
        and exists (
          select 1 from public.repuestos_items i join public.repuestos_proyectos p on p.id = i.proyecto_id
           where i.id = split_part(p_nombre, '/', 1)::uuid and i.eliminado_en is null and p.eliminado_en is null and p.cerrado_en is null)
    else false
  end;
$$;

revoke all on function public.puede_objeto_de_repuesto(text) from public, anon;
grant execute on function public.puede_objeto_de_repuesto(text) to authenticated, service_role;

drop policy "repuestos: borrar" on storage.objects;
drop policy "repuestos: escribir" on storage.objects;
create policy "repuestos: escribir" on storage.objects as permissive for insert to authenticated
  with check ((bucket_id = 'repuestos'::text) and (select public.puede_objeto_de_repuesto(objects.name)));
