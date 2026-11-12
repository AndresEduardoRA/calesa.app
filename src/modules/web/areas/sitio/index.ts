// La API de servidor del área `sitio` de `web`. Sale por el `index.ts` de la raíz.
// La dirección pública de la web, o nula si no está configurada: la usa la sección «Portal» de la ficha
// del lead (la compone la página) para el texto de WhatsApp.
// Los ajustes del sitio y el conteo de lo que deja de verse: la pestaña «Ajustes» de Configuración › Sitio web (la compone `src/app`).
export {
  leerAjustesDelSitio,
  leerDireccionPublica,
  leerVehiculosQueDejanDeVerse,
} from './composicion'
export type { AjustesDelSitio } from '../../entities/sitio/ajustes'
