## 6.04-1 · «Qué falta» y mover con nota y conflicto legible (2026-11-12)

Parte 1 de 3 (`parcial: true`). Entró: `flujos/entities/mover/` (`vista-previa.ts`, `requisitos.ts` con una etiqueta por cada clave de dato de la base y su test contra el SQL vigente, `motivos.ts`, `para-mover.ts`, `boton-de-mover.ts`),
`flujos/infra/mover/` (las RPC `logistica_unidad`, `previsualizar_cambio_fase[_lote]`, `cambiar_fase[_lote]` y la lectura de destinos con `tope + 1`), `flujos/features/mover/` (cinco actions: `leerParaMover`,
`previsualizarCambio`, `previsualizarCambioLote`, `cambiarFase`, `cambiarFaseLote`; las del lote ya están, las usa la parte 3) y `areas/mover/`. En `logistica`: `abiertoAlInicio` en el hueco, los avisos del panel
(`unidad-cambio`, `abrir-hueco`), `features/mover/` (el hueco «Qué falta» con destinos, requisitos con texto, atajos, «Fuera de regla», relectura al volver el foco; el formulario de mover con nota, motivo escrito del botón,
`Ctrl+Enter` y aviso de conflicto) y `pantallas/mover-unidad.ts`. Sin migración, policy ni permiso nuevo.

Pruebas: Vitest de `flujos/entities/mover/` (5 archivos nuevos); `vitest run src/modules/flujos src/modules/logistica "src/app/(app)/logistica" scripts/guardas` en verde; `e2e/logistica-mover.spec.ts` (3 pruebas, escritorio y celular) y
`logistica-unidad`, `logistica-cadena`, `logistica-gastos-y-pagos` en verde: 32 pasaron, 5 saltadas por diseño (salidas en `.piloto/salidas/6.04/`).

Sigue **6.04-2** (notas, historial y «Ver en logística») y **6.04-3** (el lote), servidas en `.piloto/planes/6.04.md`. La fila 6.04 de `docs/PLAN.md` pasa a «Partes estimadas: 3» (la edita el carril `a` al consolidar).

- e2e completo: no (6.04-1, Nivel 1: lo corre el CI del PR; dirigidos en verde)
