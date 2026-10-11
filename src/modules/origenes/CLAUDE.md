# origenes

Orígenes de vehículos configurables (subasta/apibara o manual), su layout de campos y sus categorías; al crear uno nacen su flujo y su fórmula vacía.

## Entra y sale

- Entra: CRUD del dueño en Configuración › Orígenes; editor del layout (orden, grupo, requerido, en tarjeta, filtrable, público, `clave_apibara`).
- Sale: `getOrigenes()`, `getLayout(origenId)` (campos + categorías), `esDeSubasta(origen)`. Lo consumen `vehiculos` (ficha, filtros, alta), `cotizaciones`, `flujos`, `web`.
- Depende de: `equipo` (permiso `origenes.gestionar`).

## Archivos clave

- `entities/layout.ts` — tipos de campo (texto, número, moneda, fecha, select, booleano, enlace), validación pura de `atributos` contra el layout.
- `entities/preconfiguraciones.ts` — espejo TS de `origen_preconfigurar_campos()` (sólo para mostrar qué va a nacer).
- `features/origenes/`, `features/campos/` (editor con arrastrar), `features/categorias/`.

## Tablas

`origenes`, `origenes_campos`, `categorias`. Triggers: `origen_crear_flujo`, `origen_preconfigurar_campos`.

## No se rompe

- Un origen con vehículos no se elimina: se desactiva (`activo = false`) y desaparece de las altas, no de las fichas.
- Los campos comunes (marca, modelo, año, VIN, lote, precio) son columnas de `vehiculos`; el layout sólo decide cómo se muestran. Lo demás vive en `atributos` y lo valida `vehiculo_validar_atributos`.
- `clave_apibara` sólo tiene sentido en orígenes de tipo subasta; el trigger lo rechaza en manuales.

## Ojo

- Promover un atributo a columna (porque necesita índice o UNIQUE) es migración + fila en `origenes_campos` apuntando a la columna; no se hace desde la UI.
- Los nombres de orígenes nunca aparecen fijos en la UI ni en el código: todo sale de la fila.
