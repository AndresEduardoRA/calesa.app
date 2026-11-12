// Composición en el servidor del área `contenido` de `web`: qué implementación recibe cada interfaz de `entities/contenido/repositorios`. Sale por la
// `composicion.ts` de la raíz; nunca `infra/` directo desde las actions.
import 'server-only'
import type {
  RepositorioDeConsentimiento,
  RepositorioDeFaqs,
  RepositorioDeTestimonios,
} from '../../entities/contenido/repositorios'
import { consentimientoSupabase } from '../../infra/contenido/consentimiento'
import { faqsSupabase } from '../../infra/contenido/faqs'
import { testimoniosSupabase } from '../../infra/contenido/testimonios'

// Crear, guardar, eliminar y mover una pregunta frecuente. Las actions de `features/contenido/faqs/` lo usan.
export const repositorioDeFaqs: RepositorioDeFaqs = faqsSupabase

// Crear, guardar y eliminar un testimonio, y registrar o retirar su consentimiento. Las actions de `features/contenido/testimonios/` los usan.
export const repositorioDeTestimonios: RepositorioDeTestimonios = testimoniosSupabase
export const repositorioDeConsentimiento: RepositorioDeConsentimiento = consentimientoSupabase
