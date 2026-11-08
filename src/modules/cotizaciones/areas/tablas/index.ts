// La API de servidor del área `tablas` de `cotizaciones`. Sale por el `index.ts` de la raíz, que sólo la reexporta (4.15-4).
//
// `leerTablasDeReferencia(origenId)` (4.23-2): las tablas de referencia activas del origen y las compartidas (una compartida que el origen tapa con una propia va
// `tapada`), con tope de 100 y `hayMas`. `leerTablaParaEditar(tablaId)`: la tabla con su versión y **todas** sus filas en su orden, leídas por cursor; si una fila no se
// lee o hay más de 2.000, no se devuelve (publicarla a medias borraría lo que faltó). Las lee la pestaña «Tablas» de Configuración › Cotización (4.23-3).
export { leerTablaParaEditar, leerTablasDeReferencia } from './composicion'
