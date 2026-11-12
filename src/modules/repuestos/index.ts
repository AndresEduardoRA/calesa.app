// API pública del módulo `repuestos` para el servidor. Sólo reexporta el núcleo y cada área (8.08-2): lo nuevo de un paso va en
// `areas/<su área>/index.ts`, nunca aquí (lo vigila `scripts/guardas/areas-c/areas-de-repuestos.test.ts`). La ficha CLAUDE.md dice qué entra y qué sale.
export * from './areas/nucleo/index'
export * from './areas/proyectos/index'
export * from './areas/items/index'
export * from './areas/stock/index'
export * from './areas/compras/index'
export * from './areas/cotizador/index'
export * from './areas/catalogos/index'
export * from './areas/flujo/index'
