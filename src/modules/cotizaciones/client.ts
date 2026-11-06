// API del módulo `cotizaciones` para los Client Components de afuera (`.claude/rules/modulos.md`): hooks y tipos puros, nada de servidor.
// Sólo reexporta el núcleo y cada área (4.15-4): lo nuevo de un paso va en `areas/<su área>/client.ts`, nunca aquí.
export * from './areas/nucleo/client'
export * from './areas/listado/client'
export * from './areas/tarjeta/client'
export * from './areas/plantilla/client'
export * from './areas/formula/client'
export * from './areas/diseno/client'
export * from './areas/tablas/client'
export * from './areas/papelera/client'
export * from './areas/final/client'
export * from './areas/comprobantes/client'
export * from './areas/comentarios/client'
