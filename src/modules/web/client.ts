// API de cliente del módulo `web` (hooks y tipos puros, nada de servidor). Sólo reexporta el núcleo y cada área (8.01-2): lo nuevo de un paso va en
// `areas/<su área>/client.ts`, nunca aquí (lo vigila `scripts/guardas/areas-b/areas-de-web.test.ts`). La ficha CLAUDE.md dice qué entra y qué sale.
export * from './areas/nucleo/client'
export * from './areas/sitio/client'
export * from './areas/contenido/client'
export * from './areas/cola/client'
export * from './areas/turnos/client'
export * from './areas/portal/client'
