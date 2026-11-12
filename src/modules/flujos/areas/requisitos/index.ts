// La API de servidor del área `requisitos` de `flujos` (5.02, la llena el 5.08). Sale por el `index.ts` de la raíz.
// El bloque lee `flujo.requisitos` del núcleo y sus opciones por una action (`client.ts`); las unidades fuera de regla las lee `src/app` (y resuelve sus
// títulos con `vehiculos`: `flujos` no lo importa).
export { leerFueraDeRegla } from './composicion'
export { TOPE_DE_FUERA_DE_REGLA, armarFueraDeRegla } from '../../entities/requisitos/fuera-de-regla'
export type {
  GrupoFueraDeRegla,
  UnidadFueraDeRegla,
} from '../../entities/requisitos/fuera-de-regla'
export type { OpcionesDeRequisitos, TipoParaRequisito } from '../../entities/requisitos/opciones'
