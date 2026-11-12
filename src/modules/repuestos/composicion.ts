// Composición del módulo `repuestos` en el servidor. Sólo reexporta el núcleo y cada área (8.08-2): lo nuevo de un paso va en
// `areas/<su área>/composicion.ts`, nunca aquí (lo vigila `scripts/guardas/areas-c/areas-de-repuestos.test.ts`). La ficha CLAUDE.md dice qué entra y qué sale.
export * from './areas/nucleo/composicion'
export * from './areas/proyectos/composicion'
export * from './areas/items/composicion'
export * from './areas/stock/composicion'
export * from './areas/compras/composicion'
export * from './areas/cotizador/composicion'
export * from './areas/catalogos/composicion'
export * from './areas/flujo/composicion'
