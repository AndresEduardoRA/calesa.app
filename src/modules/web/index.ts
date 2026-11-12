// API pública del módulo `web` para el servidor: lo único que `app/` u otro módulo puede importar. Sólo reexporta el núcleo y cada área (8.01-2):
// lo nuevo de un paso va en `areas/<su área>/index.ts`, nunca aquí (lo vigila `scripts/guardas/areas-b/areas-de-web.test.ts`). La ficha CLAUDE.md dice qué entra y qué sale.
export * from './areas/nucleo/index'
export * from './areas/sitio/index'
export * from './areas/contenido/index'
export * from './areas/cola/index'
export * from './areas/turnos/index'
export * from './areas/portal/index'
