// Composición del área `comentarios` en el navegador: leer los comentarios de una cotización y las respuestas de uno (4.27-2), y leer, subir y bajar sus adjuntos
// (4.27-3). La importa sólo su feature y ningún barril la reexporta (`src/modules/cotizaciones/CLAUDE.md` › «Áreas»).
export {
  leerComentarios,
  leerRespuestas,
  NO_SE_CARGARON,
} from '../../infra/comentarios/leer.client'
export {
  leerAdjuntos,
  NO_SE_CARGARON_LOS_ADJUNTOS,
  subirAdjunto,
  urlDeDescarga,
} from '../../infra/comentarios/adjuntos.client'
