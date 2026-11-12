// Composición del área `contenido` de `web` en el servidor: qué implementación recibe cada interfaz de `entities/contenido/repositorios`.
// Sale por la `composicion.ts` de la raíz; lo exporta `areas/contenido/index.ts`, nunca `infra/` directo desde las actions.
import 'server-only'
import type {
  EscritorDeCategorias,
  EscritorDeGuias,
  EscritorDeLegales,
  LectorDeCategorias,
  LectorDeGuia,
  LectorDeGuias,
  LectorDeLegales,
  LectorDeOpcionesDeGuia,
  RepositorioDeConsentimiento,
  RepositorioDeFaqs,
  RepositorioDeTestimonios,
} from '../../entities/contenido/repositorios'
import { escritorDeCategorias } from '../../infra/contenido/categorias-escritura'
import { getCategorias } from '../../infra/contenido/categorias-lectura'
import { consentimientoSupabase } from '../../infra/contenido/consentimiento'
import { faqsSupabase } from '../../infra/contenido/faqs'
import { getGuia, getGuias } from '../../infra/contenido/guias-lectura'
import { escritorDeGuias } from '../../infra/contenido/guias-escritura'
import { escritorDeLegales } from '../../infra/contenido/legales-escritura'
import { getLegales } from '../../infra/contenido/legales'
import { getOpcionesDeGuia } from '../../infra/contenido/opciones-de-guia'
import { testimoniosSupabase } from '../../infra/contenido/testimonios'

export const leerGuias: LectorDeGuias = getGuias
export const leerGuia: LectorDeGuia = getGuia
export const leerOpcionesDeGuia: LectorDeOpcionesDeGuia = getOpcionesDeGuia
// Lo usan las actions de las guías desde aquí; no sale por `index.ts`.
export const escribirGuias: EscritorDeGuias = escritorDeGuias
export const leerCategorias: LectorDeCategorias = getCategorias
export const leerLegales: LectorDeLegales = getLegales
// Lo usan las actions de categorías y de legales desde aquí; no sale por `index.ts`.
export const escribirCategorias: EscritorDeCategorias = escritorDeCategorias
export const escribirLegales: EscritorDeLegales = escritorDeLegales

// Crear, guardar, eliminar y mover una pregunta frecuente. Las actions de `features/contenido/faqs/` lo usan.
export const repositorioDeFaqs: RepositorioDeFaqs = faqsSupabase

// Crear, guardar y eliminar un testimonio, y registrar o retirar su consentimiento. Las actions de `features/contenido/testimonios/` los usan.
export const repositorioDeTestimonios: RepositorioDeTestimonios = testimoniosSupabase
export const repositorioDeConsentimiento: RepositorioDeConsentimiento = consentimientoSupabase
