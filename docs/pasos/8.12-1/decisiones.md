## 2026-11-12 · Decisiones del paso 8.12-1 (la fórmula y la base del cotizador de repuestos)

- **D1 · No hay caja sugerida automática:** la línea elige una caja activa del snapshot o «Sin caja» (0); `caja_sugerida` guarda la elegida. La recomendada de la fila.
- **D2 · Aceptar copia el unitario de cada línea con ítem a `repuestos_items.precio_cliente`** (y su `moneda`); una sola aceptada por proyecto (índice parcial;
  aceptar otra anula la anterior). La recomendada de la fila.
- **D3 · La cotización de repuestos se numera con `identity`, con huecos:** no es un comprobante.
- **D4 · Un total que no cabe en numeric(18,2) es un error de la línea** (`no_cabe` en la fórmula, 22023 hint `cantidad` al guardar), no un recorte.
- **D5 · El snapshot guarda los números como texto y sólo lo activo de la moneda** (la configuración de id más alto, tramos por `costo_min`, cajas por `monto`):
  un `float` de JSON perdería cifras, y es lo que se usó, no la tabla entera. Versión 1.
- **D6 · El total de la cotización es nulo si falta el de alguna línea o no hay líneas** (nulo no es 0, como el margen del 8.11).
- **D7 · `redondeo > 0` como `check … not valid`:** no valida filas viejas, que la fórmula toma como 0,01; se valida del todo cuando 8.12-2 escriba la configuración.
- **D8 · Crear, guardar, aceptar y anular exigen el proyecto vivo y abierto** (como compras): para tocar una cotización de un proyecto cerrado, se reabre.
- **D9 · Las RPC responden los montos como texto,** para que la hoja no pase por `float`.
- **D10 · Mandar `total`, `logistica_sugerida`, `caja_sugerida`, `orden` o `cotizacion_id` en una línea es un error (22023 con esa clave),** no se ignora.
- **D11 · Aceptar no copia a ítems eliminados ni a líneas libres,** y no falla por ellos.
- **D12 · Anular una aceptada no revierte el precio del ítem:** el precio queda como dato del ítem; se cambia en la hoja de ítems o aceptando otra.
- **D13 · Aceptar pide `repuestos.cotizar`, `repuestos.ver` y `repuestos.editar`:** fija `precio_cliente`, que hoy escribe quien edita ítems (auditoría del plan, 2;
  la opción conservadora). Crear, guardar y anular piden `repuestos.cotizar` y `repuestos.ver`.
- **D14 · La logística y la caja son por unidad y el redondeo va al unitario:** así el precio que se copia al ítem es exacto (`total / cantidad`).
- **D15 · `guardar` y `aceptar` exigen `config_snapshot ->> 'version' = '1'`** (23514 hint `config_snapshot`); la migración anula las cotizaciones no anuladas sin
  esa versión antes del índice: las escribió el cliente cuando la policy lo dejaba, y el área nunca tuvo pantalla (auditoría del plan, 3).
- **D16 · `repuestos_cotizacion_guardar` tiene 86 líneas y su migración 320:** pasa los topes de 80 y 300 por poco; la validación de cada línea ya vive en
  `_repuesto_cotizacion_linea_de` y `_repuesto_cotizacion_monto`, y partir más el armado de la respuesta no ayuda a leerla (auditoría del informe, 1).
- **D17 · El permiso va con `assert_permiso`** (como compras): el 42501 dice «No tienes el permiso «repuestos.cotizar».».
