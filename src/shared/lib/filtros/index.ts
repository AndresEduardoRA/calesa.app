// Filtros declarativos de un listado: el esquema, su lectura tolerante de la URL y sus chips.
export {
  SIN_FILTROS,
  type DefFiltro,
  type EsquemaDeFiltros,
  type OpcionDeFiltro,
  type ParametrosDeUrl,
  type ValorDeFiltro,
  type ValoresDeFiltros,
} from './esquema'
export {
  CLAVE_DE_CURSOR,
  CLAVE_DE_PANEL,
  LARGO_MAXIMO_DE_TEXTO,
  PANEL_DE_FILTROS,
  clavesDeFiltro,
  clavesDeUrl,
  escribirFiltro,
  hayFiltros,
  leerFiltros,
  limpiarFiltros,
  parametrosDeFiltros,
} from './url'
export { chipsDe, type Chip } from './chips'
export {
  camposFiltrables,
  condicionDeCampo,
  filtroDeCampo,
  type CampoFiltrable,
  type CondicionDeAtributo,
} from './campos'
export { OPCIONES_PARA_BUSCAR, opcionesQueCoinciden } from './opciones'
