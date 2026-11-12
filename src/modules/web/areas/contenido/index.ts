// La API de servidor del área `contenido` de `web`. Sale por el `index.ts` de la raíz; las pestañas las compone `src/app`.
// Las pestañas «Preguntas frecuentes» (8.02-1) y «Testimonios» (8.02-2) de Configuración › Sitio web.
export { leerFaqs } from '../../infra/contenido/faqs'
export { leerTestimonios } from '../../infra/contenido/testimonios'
export { TOPE_DE_FAQS, type Faq } from '../../entities/contenido/faqs'
export { TOPE_DE_TESTIMONIOS, type Testimonio } from '../../entities/contenido/testimonios'
// Las categorías y los legales (8.03-2): la lista del panel y los dos documentos de la pestaña «Legales».
// Las guías (8.03-1): la lista de la pestaña «Guías», la guía de su página y las opciones de sus selectores.
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
