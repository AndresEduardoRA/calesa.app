// La API de servidor de el área `compras` de `repuestos` (8.11): la pestaña «Compras» de `/repuestos/[id]` la lee `src/app`. Sale por el `index.ts` de la raíz.
export { leerComprasDelProyecto } from '../../infra/compras/listar'
export { leerMargenDelProyecto } from '../../infra/compras/margen'
export { TOPE_DE_COMPRAS, type FilaDeCompra } from '../../entities/compras/compra'
export type { MargenDelProyecto } from '../../entities/compras/margen'
