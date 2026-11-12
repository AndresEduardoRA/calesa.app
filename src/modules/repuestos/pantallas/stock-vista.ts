// Pantalla del área `stock` de `repuestos` (8.10-3): la vista «Stock» de `/repuestos` (`?vista=stock`). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`):
// reexporta lo que esa vista dibuja y nada más.
export { VistaDeStock } from '../features/stock/components/vista-de-stock'
export type { CampoDeProyectoDestino } from '../features/stock/components/drawer-de-reasignar'
export type { PaginaDeStock } from '../entities/stock/listado'
