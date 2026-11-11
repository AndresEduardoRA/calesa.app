// La API de cliente del área `reglas` de `flujos` (5.02, la llena el 5.11): el catálogo, los textos y los tipos. Sale por el `client.ts` de la raíz.
// Las dos actions de escritura (cada una exige su permiso en el servidor antes de escribir) salen de aquí.
export {
  CLAVES_DE_REGLAS,
  REGLAS_DEL_CATALOGO,
  reglaDelCatalogo,
  reglaEncendida,
  reglasDelAmbito,
} from '../../entities/reglas/catalogo'
export type { ClaveDeRegla, ReglaDelCatalogo } from '../../entities/reglas/catalogo'
export { hrefDeFase, textoDelImpacto } from '../../entities/reglas/impacto'
export type { ImpactoDeRegla, RespuestaDeCambio } from '../../entities/reglas/impacto'
export {
  SIN_NAVIERAS,
  SIN_PUERTOS,
  TEXTO_DE_OFERTA_VACIA,
  cambioDeOferta,
  elegibles,
  firmaDeOferta,
} from '../../entities/reglas/oferta'
export type {
  BorradorDeOferta,
  CatalogoDeTransporte,
  ElementoDeOferta,
  OfertaDeTransporte,
} from '../../entities/reglas/oferta'
export { motivoSinPermisoDeReglas } from '../../entities/reglas/permiso'
export { cambiarRegla } from '../../features/reglas/actions/cambiar-regla'
export { guardarOferta } from '../../features/reglas/actions/guardar-oferta'
