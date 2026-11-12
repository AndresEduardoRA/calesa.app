// La API de servidor del área `contenido` de `web`. Sale por el `index.ts` de la raíz.
// Las guías (8.03-1): la lista de la pestaña «Guías», la guía de su página y las opciones de sus selectores. Las compone `src/app`.
export { leerGuia, leerGuias, leerOpcionesDeGuia } from './composicion'
export {
  RUTA_DE_LA_LISTA_DE_GUIAS,
  estadoDeGuia,
  rutaDeGuia,
  type EstadoDeGuia,
  type GuiaCompleta,
  type GuiaDeLista,
  type OpcionesDeGuia,
} from '../../entities/contenido/guias'
