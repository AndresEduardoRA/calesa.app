// Composición del área `formula` en el navegador (4.20-2a): «Ver más» e «Ir a la versión» de la lista de versiones, y el valor por defecto de unas constantes que lee el
// ⚙ de una celda (4.20-3a). La importa sólo su feature y ningún barril la reexporta (`src/modules/cotizaciones/CLAUDE.md` › «Áreas»).
export { leerPaginaDeVersiones } from '../../infra/formula/versiones.client'
export type { PedidoDeVersiones } from '../../infra/formula/versiones.client'
export { leerValorPorDefecto } from '../../infra/formula/valor-por-defecto.client'
export type { PedidoDelValorPorDefecto } from '../../infra/formula/valor-por-defecto.client'
