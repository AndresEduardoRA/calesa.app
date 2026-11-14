-- Corregir y eliminar un pago de un proyecto de repuestos piden lo mismo que registrarlo (`pago_registrar_proyecto`) y que escribir una compra:
-- `repuestos.costos.editar` y `repuestos.ver`. Y un pago de proyecto no lleva lead: `pago_registrar_proyecto` no lo recibe y `pago_guardar` tampoco
-- se lo pone (22023, hint `lead_id`); un lead en un pago frena la purga de ese lead.
-- Prueba: supabase/tests/areas/repuestos/pagos-guardas.sql.

-- La clave de editar de la unidad del pago: `logistica.pagos.editar` del vehículo, o `repuestos.costos.editar` y `repuestos.ver` del proyecto. La llaman
-- `_pago_tomar` (corregir) y `pago_eliminar` antes de tomar ningún candado.
create or replace function public._pago_exigir_edicion(p public.pagos) returns void
    language plpgsql stable
    set search_path to ''
    as $$
begin
  if p.vehiculo_id is not null and not public.puede_vehiculo(p.vehiculo_id, 'logistica.pagos.editar') then
    raise exception 'No tienes el permiso «logistica.pagos.editar».' using errcode = '42501';
  end if;
  if p.vehiculo_id is null and not public.tiene_permiso('repuestos.costos.editar') then
    raise exception 'No tienes el permiso «repuestos.costos.editar».' using errcode = '42501';
  end if;
  if p.vehiculo_id is null and not public.tiene_permiso('repuestos.ver') then
    raise exception 'No tienes el permiso «repuestos.ver».' using errcode = '42501';
  end if;
end;
$$;

comment on function public._pago_exigir_edicion(public.pagos) is 'Exige poder editar el pago: logistica.pagos.editar de su vehículo, o repuestos.costos.editar y repuestos.ver si es de un proyecto de repuestos (como pago_registrar_proyecto). 42501. La llaman _pago_tomar y pago_eliminar.';

revoke all on function public._pago_exigir_edicion(public.pagos) from public, anon, authenticated;
grant execute on function public._pago_exigir_edicion(public.pagos) to service_role;

create or replace function public._pago_de_cambios(o public.pagos, p_cambios jsonb) returns public.pagos
    language plpgsql stable
    set search_path to ''
    as $$
declare n public.pagos := o; v_k text; c record;
begin
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios van como un objeto.' using errcode = '22023', hint = 'cambios';
  end if;
  select k into v_k from jsonb_object_keys(p_cambios) k
   where k <> all (array['lead_id', 'concepto', 'moneda', 'monto', 'tipo_cambio_id', 'metodo', 'fecha', 'comprobante_ruta', 'notas'])
   limit 1;
  if v_k is not null then
    raise exception 'No se cambia «%».', v_k using errcode = '22023', hint = v_k;
  end if;
  if p_cambios ? 'lead_id' then n.lead_id := (p_cambios ->> 'lead_id')::uuid; end if;
  if n.proyecto_repuestos_id is not null and n.lead_id is not null then
    raise exception 'Un pago de un proyecto de repuestos no lleva lead.' using errcode = '22023', hint = 'lead_id';
  end if;
  if p_cambios ? 'concepto' then n.concepto := regexp_replace(btrim(p_cambios ->> 'concepto'), '\s+', ' ', 'g'); end if;
  if p_cambios ? 'moneda' then n.moneda := p_cambios ->> 'moneda'; end if;
  if p_cambios ? 'monto' then
    -- Los decimales se miran antes de asignar: la columna numeric(18,2) redondearía en silencio.
    if (p_cambios ->> 'monto')::numeric <> round((p_cambios ->> 'monto')::numeric, 2) then
      raise exception 'El monto lleva como mucho dos decimales.' using errcode = '22023', hint = 'monto';
    end if;
    n.monto := (p_cambios ->> 'monto')::numeric;
  end if;
  if p_cambios ? 'tipo_cambio_id' then n.tipo_cambio_id := (p_cambios ->> 'tipo_cambio_id')::uuid; end if;
  if p_cambios ? 'metodo' then n.metodo := nullif(btrim(p_cambios ->> 'metodo'), ''); end if;
  if p_cambios ? 'fecha' then n.fecha := (p_cambios ->> 'fecha')::date; end if;
  if p_cambios ? 'comprobante_ruta' then n.comprobante_ruta := p_cambios ->> 'comprobante_ruta'; end if;
  if p_cambios ? 'notas' then n.notas := nullif(btrim(p_cambios ->> 'notas'), ''); end if;
  if n.fecha is null then
    raise exception 'Falta la fecha.' using errcode = '23502', hint = 'fecha';
  end if;
  perform public._pago_validar(coalesce(n.vehiculo_id, n.proyecto_repuestos_id), n.concepto, n.metodo, n.monto, n.comprobante_ruta);
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

comment on function public._pago_de_cambios(public.pagos, jsonb) is 'Aplica los cambios permitidos de pago_guardar a la fila y la valida (_pago_validar, _monto_en_base). Un pago de un proyecto de repuestos no lleva lead (22023, hint lead_id).';

revoke all on function public._pago_de_cambios(public.pagos, jsonb) from public, anon, authenticated;
grant execute on function public._pago_de_cambios(public.pagos, jsonb) to service_role;

comment on function public.pago_eliminar(uuid, timestamp with time zone) is 'Elimina (borrado suave) un pago sin confirmar de un vehículo o de un proyecto de repuestos. Pide logistica.pagos.editar del vehículo o repuestos.costos.editar y repuestos.ver, y la versión; uno confirmado se anula con pago_anular. No elimina el último pago vivo de un proyecto mientras un ítem vivo esté en una fase que pide proyecto.pago_cliente (23514).';
