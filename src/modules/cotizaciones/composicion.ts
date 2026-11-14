// Composición del módulo en el servidor. Sólo reexporta la del núcleo y la de cada área (4.15-4): adentro, un caso de uso importa la
// de su lugar (`areas/<área>/composicion.ts`), nunca ésta; lo nuevo de un paso va en la de su área.
export * from './areas/nucleo/composicion'
export * from './areas/listado/composicion'
export * from './areas/tarjeta/composicion'
export * from './areas/plantilla/composicion'
export * from './areas/formula/composicion'
export * from './areas/diseno/composicion'
export * from './areas/tablas/composicion'
export * from './areas/papelera/composicion'
export * from './areas/final/composicion'
export * from './areas/comprobantes/composicion'
export * from './areas/comentarios/composicion'
export * from './areas/aprobada/composicion'
