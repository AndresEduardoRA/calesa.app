// API pública del módulo `web`. Lo único que `app/` u otro módulo puede importar.
// Se llena en su fase de docs/PLAN.md; la ficha CLAUDE.md de esta carpeta dice qué entra y qué sale.

// La dirección pública de la web, o nula si no está configurada: la usa la sección «Portal» de la ficha
// del lead (la compone la página) para el texto de WhatsApp.
export { leerDireccionPublica } from './composicion'
