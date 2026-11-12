// La API de servidor del área `flujo` de `repuestos` (8.13): `esperasQueDestraban(vehiculoId)` para el panel del vehículo de `logistica`, `leerItemDelPanel(id)` e `itemAbiertoDe(parametros)` para el panel del ítem (`?item=`), y la Cadena (`?vista=cadena`): `leerCadenaDeRepuestos(filtros)`, sus claves y `rutaDeLaCadena` (los «Ver todas» de Inicio). Sale por el `index.ts` de la raíz.
export { esperasQueDestraban } from '../../infra/flujo/esperas'
export { leerCadenaDeRepuestos } from '../../infra/flujo/cadena'
export { leerItemDelPanel } from '../../infra/flujo/item-del-panel'
export { CLAVE_DE_ITEM_DEL_PANEL, itemAbiertoDe } from '../../entities/flujo/paneles'
export type { ItemDelPanel } from '../../entities/flujo/item-del-panel'
export {
  TOPE_DE_ESPERAS,
  type EsperaDeItem,
  type EsperaDelRequisito,
  type EsperasDelVehiculo,
} from '../../entities/flujo/esperas'
export {
  CLAVE_DE_BUSQUEDA_DE_LA_CADENA,
  CLAVE_DE_FASE_DE_LA_CADENA,
  CLAVE_DE_PROYECTO_DE_LA_CADENA,
  CLAVE_DE_VISTA_DE_LA_CADENA,
  VISTA_DE_CADENA,
  esVistaDeLaCadena,
  esquemaDeLaCadena,
  pedidoDeLaCadena,
  rutaDeLaCadena,
  type CadenaDeRepuestos,
  type ColumnaDeRepuestos,
  type FiltrosDeLaCadena,
  type TarjetaDeRepuesto,
} from '../../entities/flujo/cadena'
