// API pública del módulo `cotizaciones`. Lo único que `app/` u otro módulo puede importar. Sólo reexporta el núcleo y cada área
// (4.15-4): lo nuevo de un paso va en `areas/<su área>/index.ts`, nunca aquí (lo vigila `scripts/guardas/areas-de-cotizaciones.test.ts`).
// La ficha CLAUDE.md de esta carpeta dice qué entra y qué sale; un nombre repetido entre dos áreas es un error de `tsc`.
export * from './areas/nucleo/index'
export * from './areas/listado/index'
export * from './areas/tarjeta/index'
export * from './areas/plantilla/index'
export * from './areas/formula/index'
export * from './areas/diseno/index'
export * from './areas/tablas/index'
export * from './areas/papelera/index'
export * from './areas/final/index'
export * from './areas/comprobantes/index'
export * from './areas/comentarios/index'
