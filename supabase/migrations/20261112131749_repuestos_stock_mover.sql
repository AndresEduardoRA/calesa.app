-- El stock de un ítem de repuestos se mueve sólo por RPC (paso 8.10-1, C1–C3).
--   C1. `nota` en los movimientos; sin INSERT directo de movimientos (ni su secuencia) ni `UPDATE(en_stock_desde)`: hasta hoy cualquiera con
--       `repuestos.editar` sacaba un ítem de la espera de su vehículo con un `update`.
--   C2. `repuesto_stock_mover(item, cantidad, motivo, stock esperado, nota)`: la cantidad va siempre positiva y el sentido sale del motivo
--       (`sobrante` entra; `vendido`, `devuelto` y `ajuste` salen). Candado `for update`, nunca negativo, `PT409` si el stock cambió; lo que entra por
--       `sobrante` no pasa de la cantidad del ítem menos lo que ya entró. Fija `en_stock_desde` al pasar de 0 a más y lo limpia al volver a 0.
--   C3. `repuesto_stock_reasignar(item, proyecto destino, cantidad, id)`: todo o nada; descuenta del origen (`reasignado`) y crea el ítem `id` en el
--       destino, en su fase de entrada. Idempotente por id, comprobado tras el candado del origen: un doble clic no descuenta dos veces.
--   La cantidad se llama `p_unidades` y no `p_cantidad`: `escala.sql` toma un `p_cantidad` por un tamaño de página.
--   Valen también en un proyecto cerrado (los sobrantes nacen al terminar); el destino cerrado no recibe nada. Los motivos se validan aquí y no con
--   un `check` en la tabla (puede haber filas viejas con otro texto).

alter table public.repuestos_stock_movimientos
  add column nota text constraint repuestos_stock_movimientos_nota_check check (nota is null or char_length(nota) between 1 and 500);

drop policy "repuestos_stock_movimientos: crear" on public.repuestos_stock_movimientos;
revoke insert on public.repuestos_stock_movimientos from authenticated;
revoke all on sequence public.repuestos_stock_movimientos_id_seq from anon, authenticated;
-- De columna, nunca de tabla: la hoja sigue escribiendo las demás columnas que tienen su grant.
revoke update (en_stock_desde) on public.repuestos_items from authenticated;

-- El ítem vivo bajo candado; si no, PT409.
create function public._repuesto_stock_item(p_item uuid)
returns public.repuestos_items
language plpgsql security definer
set search_path = ''
as $$
declare i public.repuestos_items;
begin
  select * into i from public.repuestos_items x where x.id = p_item for update;
  if not found or i.eliminado_en is not null
     or exists (select 1 from public.repuestos_proyectos pr where pr.id = i.proyecto_id and pr.eliminado_en is not null) then
    raise exception 'Este ítem ya no existe.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  return i;
end;
$$;

-- Baja `p_unidades` (> 0, ya validada contra el stock) o la sube (< 0) y registra el movimiento con su signo. Devuelve el ítem tras el cambio.
create function public._repuesto_stock_aplicar(p_item public.repuestos_items, p_con_signo integer, p_motivo text, p_nota text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare i public.repuestos_items; v_nuevo integer := p_item.stock_cantidad + p_con_signo; v_mov bigint;
begin
  update public.repuestos_items x
     set stock_cantidad = v_nuevo,
         en_stock_desde = case when v_nuevo > 0 then coalesce(x.en_stock_desde, now()) end
   where x.id = p_item.id
  returning * into i;
  insert into public.repuestos_stock_movimientos (item_id, cantidad, motivo, nota, usuario_id)
  values (i.id, p_con_signo, p_motivo, p_nota, (select auth.uid()))
  returning id into v_mov;
  return jsonb_build_object('item_id', i.id, 'stock_cantidad', i.stock_cantidad, 'en_stock_desde', i.en_stock_desde,
    'actualizado_en', i.actualizado_en, 'movimiento_id', v_mov);
end;
$$;

create function public.repuesto_stock_mover(p_item uuid, p_unidades integer, p_motivo text, p_stock_esperado integer, p_nota text default null)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  i public.repuestos_items;
  v_nota text := nullif(btrim(p_nota), '');
  v_disponible integer;
begin
  perform public.assert_permiso('repuestos.editar');
  if p_motivo = 'reasignado' then
    raise exception 'Para reasignar usa «Reasignar a un proyecto».' using errcode = '22023', hint = 'motivo';
  end if;
  if p_motivo is null or p_motivo not in ('sobrante', 'vendido', 'devuelto', 'ajuste') then
    raise exception 'Ese motivo no existe.' using errcode = '22023', hint = 'motivo';
  end if;
  if p_unidades is null or p_unidades < 1 then
    raise exception 'La cantidad es un número entero desde 1.' using errcode = '22023', hint = 'cantidad';
  end if;
  if p_stock_esperado is null or p_stock_esperado < 0 then
    raise exception 'Falta el stock que viste.' using errcode = '22023', hint = 'stock_esperado';
  end if;
  if char_length(v_nota) > 500 then
    raise exception 'La nota admite hasta 500 caracteres.' using errcode = '22023', hint = 'nota';
  end if;

  i := public._repuesto_stock_item(p_item);
  if i.stock_cantidad <> p_stock_esperado then
    raise exception 'Otra persona movió el stock de este ítem. Recarga para ver lo nuevo.' using errcode = 'PT409', hint = 'conflicto';
  end if;

  if p_motivo = 'sobrante' then
    -- repuestos_stock_movimientos_item_id_idx: (item_id). Un ítem tiene pocos movimientos.
    select i.cantidad - coalesce(sum(m.cantidad), 0) into v_disponible
      from public.repuestos_stock_movimientos m where m.item_id = i.id and m.motivo = 'sobrante';
    v_disponible := greatest(v_disponible, 0);
    if v_disponible = 0 then
      raise exception 'Este ítem ya pasó todo a stock.' using errcode = '23514', hint = 'cantidad';
    end if;
    if p_unidades > v_disponible then
      raise exception 'Sólo puedes pasar % más de este ítem a stock.', v_disponible using errcode = '23514', hint = 'cantidad';
    end if;
    return public._repuesto_stock_aplicar(i, p_unidades, p_motivo, v_nota);
  end if;

  if p_unidades > i.stock_cantidad then
    raise exception 'Sólo hay % en stock.', i.stock_cantidad using errcode = '23514', hint = 'cantidad';
  end if;
  return public._repuesto_stock_aplicar(i, -p_unidades, p_motivo, v_nota);
end;
$$;

create function public.repuesto_stock_reasignar(p_item uuid, p_proyecto_destino uuid, p_unidades integer, p_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  i public.repuestos_items;
  n public.repuestos_items;
  p public.repuestos_proyectos;
  v_origen jsonb;
  v_fase uuid; v_flujo uuid;
begin
  perform public.assert_permiso('repuestos.editar');
  if p_id is null then
    raise exception 'Falta el identificador del ítem.' using errcode = '22023', hint = 'id';
  end if;
  if p_proyecto_destino is null then
    raise exception 'Elige el proyecto destino.' using errcode = '22023', hint = 'proyecto';
  end if;
  if p_unidades is null or p_unidades < 1 then
    raise exception 'La cantidad es un número entero desde 1.' using errcode = '22023', hint = 'cantidad';
  end if;

  -- El candado antes de la idempotencia: dos llamadas con el mismo id se ordenan aquí y la segunda ve el ítem de la primera.
  i := public._repuesto_stock_item(p_item);

  select * into n from public.repuestos_items x where x.id = p_id;
  if found then
    if n.creado_por is distinct from (select auth.uid()) or n.proyecto_id <> p_proyecto_destino then
      raise exception 'Ese identificador ya está en uso. Cierra el formulario y vuelve a abrirlo.' using errcode = '23505', hint = 'id';
    end if;
    return jsonb_build_object('id', n.id, 'proyecto_id', n.proyecto_id, 'fase_id', n.fase_id,
      'origen', jsonb_build_object('item_id', i.id, 'stock_cantidad', i.stock_cantidad, 'en_stock_desde', i.en_stock_desde,
        'actualizado_en', i.actualizado_en));
  end if;

  if p_proyecto_destino = i.proyecto_id then
    raise exception 'Elige otro proyecto: el ítem ya es de este.' using errcode = '23514', hint = 'proyecto';
  end if;
  -- Como al crear un ítem: el `for update` de eliminar el proyecto espera, o este lo ve eliminado.
  select * into p from public.repuestos_proyectos x where x.id = p_proyecto_destino for share;
  if not found or p.eliminado_en is not null then
    raise exception 'Ese proyecto ya no existe.' using errcode = 'PT409', hint = 'proyecto';
  end if;
  if p.cerrado_en is not null then
    raise exception 'El proyecto destino está cerrado: reábrelo para sumar ítems.' using errcode = '23514', hint = 'proyecto';
  end if;
  if p_unidades > i.stock_cantidad then
    raise exception 'Sólo hay % en stock.', i.stock_cantidad using errcode = '23514', hint = 'cantidad';
  end if;

  v_origen := public._repuesto_stock_aplicar(i, -p_unidades, 'reasignado', format('Al proyecto #%s.', p.numero)) - 'movimiento_id';

  insert into public.repuestos_items (id, proyecto_id, descripcion, tipo_pieza_id, condicion_id, pais_origen_id, modo_transporte_id, cantidad,
    notas, creado_por)
  values (p_id, p.id, i.descripcion, i.tipo_pieza_id, i.condicion_id, i.pais_origen_id, i.modo_transporte_id, p_unidades,
    format('Reasignado desde el proyecto #%s.', (select pr.numero from public.repuestos_proyectos pr where pr.id = i.proyecto_id)),
    (select auth.uid()))
  returning * into n;

  v_fase := public._repuesto_fase_de_entrada(n.id);
  if v_fase is not null then
    select f.flujo_id into v_flujo from public.fases f where f.id = v_fase;
    update public.repuestos_items x set fase_id = v_fase, fase_desde = now() where x.id = n.id returning * into n;
    insert into public.historial_fases (flujo_id, repuesto_id, de_fase_id, a_fase_id, usuario_id)
    values (v_flujo, n.id, null, v_fase, (select auth.uid()));
  end if;
  return jsonb_build_object('id', n.id, 'proyecto_id', n.proyecto_id, 'fase_id', n.fase_id, 'origen', v_origen);
end;
$$;

comment on function public.repuesto_stock_mover(uuid, integer, text, integer, text) is
  'Mueve el stock de un ítem de repuestos (8.10-1, C2): sobrante entra con tope; vendido, devuelto y ajuste salen; nunca negativo; PT409 si el stock cambió.';
comment on function public.repuesto_stock_reasignar(uuid, uuid, integer, uuid) is
  'Reasigna stock de un ítem a otro proyecto abierto (8.10-1, C3): todo o nada, idempotente por el id del ítem nuevo.';

revoke all on function public.repuesto_stock_mover(uuid, integer, text, integer, text) from public, anon;
revoke all on function public.repuesto_stock_reasignar(uuid, uuid, integer, uuid) from public, anon;
grant execute on function public.repuesto_stock_mover(uuid, integer, text, integer, text) to authenticated, service_role;
grant execute on function public.repuesto_stock_reasignar(uuid, uuid, integer, uuid) to authenticated, service_role;
revoke all on function public._repuesto_stock_item(uuid) from public, anon, authenticated;
revoke all on function public._repuesto_stock_aplicar(public.repuestos_items, integer, text, text) from public, anon, authenticated;
grant execute on function public._repuesto_stock_item(uuid) to service_role;
grant execute on function public._repuesto_stock_aplicar(public.repuestos_items, integer, text, text) to service_role;
