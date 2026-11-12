// La API de cliente de el área `cadena` de `logistica` (6.03-1): lo puro y los tipos que un componente de la cadena necesita (la clave de una columna, qué se puede pedir, los textos de
// los días). Nada de servidor. Sale por el `client.ts` de la raíz.
export {
  CLAVE_DE_SIN_FASE,
  agregarTarjetas,
  claveDeColumna,
  columnaElegida,
  cursorDeLaColumna,
  enElTope,
  numeroDeLaColumna,
  puedeVerMas,
  type CursorDeLaColumna,
} from '../../entities/cadena/columna'
export { textoDeLosDiasEnLaFase } from '../../entities/cadena/dias'
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
  type FiltrosDeLaCadena,
} from '../../entities/cadena/filtros'
export { origenElegido, type OrigenDeLaCadena } from '../../entities/cadena/origenes'
export type {
  CadenaLeida,
  ColumnaDeLaCadena,
  PaginaDeLaColumna,
  ResultadoDeDondeEsta,
  TarjetaDeLaCadena,
  UnidadDondeEsta,
} from '../../entities/cadena/leer'
