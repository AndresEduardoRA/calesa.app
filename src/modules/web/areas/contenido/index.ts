// La API de servidor del área `contenido` de `web`. Sale por el `index.ts` de la raíz.
// Las categorías y los legales (8.03-2): la lista del panel y los dos documentos de la pestaña «Legales».
// Las guías (8.03-1): la lista de la pestaña «Guías», la guía de su página y las opciones de sus selectores. Las compone `src/app`.
export { leerCategorias, leerGuia, leerGuias, leerLegales, leerOpcionesDeGuia } from './composicion'
export {
  RUTA_DE_LA_LISTA_DE_GUIAS,
  estadoDeGuia,
  rutaDeGuia,
  type EstadoDeGuia,
  type GuiaCompleta,
  type GuiaDeLista,
  type OpcionesDeGuia,
} from '../../entities/contenido/guias'
export {
  TOPE_DE_CATEGORIAS,
  motivoDeNoEliminar,
  usoDeCategoria,
  type CategoriaDeGuia,
  type ListaDeCategorias,
} from '../../entities/contenido/categorias'
export type { LegalesDelSitio } from '../../entities/contenido/legales'
