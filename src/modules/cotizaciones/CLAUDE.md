# cotizaciones

Cotizador configurable: fórmula por origen como grafo de nodos versionado, XCell con ⚙ de default global, tablas de referencia, snapshot por cotización, preventa/final, versiones, comentarios, adjuntos, reportes, plantilla de tarjeta y PDF, comprobantes.

## Entra y sale

- Entra: wizard `/cotizaciones/nuevo` (origen → vehículo → lead → hoja → resumen), editor de fórmulas en Configuración, ⚙ de una celda.
- Sale: `evaluar(definicion, params, entradas)` (motor puro), `getCotizacion()`, `<ResumenCotizacion>`, `cotizacionFinalDe(vehiculoId)`. Lo consumen `logistica` (final vs real), `chat`, `buscador`, `web` (precio público), `tablero`.
- Depende de: `leads`, `vehiculos`, `empresa` (tipos de cambio).

## Archivos clave

- `entities/motor.ts` — evaluación topológica, buckets por tipo de cambio, salidas `total | base_imponible | aparte`; tests contra la fórmula del seed (`supabase/seed.sql`, origen «Subasta USA»).
- `entities/validar.ts` — espejo TS de `validar_formula()` (sin ciclos, un único total, referencias hacia atrás).
- `features/hoja/` (XCell + binding `valores/fuentes/defaults`), `features/formulas/` (borrador/publicar/historial/revertir), `features/plantillas/`, `features/pdf/` (route handler con `@react-pdf/renderer`).
- `docs/COTIZADOR.md` — la forma del grafo; leerlo antes de tocar el motor.

## Tablas

`formulas`, `tablas_referencia`, `tablas_referencia_filas`, `plantillas_tarjeta`, `cotizaciones`, `cotizaciones_revisiones`, `cotizaciones_comentarios`, `cotizaciones_adjuntos`, `cotizaciones_reportes`, `cotizaciones_favoritos`, `comprobantes`, `comprobantes_contadores`.
RPC: `formula_guardar_borrador`, `formula_publicar`, `formula_descartar_borrador`, `formula_cambiar_constante`, `validar_formula`, `plantilla_*`, `cotizacion_marcar_final`, `cotizacion_moderar`, `comprobante_emitir/anular`, `margen_vehiculo`.

## No se rompe

- Una cotización se recalcula **siempre** con su `formula_id`, nunca con la vigente. El snapshot (`valores`, `fuentes`, `tipos_cambio`, `totales`) es la autoridad.
- Versionado append-only: un borrador y una publicada por origen; revertir = publicar una copia. El ⚙ publica N+1 con nota automática.
- A lo sumo una cotización final activa por vehículo (`cotizacion_marcar_final`). Al entrar a logística la final se congela; si el vehículo sale de logística vuelve a preventa sin borrar historial.
- Sin motor de expresiones al cotizar: sólo las operaciones cerradas de `calculo`. La «fórmula como texto» (D4,
  `docs/DECISIONES.md` 2026-10-22) se compila a ese grafo **al configurar**, y lo que no se puede compilar a nodos se rechaza. Un nodo
  nuevo = tipo discriminado + `switch` exhaustivo + caso en `validar_formula()`.
- Lo decidido al abrir la Fase 4 (D1 a D6: «vencida», «desactualizada», el lead obligatorio, el vehículo según un ajuste de la
  empresa, la hoja como el Excel, las tablas que publican N+1 y la numeración) está en `docs/PLAN.md` › «Fase 4».

## Ojo

- `fuentes[id]` pinta la XCell: `override` → anillo, `lookup` → punto «sugerido». No derivarlo comparando números.
- `comprobantes_contadores` es tabla, no sequence: la numeración no puede tener huecos.
- Office/«oficina» no es un caso especial: es un origen manual con una fórmula de dos nodos.
