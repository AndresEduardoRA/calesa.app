// Composición del módulo `web` en el servidor. Sólo reexporta el núcleo y cada área (8.01-2): lo nuevo de un paso va en
// `areas/<su área>/composicion.ts`, nunca aquí (lo vigila `scripts/guardas/areas-b/areas-de-web.test.ts`).
export * from './areas/nucleo/composicion'
export * from './areas/sitio/composicion'
export * from './areas/contenido/composicion'
export * from './areas/cola/composicion'
export * from './areas/turnos/composicion'
export * from './areas/portal/composicion'
