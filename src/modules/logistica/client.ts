// API de cliente del módulo `logistica` (hooks y tipos puros, nada de servidor). Sólo reexporta el núcleo y cada área (6.01): lo nuevo de un paso va en
// `areas/<su área>/client.ts`, nunca aquí (lo vigila `scripts/guardas/areas-de-logistica.test.ts`). La ficha CLAUDE.md dice qué entra y qué sale.
export * from './areas/nucleo/client'
export * from './areas/cadena/client'
export * from './areas/mover/client'
export * from './areas/documentos/client'
export * from './areas/transporte/client'
export * from './areas/aduana/client'
export * from './areas/dinero/client'
export * from './areas/alertas/client'
