// API pública del módulo `cotizaciones`. Lo único que `app/` u otro módulo puede importar.
// Se llena en su fase de docs/PLAN.md; la ficha CLAUDE.md de esta carpeta dice qué entra y qué sale.
//
// Hoy sale lo que el editor de fórmulas (4.21) va a usar: el compilador de la fórmula como texto, sus códigos de error, el tope del
// texto que guarda una fila y los tipos. Todo es puro (`entities/`, cero I/O). Si el editor es un Client Component, saldrá también
// por `client.ts`.
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
