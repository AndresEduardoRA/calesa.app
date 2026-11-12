// Composición del área `transporte` de `logistica` en el navegador (6.08-1): lo que leen los catálogos de Configuración. La importa sólo su feature y ningún barril la reexporta
// (como `areas/dinero/composicion.client.ts`).
export {
  leerNavierasDeConfiguracion,
  leerPuertosDeConfiguracion,
  NO_SE_CARGARON_LAS_NAVIERAS,
  NO_SE_CARGARON_LOS_PUERTOS,
  type CatalogoLeido,
} from '../../infra/transporte/catalogos.client'
