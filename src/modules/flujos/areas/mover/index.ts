// La API de servidor del área `mover` de `flujos` (5.02, 6.01, 6.04). Sale por el `index.ts` de la raíz.
// 6.01: `leerFlujoDeOrigen(origenId)` da las reglas activas del origen y los atributos de sus fases para mover (lo usa el panel de la unidad de `logistica`).
// 6.04: las actions de mover salen por `client.ts` (`leerParaMover`, `cambiarFase`, `cambiarFaseLote`, `previsualizarCambio`, `previsualizarCambioLote`).
export { leerFlujoDeOrigen } from './composicion'
export { reglaActiva } from '../../entities/mover/flujo-de-origen'
export type { FaseParaMover, FlujoDeOrigen } from '../../entities/mover/flujo-de-origen'
