// Composición en el servidor del área `contenido` de `web`: qué implementación recibe cada interfaz de `entities/contenido/repositorios`. Sale por la
// `composicion.ts` de la raíz; nunca `infra/` directo desde las actions.
import 'server-only'
import type { RepositorioDeFaqs } from '../../entities/contenido/repositorios'
import { faqsSupabase } from '../../infra/contenido/faqs'

// Crear, guardar, eliminar y mover una pregunta frecuente. Las actions de `features/contenido/faqs/` lo usan.
export const repositorioDeFaqs: RepositorioDeFaqs = faqsSupabase
