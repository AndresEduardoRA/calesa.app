// La API de servidor del NÚCLEO de `flujos` (5.02): lo que comparten las áreas. Sale por el `index.ts` de la raíz, que sólo la reexporta.
// Hoy: las fases de un origen para nombrarlas y filtrar por ellas (el inventario); el flujo entero para configurarlo llega en este mismo paso.

// Las fases del flujo de un origen, para nombrarlas y filtrar por ellas (el inventario)
export { leerFasesDeOrigen } from './composicion'
export type { FaseResumen } from '../../entities/fase'
