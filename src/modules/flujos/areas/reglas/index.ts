// La API de servidor del área `reglas` de `flujos` (5.02, la llena el 5.11). Sale por el `index.ts` de la raíz.
// Lecturas: `leerOfertaDeTransporte(flujoId)` (lo guardado) y `leerCatalogoDeTransporte()` (los puertos y navieras activos). Las escrituras salen por
// las actions de `client.ts`.
export { leerCatalogoDeTransporte, leerOfertaDeTransporte } from './composicion'
export type { ClaveDeRegla } from '../../entities/reglas/catalogo'
export type { ImpactoDeRegla } from '../../entities/reglas/impacto'
export type { CatalogoDeTransporte, OfertaDeTransporte } from '../../entities/reglas/oferta'
