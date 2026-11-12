// API de cliente del módulo `repuestos` (hooks y tipos puros, nada de servidor). Sólo reexporta el núcleo y cada área (8.08-2): lo nuevo de un paso va en
// `areas/<su área>/client.ts`, nunca aquí (lo vigila `scripts/guardas/areas-c/areas-de-repuestos.test.ts`). La ficha CLAUDE.md dice qué entra y qué sale.
export * from './areas/nucleo/client'
export * from './areas/proyectos/client'
export * from './areas/items/client'
export * from './areas/stock/client'
export * from './areas/compras/client'
export * from './areas/cotizador/client'
export * from './areas/catalogos/client'
export * from './areas/flujo/client'
