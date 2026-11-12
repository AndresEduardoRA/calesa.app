// La API de servidor del área `flujo` de `repuestos` (8.13): `esperasQueDestraban(vehiculoId)` para el panel del vehículo de `logistica`, y `leerItemDelPanel(id)` e `itemAbiertoDe(parametros)` para el panel del ítem (`?item=`). Sale por el `index.ts` de la raíz.
export { esperasQueDestraban } from '../../infra/flujo/esperas'
export { leerItemDelPanel } from '../../infra/flujo/item-del-panel'
export { CLAVE_DE_ITEM_DEL_PANEL, itemAbiertoDe } from '../../entities/flujo/paneles'
export type { ItemDelPanel } from '../../entities/flujo/item-del-panel'
export {
  TOPE_DE_ESPERAS,
  type EsperaDeItem,
  type EsperaDelRequisito,
  type EsperasDelVehiculo,
} from '../../entities/flujo/esperas'
