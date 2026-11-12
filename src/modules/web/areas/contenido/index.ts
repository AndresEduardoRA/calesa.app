// La API de servidor del área `contenido` de `web`: las pestañas «Preguntas frecuentes» (8.02-1) y «Testimonios» (8.02-2) de Configuración › Sitio web (las
// compone `src/app`) y, con el 8.03, guías y legales. Sale por el `index.ts` de la raíz.
export { leerFaqs } from '../../infra/contenido/faqs'
export { leerTestimonios } from '../../infra/contenido/testimonios'
export { TOPE_DE_FAQS, type Faq } from '../../entities/contenido/faqs'
export { TOPE_DE_TESTIMONIOS, type Testimonio } from '../../entities/contenido/testimonios'
