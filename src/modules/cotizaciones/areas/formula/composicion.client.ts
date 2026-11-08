// Composición del área `formula` en el navegador (4.20-2a): «Ver más» e «Ir a la versión» de la lista de versiones, el valor por defecto de unas constantes que lee el
// ⚙ de una celda (4.20-3a), el tipo de cambio que nombra el nodo de una celda (4.20-3c) y la definición que abre el editor (4.21-3a-1) y lo de prueba de su vista previa (4.21-3a-2), y los tonos de «Grupos» (4.21-3c). La importa sólo su feature
// y ningún barril la reexporta (`src/modules/cotizaciones/CLAUDE.md` › «Áreas»).
export { leerPaginaDeVersiones } from '../../infra/formula/versiones.client'
export type { PedidoDeVersiones } from '../../infra/formula/versiones.client'
export { leerValorPorDefecto } from '../../infra/formula/valor-por-defecto.client'
export type { PedidoDelValorPorDefecto } from '../../infra/formula/valor-por-defecto.client'
export { leerTipoCambioDelNodo } from '../../infra/formula/tipo-cambio-del-nodo.client'
export type { PedidoDelTipoCambioDelNodo } from '../../infra/formula/tipo-cambio-del-nodo.client'
export { leerDefinicionParaEditar } from '../../infra/formula/definicion.client'
export type { PedidoDeLaDefinicion } from '../../infra/formula/definicion.client'
export { leerElTerrenoDePrueba } from '../../infra/formula/terreno-de-prueba.client'
export type { PedidoDelTerreno } from '../../infra/formula/terreno-de-prueba.client'
export { leerTonosDelCatalogo } from '../../infra/formula/tonos.client'
export type { TonoDelCatalogo } from '../../infra/formula/tonos.client'
