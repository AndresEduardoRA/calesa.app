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
  LARGO_MAXIMO_DE_TEXTO,
  clavesDeFiltro,
  clavesDeUrl,
  escribirFiltro,
  hayFiltros,
  leerFiltros,
  limpiarFiltros,
  parametrosDeFiltros,
} from './url'
export { chipsDe, type Chip } from './chips'
