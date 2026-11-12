-- Gastos: corregir y eliminar con versión, sin perder el tributo que la fase exige (paso 6.10-1, C5–C7).
--   C5. `gasto_guardar(id, versión, cambios)`: lista cerrada (el monto en base, la tasa, la unidad y el autor no se mandan), el permiso de la unidad antes
--       que la versión, las validaciones de C4 sobre el estado que resulta y PT409 si otra persona lo cambió. Sin diferencia no escribe. Recalcula (D19):
--       con otra moneda u otro tipo, la tasa vigente; con sólo otro monto, la tasa guardada en el sentido del tipo guardado. No exige la regla (D5).
--   C6. `gasto_eliminar(id, versión)`: borrado suave.
--   C7. No se quita el último gasto de tributos de un vehículo cuya fase actual pide `aduana.tributos_pagados` (bloqueante o no, D14), ni borrándolo ni
--       cambiándole la categoría. Antes de la propia fila se toman, en orden de id, los gastos de tributos vivos del vehículo: dos borrados a la vez no
--       dejan cero y no se cruzan (40P01).

-- C7 · el candado: los tributos vivos del vehículo, en orden de id, antes de la fila propia.
create or replace function public._gasto_bloquear(o public.gastos) returns void
language plpgsql
set search_path = ''
as $$
begin
  if o.vehiculo_id is not null then
    perform 1 from public.gastos x join public.categorias_gasto c on c.id = x.categoria_id
     where x.vehiculo_id = o.vehiculo_id and x.eliminado_en is null and c.proposito = 'tributos'
     order by x.id
       for update of x;
  end if;
end;
$$;

-- C7 · `p_categoria_nueva` nula = se elimina. Usa gastos_vehiculo_idx y fases_requisitos_fase_id_idx.
create or replace function public._gasto_tributo_protegido(o public.gastos, p_categoria_nueva uuid) returns void
language plpgsql stable
set search_path = ''
as $$
declare v_fase text;
begin
  if o.vehiculo_id is null or not exists (select 1 from public.categorias_gasto c where c.id = o.categoria_id and c.proposito = 'tributos') then
    return;
  end if;
  if p_categoria_nueva is not null and exists (select 1 from public.categorias_gasto c where c.id = p_categoria_nueva and c.proposito = 'tributos') then
    return;
  end if;
  select f.nombre into v_fase
    from public.vehiculos v join public.fases f on f.id = v.fase_id join public.fases_requisitos r on r.fase_id = f.id
   where v.id = o.vehiculo_id and r.tipo = 'dato' and r.clave_dato = 'aduana.tributos_pagados'
   limit 1;
  if not found then
    return;
  end if;
  if exists (select 1 from public.gastos x join public.categorias_gasto c on c.id = x.categoria_id
              where x.vehiculo_id = o.vehiculo_id and x.eliminado_en is null and c.proposito = 'tributos' and x.id <> o.id) then
    return;
  end if;
  raise exception 'La fase «%» pide los tributos pagados: este es el último gasto de tributos.', v_fase using errcode = '23514', hint = 'categoria_id';
end;
$$;

-- C5 · el gasto que resulta de aplicar los cambios: lista cerrada, validado y con el monto en base recalculado.
create or replace function public._gasto_de_cambios(o public.gastos, p_cambios jsonb) returns public.gastos
language plpgsql stable
set search_path = ''
as $$
declare n public.gastos := o; v_k text; c record;
begin
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios van como un objeto.' using errcode = '22023', hint = 'cambios';
  end if;
  select k into v_k from jsonb_object_keys(p_cambios) k
   where k <> all (array['categoria_id', 'moneda', 'monto', 'tipo_cambio_id', 'fecha', 'proveedor', 'comprobante_ruta', 'notas'])
   limit 1;
  if v_k is not null then
    raise exception 'No se cambia «%».', v_k using errcode = '22023', hint = v_k;
  end if;
  if p_cambios ? 'categoria_id' then n.categoria_id := (p_cambios ->> 'categoria_id')::uuid; end if;
  if p_cambios ? 'moneda' then n.moneda := p_cambios ->> 'moneda'; end if;
  if p_cambios ? 'monto' then
    -- C2b · los decimales se miran antes de asignar: la columna numeric(18,2) redondearía en silencio.
    if (p_cambios ->> 'monto')::numeric <> round((p_cambios ->> 'monto')::numeric, 2) then
      raise exception 'El monto lleva como mucho dos decimales.' using errcode = '22023', hint = 'monto';
    end if;
    n.monto := (p_cambios ->> 'monto')::numeric;
  end if;
  if p_cambios ? 'tipo_cambio_id' then n.tipo_cambio_id := (p_cambios ->> 'tipo_cambio_id')::uuid; end if;
  if p_cambios ? 'fecha' then n.fecha := (p_cambios ->> 'fecha')::date; end if;
  if p_cambios ? 'proveedor' then n.proveedor := nullif(btrim(p_cambios ->> 'proveedor'), ''); end if;
  if p_cambios ? 'comprobante_ruta' then n.comprobante_ruta := p_cambios ->> 'comprobante_ruta'; end if;
  if p_cambios ? 'notas' then n.notas := nullif(btrim(p_cambios ->> 'notas'), ''); end if;
  if n.categoria_id is null then
    raise exception 'Elige una categoría de gasto activa.' using errcode = '23502', hint = 'categoria_id';
  end if;
  if n.fecha is null then
    raise exception 'Falta la fecha.' using errcode = '23502', hint = 'fecha';
  end if;
  perform public._gasto_validar(n.vehiculo_id, n.repuesto_id, case when n.categoria_id is distinct from o.categoria_id then n.categoria_id end,
                                n.monto, n.comprobante_ruta);
  -- D19 · con sólo otro monto, la tasa guardada.
  if n.moneda is distinct from o.moneda or n.tipo_cambio_id is distinct from o.tipo_cambio_id then
    c := public._monto_en_base(n.moneda::text, n.tipo_cambio_id, n.monto);
  else
    c := public._monto_en_base(n.moneda::text, n.tipo_cambio_id, n.monto, o.tipo_cambio_aplicado);
  end if;
  n.tipo_cambio_id := c.tipo_cambio_id;
  n.tipo_cambio_aplicado := c.tipo_cambio_aplicado;
  n.monto_base := c.monto_base;
  return n;
end;
$$;

-- C5 · corregir.
create or replace function public.gasto_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare o public.gastos; n public.gastos;
begin
  perform public.assert_activo();
  select * into o from public.gastos x where x.id = p_id;
  if not found or o.eliminado_en is not null then
    raise exception 'Ese gasto ya no existe.' using errcode = 'PT409';
  end if;
  if not public.puede_unidad(o.vehiculo_id, o.repuesto_id, 'logistica.gastos.editar', 'repuestos.costos.editar') then
    raise exception 'No tienes el permiso «%».', case when o.vehiculo_id is not null then 'logistica.gastos.editar' else 'repuestos.costos.editar' end
      using errcode = '42501';
  end if;
  perform public._gasto_bloquear(o);
  select * into o from public.gastos x where x.id = p_id for update;
  if o.eliminado_en is not null then
    raise exception 'Ese gasto ya no existe.' using errcode = 'PT409';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  n := public._gasto_de_cambios(o, p_cambios);
  if (n.categoria_id, n.moneda, n.monto, n.tipo_cambio_id, n.tipo_cambio_aplicado, n.monto_base, n.fecha, n.proveedor, n.comprobante_ruta, n.notas)
     is not distinct from
     (o.categoria_id, o.moneda, o.monto, o.tipo_cambio_id, o.tipo_cambio_aplicado, o.monto_base, o.fecha, o.proveedor, o.comprobante_ruta, o.notas) then
    return public._gasto_respuesta(o, '{"sin_cambios": true}');
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este gasto mientras lo editabas.');
  if n.categoria_id is distinct from o.categoria_id then
    perform public._gasto_tributo_protegido(o, n.categoria_id);
  end if;
  update public.gastos x
     set categoria_id = n.categoria_id, moneda = n.moneda, monto = n.monto, tipo_cambio_id = n.tipo_cambio_id,
         tipo_cambio_aplicado = n.tipo_cambio_aplicado, monto_base = n.monto_base, fecha = n.fecha, proveedor = n.proveedor,
         comprobante_ruta = n.comprobante_ruta, notas = n.notas
   where x.id = p_id
  returning * into n;
  return public._gasto_respuesta(n, '{"sin_cambios": false}');
end;
$$;

-- C6 · eliminar (suave).
create or replace function public.gasto_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare o public.gastos; v_en timestamptz;
begin
  perform public.assert_activo();
  select * into o from public.gastos x where x.id = p_id;
  if not found or o.eliminado_en is not null then
    raise exception 'Ese gasto ya no existe.' using errcode = 'PT409';
  end if;
  if not public.puede_unidad(o.vehiculo_id, o.repuesto_id, 'logistica.gastos.editar', 'repuestos.costos.editar') then
    raise exception 'No tienes el permiso «%».', case when o.vehiculo_id is not null then 'logistica.gastos.editar' else 'repuestos.costos.editar' end
      using errcode = '42501';
  end if;
  perform public._gasto_bloquear(o);
  select * into o from public.gastos x where x.id = p_id for update;
  if o.eliminado_en is not null then
    raise exception 'Ese gasto ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este gasto mientras lo editabas.');
  perform public._gasto_tributo_protegido(o, null);
  update public.gastos x set eliminado_en = now() where x.id = p_id returning x.actualizado_en into v_en;
  return jsonb_build_object('id', p_id, 'actualizado_en', v_en);
end;
$$;

revoke all on function public._gasto_bloquear(public.gastos) from public, anon, authenticated;
revoke all on function public._gasto_tributo_protegido(public.gastos, uuid) from public, anon, authenticated;
revoke all on function public._gasto_de_cambios(public.gastos, jsonb) from public, anon, authenticated;
grant execute on function public._gasto_bloquear(public.gastos) to service_role;
grant execute on function public._gasto_tributo_protegido(public.gastos, uuid) to service_role;
grant execute on function public._gasto_de_cambios(public.gastos, jsonb) to service_role;

revoke all on function public.gasto_guardar(uuid, timestamptz, jsonb) from public, anon;
revoke all on function public.gasto_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.gasto_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;
grant execute on function public.gasto_eliminar(uuid, timestamptz) to authenticated, service_role;
