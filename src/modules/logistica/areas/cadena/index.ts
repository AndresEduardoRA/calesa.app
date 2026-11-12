// La API de servidor de el área `cadena` de `logistica` (6.03-1): la lectura de la cadena, «Ver más» de una columna, «dónde está» y las pestañas de origen, con sus filtros y tipos.
// La pantalla (6.03-2) los consume por `pantallas/cadena.ts`; la Fase 7 (Inicio, el buscador) por aquí. Sale por el `index.ts` de la raíz.
export { dondeEsta, leerCadena, leerNavieras, leerOrigenesDeLaCadena } from './composicion'
export type { OrigenesDeLaCadena } from '../../features/cadena/origenes-de-la-cadena'
export {
  CLAVE_DE_BOOKING,
  CLAVE_DE_BUSQUEDA_DE_LA_CADENA,
  CLAVE_DE_CONTENEDOR,
  CLAVE_DE_DEMORADAS,
  CLAVE_DE_FASE_DE_LA_CADENA,
  CLAVE_DE_NAVIERA,
  CLAVE_DE_ORIGEN_DE_LA_CADENA,
  CLAVE_DE_POR_APROBAR,
  MINIMO_DE_BUSQUEDA_DE_LA_CADENA,
  cadenaFiltrada,
  esquemaDeFiltrosDeLaCadena,
  pedidoDeLaCadena,
  type FiltrosDeLaCadena,
  type NavieraParaFiltrar,
} from '../../entities/cadena/filtros'
export {
  CLAVE_DE_SIN_FASE,
  claveDeColumna,
  columnaElegida,
  numeroDeLaColumna,
  puedeVerMas,
} from '../../entities/cadena/columna'
export { origenElegido, type OrigenDeLaCadena } from '../../entities/cadena/origenes'
export type {
  CadenaLeida,
  ColumnaDeLaCadena,
  PaginaDeLaColumna,
  ResultadoDeDondeEsta,
  TarjetaDeLaCadena,
  UnidadDondeEsta,
} from '../../entities/cadena/leer'
