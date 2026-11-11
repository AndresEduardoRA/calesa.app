// API de cliente del módulo `flujos` (hooks y tipos puros, nada de servidor). Sólo reexporta el núcleo y cada área (5.02): lo nuevo va en
// `areas/<su área>/client.ts`, nunca aquí (lo vigila `scripts/guardas/areas-de-flujos.test.ts`). La ficha CLAUDE.md dice qué entra y qué sale.
export * from './areas/nucleo/client'
export * from './areas/fases/client'
export * from './areas/transiciones/client'
export * from './areas/requisitos/client'
export * from './areas/reglas/client'
export * from './areas/documentos/client'
export * from './areas/revisar/client'
export * from './areas/mover/client'
