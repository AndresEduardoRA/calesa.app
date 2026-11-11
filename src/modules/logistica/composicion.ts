// Composición del módulo `logistica` en el servidor. Sólo reexporta el núcleo y cada área (6.01): lo nuevo de un paso va en
// `areas/<su área>/composicion.ts`, nunca aquí (lo vigila `scripts/guardas/areas-de-logistica.test.ts`). La ficha CLAUDE.md dice qué entra y qué sale.
export * from './areas/nucleo/composicion'
export * from './areas/cadena/composicion'
export * from './areas/mover/composicion'
export * from './areas/documentos/composicion'
export * from './areas/transporte/composicion'
export * from './areas/aduana/composicion'
export * from './areas/dinero/composicion'
export * from './areas/alertas/composicion'
