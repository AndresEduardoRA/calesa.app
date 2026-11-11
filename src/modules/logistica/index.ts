// API pública del módulo `logistica` para el servidor. Sólo reexporta el núcleo y cada área (6.01): lo nuevo de un paso va en
// `areas/<su área>/index.ts`, nunca aquí (lo vigila `scripts/guardas/areas-de-logistica.test.ts`). La ficha CLAUDE.md dice qué entra y qué sale.
export * from './areas/nucleo/index'
export * from './areas/cadena/index'
export * from './areas/mover/index'
export * from './areas/documentos/index'
export * from './areas/transporte/index'
export * from './areas/aduana/index'
export * from './areas/dinero/index'
export * from './areas/alertas/index'
