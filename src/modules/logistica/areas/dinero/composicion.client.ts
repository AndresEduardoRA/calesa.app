// Composición del área `dinero` de `logistica` en el navegador (6.11-1): lo que leen los huecos «Gastos», «Pagos» y «Margen» y la subida del comprobante. La importa sólo su feature y
// ningún barril la reexporta (como `areas/comentarios/composicion.client.ts` de `cotizaciones`).
export {
  leerGastosDeLaUnidad,
  leerMargen,
  NO_SE_CARGARON_LOS_GASTOS,
  NO_SE_CARGO_EL_MARGEN,
  TOPE_DE_GASTOS_DE_LA_UNIDAD,
} from '../../infra/dinero/unidad.client'
export {
  leerPagosDeLaUnidad,
  NO_SE_CARGARON_LOS_PAGOS,
  TOPE_DE_PAGOS_DE_LA_UNIDAD,
} from '../../infra/dinero/pagos.client'
export { leerMisPermisos } from '../../infra/dinero/permisos.client'
export {
  leerOpcionesDeGasto,
  NO_SE_CARGARON_LAS_OPCIONES,
  type Moneda,
  type OpcionesDeGasto,
} from '../../infra/dinero/opciones.client'
export { subirComprobante, urlDelComprobante } from '../../infra/dinero/comprobante.client'
