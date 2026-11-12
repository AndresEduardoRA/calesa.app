// La API de servidor del área `cotizador` de `repuestos` (8.12-2): la configuración del cotizador para Configuración › Repuestos. Sale por el
// `index.ts` de la raíz.
export { leerConfiguracionDelCotizador } from '../../infra/cotizador/configuracion'
export {
  type CajaConfigurada,
  type ConfiguracionDelCotizador,
  type LecturaDeLaConfiguracion,
  type TramoConfigurado,
} from '../../entities/cotizador/filas-de-configuracion'
