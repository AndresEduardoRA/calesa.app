// La API de servidor del área `documentos` de `flujos` (5.02, la llena el 5.09). Sale por el `index.ts` de la raíz.
// Lecturas: `leerTiposDeDocumento(flujoId | null)` (un grupo: nulo = los de toda la empresa) y `leerUsoDeTiposDeDocumento(flujoId | null)` (sólo para
// quien puede cambiar el grupo). Las escrituras salen por las actions de `client.ts`.
export { leerTiposDeDocumento, leerUsoDeTiposDeDocumento } from './composicion'
export type {
  GrupoDeTipos,
  TipoDeDocumento,
  UsoDeTipo,
} from '../../entities/documentos/tipo-de-documento'
