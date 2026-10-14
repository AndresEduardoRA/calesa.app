// El motor de campos configurables: sin módulos, sin I/O. Lo usan `origenes` (el layout de un
// vehículo) y `leads`.
export {
  ETIQUETA_DE_TIPO_DE_CAMPO,
  TIPOS_DE_CAMPO,
  tieneOpciones,
  type CampoBase,
  type OpcionDeCampo,
  type TipoDeCampo,
  type ValorDefecto,
} from './tipos'
export { agruparCampos, nombresDeGrupo, type GrupoDeCampos } from './agrupar'
export { destinoDeMovimiento, type Sentido } from './orden'
export { claveDeCampo, claveDeTexto, type EstiloDeClave } from './clave'
export {
  LARGO_MAXIMO_DE_VALOR_DEFECTO,
  admiteValorDefecto,
  valorDefectoPara,
} from './valor-defecto'
export {
  mismasOpciones,
  mismoValorDefecto,
  necesitaVistaPrevia,
  opcionesQuitadas,
  type CambiosComunes,
} from './cambios'
export {
  impactoDesde,
  resumenDeEliminacion,
  resumenDeImpacto,
  type ImpactoDeCampo,
  type ResumenDeImpacto,
  type Sustantivo,
} from './impacto'
export {
  conReglasDeCampo,
  esquemaClave,
  esquemaEtiqueta,
  esquemaGrupo,
  esquemaOpciones,
  esquemaTextoOpcional,
  esquemaValorDefecto,
  esquemaVersion,
} from './esquemas'
export {
  MOTIVO_CAMPO_DE_SISTEMA,
  MOTIVO_PRIMERO_DE_SU_GRUPO,
  MOTIVO_ULTIMO_DE_SU_GRUPO,
} from './motivos'
