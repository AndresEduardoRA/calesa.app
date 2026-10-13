// API pública del módulo `flujos` para el servidor. Con `client.ts`, lo único que `app/` u otro
// módulo puede importar. Por ahora sólo la lectura de las fases de un origen; la configuración del
// flujo y mover de fase llegan con sus fases de docs/PLAN.md.

// Las fases del flujo de un origen, para nombrarlas y filtrar por ellas (el inventario)
export { leerFasesDeOrigen } from './composicion'
export type { FaseResumen } from './entities/fase'
