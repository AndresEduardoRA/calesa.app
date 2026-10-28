# logistica

Operación diaria sobre el flujo: cadena por fase, mover con vista previa, documentos con aprobación y vencimiento, transporte (embarques y contenedores como grupos), declaraciones aduaneras, gastos y pagos, notas, alertas por demora y margen contra la cotización final.

## Entra y sale

- Entra: acciones de logística en `/logistica/*`, subida de documentos (también desde cámara), confirmación de pagos, cron de alertas.
- Sale: `bandejaLogistica()` (para `tablero`), `margenDe(vehiculoId)`, `<LineaTiempoUnidad>`, `dondeEsta(busqueda)`. Lo consumen `tablero`, `vehiculos` (ficha), `web` (portal: fases y documentos visibles).
- Depende de: `vehiculos`, `flujos`, `cotizaciones`.

## Archivos clave

- `entities/documentos.ts` — estados pendiente/subido/aprobado/rechazado y qué cuenta para un requisito (aprobado y vivo, mime admitido, entre min y max).
- `entities/grupos.ts` — agrupar `transportes` por booking / contenedor (vistas, no entidades) y la edición «todo o nada».
- `features/cadena/`, `features/unidad/` (panel con «qué falta»), `features/documentos/`, `features/transporte/`, `features/aduana/`, `features/gastos/`, `features/pagos/`, `features/donde-esta/`.

## Tablas

`documentos`, `puertos`, `navieras`, `transportes` (1:1 con la unidad), `flujos_transporte_oferta`, `declaraciones_aduana`, `declaraciones_vehiculos`, `categorias_gasto`, `gastos`, `pagos`, `notas`.
RPC: `margen_vehiculo`, `alertas_demora` (cron), `storage_refcount`; mover vía `flujos`.

## No se rompe

- La entidad agrupadora no es dueña de datos: documentos, gastos, pagos, notas y transporte cuelgan **siempre** de la unidad (`vehiculo_id | repuesto_id`, uno y sólo uno). Prorratear un flete = N filas de `gastos`.
- Mientras la unidad esté en una fase, no se vacía el dato ni se quita el documento que esa fase exige como bloqueante (triggers); si pasa igual, la unidad aparece «fuera de regla», no se expulsa.
- Confirmar un pago es un acto sellado (`pago_sellos`): quién y cuándo los pone el trigger, no el cliente.
- El margen devuelve `null` sin venta registrada; la UI dice «Sin venta registrada», nunca $0.

## Ojo

- Documentos nunca se comprimen; fotos sí (WebP). Objetos por hash; un documento común a 8 vehículos es 1 objeto y 8 filas.
- «DUI pagada» es derivada: todos los vehículos de la declaración tienen un gasto vivo de la categoría tributos. Comprobante ≠ pago.
- Conflicto al mover o editar transporte → `PT409` → «Alguien lo cambió · Recargar». Nunca pisar en silencio.
