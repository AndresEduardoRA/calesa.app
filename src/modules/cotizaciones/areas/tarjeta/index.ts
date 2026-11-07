// La API de servidor del área `tarjeta` de `cotizaciones`. Sale por el `index.ts` de la raíz, que sólo la reexporta (4.15-4).
//
// `leerAsesorDeLaCotizacion(id)` (4.18-2): a quien creó una cotización guardada, para el «Asesor:» de su tarjeta; la lee `/cotizaciones/[id]`. La tarjeta en pantalla
// (`<ProveedorDeLaTarjeta>`) sale por `pantallas/tarjeta.ts`.
//
// `pdfDeUnaGuardada({ lectura, pagina, locale, empresa, topeDelLogo })` (4.18-3a): los bytes y el nombre del PDF de una guardada, de lo guardado; lo pide
// `GET /cotizaciones/[id]/pdf`.
export { leerAsesorDeLaCotizacion, pdfDeUnaGuardada, type EntradaDelPdf } from './composicion'
