// La API de servidor del área `cotizador` de `repuestos`: la configuración del cotizador para Configuración › Repuestos (8.12-2) y las cotizaciones
// de un proyecto para su pestaña y su hoja (8.12-3). Sale por el `index.ts` de la raíz.
export { leerConfiguracionDelCotizador } from '../../infra/cotizador/configuracion'
export { leerCotizacion, leerCotizacionesDelProyecto } from '../../infra/cotizador/cotizaciones'
export {
  type CajaConfigurada,
  type ConfiguracionDelCotizador,
  type LecturaDeLaConfiguracion,
  type TramoConfigurado,
} from '../../entities/cotizador/filas-de-configuracion'
export {
  TOPE_DE_COTIZACIONES,
  rutaDeLaCotizacion,
  type FilaDeCotizacion,
} from '../../entities/cotizador/cotizacion'
export { type CotizacionConLineas } from '../../entities/cotizador/hoja-de-lectura'
export { type ItemParaCotizar } from '../../entities/cotizador/hoja-editable'
