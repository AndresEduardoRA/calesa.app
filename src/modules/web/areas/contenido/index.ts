// La API de servidor del área `contenido` de `web`: la pestaña «Preguntas frecuentes» de Configuración › Sitio web (8.02-1; la compone `src/app`) y,
// con el 8.03, guías y legales. Sale por el `index.ts` de la raíz.
export { leerFaqs } from '../../infra/contenido/faqs'
export { TOPE_DE_FAQS, type Faq } from '../../entities/contenido/faqs'
