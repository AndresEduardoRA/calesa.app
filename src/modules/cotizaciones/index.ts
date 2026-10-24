// API pública del módulo `cotizaciones`. Lo único que `app/` u otro módulo puede importar.
// Se llena en su fase de docs/PLAN.md; la ficha CLAUDE.md de esta carpeta dice qué entra y qué sale.
//
// Hoy sale lo que el editor de fórmulas (4.21) y el del diseño de la hoja (4.22) van a usar: el compilador de la fórmula como texto,
// sus códigos de error, el tope del texto que guarda una fila, el validador del diseño con sus reglas y las listas cerradas que el
// diseño admite, y los tipos. Todo es puro (`entities/`, cero I/O). Si un editor es un Client Component, saldrá también por `client.ts`.
export { compilarExpresion } from './entities/compilador'
export type {
  ContextoDeCompilacion,
  DestinoDeCompilacion,
  ErrorDeCompilacion,
  ResultadoDeCompilacion,
  Tramo,
} from './entities/compilador'
export { CODIGOS_DE_COMPILACION, type CodigoDeCompilacion } from './entities/motivos-del-compilador'
export { MAXIMO_DE_TEXTO } from './entities/nodos'
export { validarDiseno } from './entities/validar-diseno'
export type { ContextoDeDiseno, ResultadoDeValidacionDeDiseno } from './entities/validar-diseno'
export { REGLAS_DE_DISENO } from './entities/motivos-de-diseno'
export type { RechazoDeDiseno, ReglaDeDiseno } from './entities/motivos-de-diseno'
export {
  ANCHOS,
  EFECTOS_DE_INTERRUPTOR,
  MAXIMO_DE_ATAJOS,
  NIVEL_TODOS,
  PRESENTACIONES,
  SECUNDARIOS,
} from './entities/diseno'
export type {
  CeldaDeDiseno,
  Diseno,
  ItemDeDiseno,
  ModoDeTipoDeCambio,
  SeccionDeDiseno,
} from './entities/diseno'
