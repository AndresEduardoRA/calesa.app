# cotizaciones

Cotizador configurable: fórmula por origen como grafo de nodos versionado, XCell con ⚙ de default global, tablas de referencia, snapshot por cotización, preventa/final, versiones, comentarios, adjuntos, reportes, plantilla de tarjeta y PDF, comprobantes.

## Entra y sale

- Entra: wizard `/cotizaciones/nuevo` (origen → vehículo → lead → hoja → resumen), editor de fórmulas en Configuración, ⚙ de una celda.
- Sale: `evaluar(definicion, params, entradas)` (motor puro), `getCotizacion()`, `<ResumenCotizacion>`, `cotizacionFinalDe(vehiculoId)`. Lo consumen `logistica` (final vs real), `chat`, `buscador`, `web` (precio público), `tablero`.
- Depende de: `leads`, `vehiculos`, `empresa` (tipos de cambio).

## Archivos clave

- `entities/nodos.ts` — el Zod de cada nodo, discriminado por `tipo` (y `calculo` por `op`), estricto; `referenciasDe()` con el `switch`
  exhaustivo. `entities/formula.ts` — `definicion` (`buckets`, `total_en`, `grupos`), `params` (constantes y tablas congeladas, D5) y
  el modo que recibe el motor.
- `entities/validar.ts` (con `validar-contexto.ts`, `validar-grupos.ts`, `validar-variante.ts`, `motivos-de-formula.ts` y
  `medidor.ts`) — espejo TS de `validar_formula()`: la forma y 28 reglas cruzadas, lineal y con contador de visitas
  (`docs/COTIZADOR.md` › «Las reglas»).
- `entities/motor.ts` (4.05, prompt 2) — evaluación en una pasada, grupos por tipo de cambio, salidas `total | base_imponible | aparte`.
- `features/hoja/` (XCell + binding `valores/fuentes/defaults`), `features/formulas/` (borrador/publicar/historial/revertir), `features/plantillas/`, `features/pdf/` (route handler con `@react-pdf/renderer`).
- `docs/COTIZADOR.md` — la forma del grafo; leerlo antes de tocar el motor.

## Tablas

`formulas`, `tablas_referencia`, `tablas_referencia_filas`, `plantillas_tarjeta`, `cotizaciones`, `cotizaciones_revisiones`, `cotizaciones_comentarios`, `cotizaciones_adjuntos`, `cotizaciones_reportes`, `cotizaciones_favoritos`, `comprobantes`, `comprobantes_contadores`.
RPC: `formula_guardar_borrador`, `formula_publicar`, `formula_descartar_borrador`, `formula_cambiar_constante`, `validar_formula`, `plantilla_*`, `cotizacion_marcar_final`, `cotizacion_moderar`, `comprobante_emitir/anular`, `margen_vehiculo`.

## No se rompe

- Una cotización se recalcula **siempre** con su `formula_id`, nunca con la vigente. El snapshot (`valores`, `fuentes`, `tipos_cambio`, `totales`) es la autoridad.
- Versionado append-only: un borrador y una publicada por origen; revertir = publicar una copia. El ⚙ de una constante publica N+1 con nota automática; el de un tipo de cambio lo cambia para la empresa (`tipo_cambio_guardar`, D7).
- A lo sumo una cotización final activa por vehículo (`cotizacion_marcar_final`). Al entrar a logística la final se congela; si el vehículo sale de logística vuelve a preventa sin borrar historial.
- Sin motor de expresiones al cotizar: sólo las operaciones cerradas de `calculo`. La «fórmula como texto» (D4,
  `docs/DECISIONES.md` 2026-10-22) se compila a ese grafo **al configurar**, y lo que no se puede compilar a nodos se rechaza. Un nodo
  nuevo = tipo discriminado (`nodos.ts`) + `switch` exhaustivo (`referenciasDe()`) + caso en `validar_formula()` y en el juego de prueba.
- **D7 (2026-10-22):**
  - la hoja **calcula en la base** (`cotizacion_evaluar()` sobre `evaluar_formula()`, espejo de `motor.ts`) para todos;
  - **la fórmula (`definicion`, `params`, el texto) viaja sólo a quien tiene `cotizaciones.configurar`**, y `motor.ts` queda para el
    editor de la fórmula y la prueba de paridad;
  - lo que un nivel de acceso esconde no viaja por ninguna lectura (`docs/COTIZADOR.md` › «Niveles de acceso»).
- Lo decidido al abrir la Fase 4 (D1 a D6: «vencida», «desactualizada», el lead obligatorio, el vehículo según un ajuste de la
  empresa, la hoja como el Excel, las tablas que publican N+1 y la numeración) está en `docs/PLAN.md` › «Fase 4».

## Ojo

- `fuentes[id]` pinta la XCell: `override` → anillo, `sugerido` → punto (desde 4.05 reemplaza a `lookup`). No derivarlo comparando
  números.
- `comprobantes_contadores` es tabla, no sequence: la numeración no puede tener huecos.
- Office/«oficina» no es un caso especial: es un origen manual con una fórmula de dos nodos.
