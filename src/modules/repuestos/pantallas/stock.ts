// Pantalla del área `stock` de `repuestos` (8.10-2): el stock de un ítem en la hoja de `/repuestos/[id]`. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`):
// reexporta lo que esa pantalla dibuja y nada más. Una segunda pantalla del área va en `pantallas/stock-<pantalla>.ts`.
export { BotonDeStock } from '../features/stock/components/boton-de-stock'
export { PanelDeStock } from '../features/stock/components/panel-de-stock'
export { useStockPorUrl } from '../features/stock/hooks/use-stock-por-url'
