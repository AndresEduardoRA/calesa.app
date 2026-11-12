## 2026-11-11 — Paso 6.10-2: comprobantes, listas, margen y anular un pago

- **D1 · Un comprobante se lee por la fila que lo nombra**, no sólo por la carpeta. Un gasto pide `gastos.ver` de su unidad, un pago `pagos.ver` y una compra
  de repuestos `costos.ver`. Con la carpeta sola, quien ve pagos (el asesor, con «propios») listaría la carpeta del vehículo y bajaría los comprobantes de
  gastos (DECISIONES, 2026-10-13: el inventario no muestra costos). Un prorrateo se lee desde cualquier vehículo del lote, aunque el archivo esté en la
  carpeta del primero.
- **D2 · Un objeto que ninguna fila nombra** (recién subido) lo lee sólo quien puede subir a esa carpeta. Uno de una fila borrada no lo lee nadie por la API
  (lo limpia `storage-gc` por refcount).
- **D3 · La unidad sale del nombre con `_comprobante_unidad`**, como `_cotizacion_de_objeto`: un nombre fuera de `<uuid>/<64 hex>.<ext>` da falso y no 22P02.
- **D4 · `gastos_listar` y `pagos_listar` son de vehículos.** Los de repuestos los lista su paso (Fase 8).
- **D5 · El tamaño es `_acotar_pagina(p_tope, 50, 100) + 1`** (una de más: hay otra página). El registro en `paginas-en-la-base.ts` va en 6.11, con la
  llamada. Con cursor y sin cursor son dos consultas (`escala.md`), para que la condición del cursor quede como condición de índice.
- **D6 · Sin la clave en ningún origen, la lista sale vacía**, como la RLS, y no da 42501.
- **D7 · Las listas no devuelven el lead ni las notas** (el drawer de 6.11 lee la fila). Sí el título del vehículo y el nombre de la categoría: quien ve la
  fila del gasto o del pago ya ve a qué vehículo pertenece y su categoría.
- **D8 · `margen_vehiculo` con un vehículo inexistente o en la papelera da 42501** con el mismo texto que sin la clave; antes devolvía ceros a quien tenía la
  clave en otro origen. `por_categoria` lleva sólo las categorías con gasto vivo, en el orden del catálogo, y suma `real`.
- **D9 · `pago_anular`** usa la clave de confirmar y un motivo de 1 a 500; sólo anula confirmados de vehículo. No deja sin cumplir un requisito
  `pagos.confirmado` o `pagos.umbral_pct` de la fase actual, bloqueante o no. La constancia va a `actividad`, sin columnas nuevas. Mira si se ve el pago
  antes de decir que es de un proyecto. Límite conocido: no cubre la anulación a la vez que un cambio de fase (abierto, como los tributos).
- **D10 · Un pago confirmado y anulado no vuelve**: su `eliminado_en` sólo va de nulo a una fecha (lo dice `pago_sellado`).
- **D11 · Los gastos y pagos viejos sin `tipo_cambio_id` no se migran.** Al corregirlos, la base pide el tipo; en local no hay ninguno y la nube no se toca.
- **D12 · Las pruebas de storage van en `areas/dinero/comprobantes.sql`**, sobre el doble de `storage.objects` de PGlite, y corrieron también contra el
  storage real del Postgres 17 local.
