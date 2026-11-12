// La API de servidor de el área `stock` de `repuestos` (8.10): la vista «Stock» de `/repuestos` la lee `src/app`. Sale por el `index.ts` de la raíz.
export { leerStock } from '../../infra/stock/listar'
export { leerCursorDeStock, type PaginaDeStock } from '../../entities/stock/listado'
export { CLAVE_DE_VISTA_DE_REPUESTOS, esVistaDeStock } from '../../entities/stock/vista'
