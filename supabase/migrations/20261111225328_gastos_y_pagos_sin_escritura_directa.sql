-- Gastos y pagos: sin escritura directa (paso 6.10-1, C14). Se escriben sólo por las RPC gasto_*, gastos_prorratear y pago_*: sin las policies de crear y
-- editar y sin insert, update ni delete para authenticated (también los grants por columna de pagos). Quedan las policies de leer y el select.

drop policy "gastos: crear" on public.gastos;
drop policy "gastos: editar" on public.gastos;
drop policy "pagos: crear" on public.pagos;
drop policy "pagos: editar" on public.pagos;

revoke insert, update, delete on table public.gastos, public.pagos from authenticated;
revoke update (lead_id, concepto, moneda, monto, tipo_cambio_aplicado, monto_base, metodo, fecha, comprobante_ruta, notas) on table public.pagos
  from authenticated;

comment on table public.gastos is
  'Gasto REAL imputado a una unidad, en su moneda y convertido a la base con el tipo de cambio aplicado (lo calcula la base). Se compara contra la cotización final (desviación) y contra la venta (margen). Escritura sólo por gasto_registrar, gasto_guardar, gasto_eliminar y gastos_prorratear.';
comment on table public.pagos is
  'Pago del CLIENTE. Confirmar es un acto aparte (pago_confirmar, permiso logistica.pagos.confirmar) y queda sellado: quién y cuándo lo pone la base. Escritura sólo por pago_registrar, pago_guardar, pago_eliminar y pago_confirmar.';

update public.permisos set aplicado_en = 'gasto_registrar, gasto_guardar, gasto_eliminar, gastos_prorratear' where clave = 'logistica.gastos.editar';
update public.permisos set aplicado_en = 'pago_registrar, pago_guardar, pago_eliminar' where clave = 'logistica.pagos.editar';
