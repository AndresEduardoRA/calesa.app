// La API de servidor del área `papelera` de `cotizaciones`. Sale por el `index.ts` de la raíz, que sólo la reexporta (4.15-4).
//
// `leerPapeleraDeCotizaciones({ cursor, tamano })` (4.24-2): una página de lotes de la papelera de cotizaciones; la lee `/cotizaciones/papelera`. La pantalla
// (`<PapeleraDeCotizaciones>`) sale por `pantallas/papelera.ts` y el enlace del listado por `pantallas/papelera-listado.ts`.
export { leerPapeleraDeCotizaciones } from './composicion'
