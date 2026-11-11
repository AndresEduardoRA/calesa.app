// Composición del módulo `flujos` en el servidor. Sólo reexporta el núcleo y cada área (5.02): lo nuevo va en
// `areas/<su área>/composicion.ts`, nunca aquí (lo vigila `scripts/guardas/areas-de-flujos.test.ts`). La ficha CLAUDE.md dice qué entra y qué sale.
export * from './areas/nucleo/composicion'
export * from './areas/fases/composicion'
export * from './areas/transiciones/composicion'
export * from './areas/requisitos/composicion'
export * from './areas/reglas/composicion'
export * from './areas/documentos/composicion'
export * from './areas/revisar/composicion'
export * from './areas/mover/composicion'
