// La API de cliente del área `requisitos` de `flujos` (5.02, la llena el 5.08): las reglas puras del bloque y sus actions (cada una exige su permiso en
// el servidor antes de escribir). Sale por el `client.ts` de la raíz.
export {
  CLAVE_CON_PORCENTAJE,
  CLAVES_POR_AMBITO,
  ETIQUETAS_DE_CLAVE,
  etiquetaDeClave,
  reglaDeLaClave,
} from '../../entities/requisitos/claves'
export {
  descripcionDeRequisito,
  notasDeRequisito,
  textoDeBloqueo,
} from '../../entities/requisitos/descripcion'
export type { ImpactoDeRequisito } from '../../entities/requisitos/impacto'
export { resumenDeImpacto } from '../../entities/requisitos/impacto'
export {
  PANEL_FUERA_DE_REGLA,
  textoDeFaltan,
  textoDelAviso,
} from '../../entities/requisitos/fuera-de-regla'
export type { GrupoFueraDeRegla, UnidadDelPanel } from '../../entities/requisitos/fuera-de-regla'
export type {
  FaseDelOtroFlujo,
  OpcionesDeRequisitos,
  TipoParaRequisito,
} from '../../entities/requisitos/opciones'
export { crearRequisito } from '../../features/requisitos/actions/crear-requisito'
export { eliminarRequisito } from '../../features/requisitos/actions/eliminar-requisito'
export { guardarRequisito } from '../../features/requisitos/actions/guardar-requisito'
export { leerImpactoDeRequisito } from '../../features/requisitos/actions/leer-impacto-de-requisito'
export { leerOpcionesDeRequisitos } from '../../features/requisitos/actions/leer-opciones'
export { moverRequisito } from '../../features/requisitos/actions/mover-requisito'
