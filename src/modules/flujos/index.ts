// API pública del módulo `flujos` para el servidor. Sólo reexporta el núcleo y cada área (5.02): lo nuevo de un paso va en
// `areas/<su área>/index.ts`, nunca aquí (lo vigila `scripts/guardas/areas-de-flujos.test.ts`). La ficha CLAUDE.md dice qué entra y qué sale.
export * from './areas/nucleo/index'
export * from './areas/fases/index'
export * from './areas/transiciones/index'
export * from './areas/requisitos/index'
export * from './areas/reglas/index'
export * from './areas/documentos/index'
export * from './areas/revisar/index'
export * from './areas/mover/index'
