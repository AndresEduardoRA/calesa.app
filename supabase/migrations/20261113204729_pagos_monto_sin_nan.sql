-- Un pago no acepta NaN como monto. En Postgres 'NaN' > 0 es verdadero y numeric(18,2) lo guarda, así que ni `p_monto <= 0` ni
-- `pagos_monto_check` lo paran; en la moneda base tampoco lo ataja `_monto_en_base` (sin conversión no mira si cabe). El corte va en
-- `_pago_validar`, que comparten registrar y corregir, del vehículo y del proyecto de repuestos.

create or replace function public._pago_validar(p_unidad uuid, p_concepto text, p_metodo text, p_monto numeric, p_ruta text) returns void
    language plpgsql immutable
    set search_path to ''
    as $$
begin
  if coalesce(length(btrim(p_concepto)), 0) not between 1 and 200 then
    raise exception 'Escribe el concepto del pago (hasta 200 caracteres).' using errcode = '22023', hint = 'concepto';
  end if;
  if length(p_metodo) > 100 then
    raise exception 'El método va en 100 caracteres como mucho.' using errcode = '22023', hint = 'metodo';
  end if;
  if p_monto is null then
    raise exception 'Falta el monto.' using errcode = '23502', hint = 'monto';
  end if;
  if p_monto = 'NaN'::numeric or p_monto <= 0 then
    raise exception 'El monto de un pago es mayor que cero.' using errcode = '22023', hint = 'monto';
  end if;
  if not public._comprobante_ruta_valida(p_unidad, p_ruta) then
    raise exception 'El comprobante no está en la carpeta de esta unidad.' using errcode = '22023', hint = 'comprobante_ruta';
  end if;
end;
$$;

revoke all on function public._pago_validar(uuid, text, text, numeric, text) from public, anon, authenticated;
grant all on function public._pago_validar(uuid, text, text, numeric, text) to service_role;
