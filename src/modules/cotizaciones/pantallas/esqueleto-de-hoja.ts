// Lo que dibuja el `loading.tsx` de `/cotizaciones/nuevo` y de `/cotizaciones/[id]` (sólo `src/app`): el esqueleto de la hoja y nada más.
// Aparte de `cotizar.ts` y `cotizacion.ts`: si `loading` importa el barril de su pantalla, el HTML en frío baja dos chunks casi iguales en
// cuanto la página suma un Client Component (4.24-3: 438,4 → 450,7 KB en `/cotizaciones/[id]`).
export { EsqueletoDeHoja } from '../features/hoja/components/esqueleto-de-hoja'
