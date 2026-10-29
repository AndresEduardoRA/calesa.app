# repuestos

Proyectos de repuestos por vehículo (o externos), ítems que recorren el flujo de repuestos con el mismo motor, imágenes, stock, compras con permiso de costos y un cotizador propio con configuración versionada.

## Entra y sale

- Entra: proyectos desde la ficha del vehículo o sueltos, hoja de ítems editable celda a celda (XCell compacta), compras, movimientos de stock, cotizaciones de repuestos.
- Sale: `proyectoDe(vehiculoId)`, `esperasQueDestraban(vehiculoId)` (para `flujos`/`logistica`), `<ResumenRepuestos>`. Lo consumen `vehiculos`, `logistica`, `tablero`, `buscador`.
- Depende de: `vehiculos`, `flujos`, `leads`.

## Archivos clave

- `entities/cotizador.ts` — fórmula importado (costo × factor + logística + caja) / local ((costo + logística + caja) × (1 + recargo)) con redondeo del snapshot; tests.
- `entities/stock.ts` — reglas de sobrante (reasignar / vender suelto / devolver) y movimientos.
- `features/proyectos/`, `features/items/` (hoja), `features/compras/`, `features/stock/`, `features/cotizador/`, `features/catalogos/`.

## Tablas

`repuestos_catalogos` (un catálogo genérico: `catalogo` ∈ tipo_pieza | condicion | modo_transporte | pais_origen, con `datos` jsonb), `repuestos_proyectos`, `repuestos_items`, `repuestos_items_imagenes`, `repuestos_stock_movimientos`, `repuestos_compras`, `repuestos_cotizador_config`, `repuestos_tramos_logistica`, `repuestos_cajas`, `repuestos_cotizaciones`, `repuestos_cotizaciones_lineas`.

## No se rompe

- Es el **ítem**, no el proyecto, el que recorre el flujo; el estado del proyecto se deriva. Mover pasa por `cambiar_fase(repuesto_id)`.
- Ningún costo vive en `repuestos_items` (RLS no esconde columnas): compras y pagos tienen su tabla y su permiso (`repuestos.costos.*`).
- `repuestos_cotizador_config` es append-only: la vigente es la de id más alto; una cotización congela su `config_snapshot`.
- Un ítem con historial, documentos o compras no se borra: pasa a stock o se marca perdido (fase final sin llegar).

## Ojo

- Las esperas vehículo↔repuestos (`fases_requisitos.espera_fase_id`) cumplen cuando ningún ítem vivo está pendiente; los que terminaron sin llegar no frenan y se muestran.
- Por encima del último tramo de logística no hay sugerencia: la celda pide el monto (`emptyLabel`), no asume 0.
