## 2026-11-11 — Paso 6.10-1: gastos y pagos en la base

- **D1 · El tipo de cambio lo elige quien carga** entre los activos que unen esa moneda con la base. La base guarda el valor de ese momento y el id del tipo
  (`tipo_cambio_id`, para que lo muestre el drawer de 6.11).
- **D2 · Una confirmación no se deshace.** `pago_anular` va al 6.10-2 y, si no cabe, al abierto 6-3.
- **D3 · La «venta» sigue siendo la suma de los pagos confirmados.** `margen_vehiculo` no cambia de contrato.
- **D4 · En la moneda base, un tipo de cambio es un error** (22023) y no se ignora en silencio.
- **D5 · La regla `gastos` (o `pagos`) se exige al registrar y al prorratear**, no al corregir ni al borrar. El flujo es el de la fase; sin fase, el del origen
  (vehículo) o el de repuestos.
- **D6 · Al prorratear, la suma exacta es la del monto.** Cada fila lleva `round(parte × tasa, 2)`, así que en base puede diferir del total convertido en algún
  centavo.
- **D7 · Prorratear reparte en el orden del arreglo**, entre 1 y 200 vehículos, sin repetir, y sólo entre vehículos.
- **D8 · Un reintento nunca duplica ni pisa.** Por id o por lote devuelve lo ya registrado; con otra unidad u otro conjunto da 23505; un id ya borrado da PT409.
- **D9 · `pago_registrar` es sólo de vehículo.** Los pagos de un proyecto de repuestos los suma el paso de repuestos.
- **D10 · Confirmar pide la clave global y además ver el pago** (`logistica.pagos.ver` de la unidad).
- **D11 · El sello y la inmutabilidad viven en triggers**, no sólo en las RPC: ni `service_role` ni una RPC futura editan un pago confirmado.
- **D12 · La versión de gastos y pagos sale de un trigger propio** (`greatest(clock_timestamp(), anterior + 1 µs)`).
- **D13 · `comprobante_ruta` se valida con la forma `<unidad>/<sha-256>.<ext>`**, la que mirarán las policies del 6.10-2.
- **D14 · El tributo exigido se protege con cualquier requisito `aduana.tributos_pagados` de la fase actual**, bloqueante o no.
- **D15 · Las carreras viven en `supabase/tests/areas/dinero/carreras.mjs`** y no en `scripts/carreras/pagos-confirmar.mjs`. `scripts/carreras/` no es del
  carril c; el enganche en `scripts/carreras.mjs` son tres líneas.
- **D16 · El monto de un gasto es ≥ 0** (un reparto puede dejar 0,00). **El de un pago, > 0.**
- **D17 · Los docs van a `docs/pasos/6.10-1/`**, porque el paso se parte.
- **D18 · Las pruebas van en `supabase/tests/areas/dinero/`**, no en `humo.sql`.
- **D19 · Al corregir, la tasa se relee sólo si cambian la moneda o el tipo.** Con sólo el monto, se usa la tasa guardada en el sentido del tipo guardado. Un
  registro viejo en otra moneda y sin `tipo_cambio_id` pide elegir el tipo aun para corregir las notas, y eso lo revalúa. En local no hay ninguno; mirarlo
  antes de cargar datos reales.
- **D20 · Un tipo de cambio sirve en los dos sentidos:** moneda → base multiplica y base → moneda divide. Se guarda el valor tal cual y el sentido sale del tipo
  (`on delete restrict`). Los datos reales son USD → BOB con la base en USD.
- **D21 · Un monto con más de dos decimales es un error.** Se mira antes de asignarlo a la fila, porque numeric(18,2) redondea en silencio.
- **D22 · Un pago confirmado admite `lead_id` → nulo** (la FK al borrar el lead) **y `eliminado_en`**, nada más.
