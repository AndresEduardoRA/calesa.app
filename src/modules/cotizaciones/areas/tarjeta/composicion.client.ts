// Composición del área `tarjeta` en el navegador (4.18-2): la lectura de «Vista previa» y el pedido de su PDF (4.18-3b). La importa sólo su feature y ningún barril la
// reexporta (`src/modules/cotizaciones/CLAUDE.md` › «Áreas»).
export { leerTarjeta } from '../../infra/tarjeta/tarjeta.client'
export { pedirElPdf } from '../../infra/tarjeta/descarga-del-pdf.client'
