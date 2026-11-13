// Pantalla del área `flujo` de `repuestos` (8.13-2): el panel de un ítem en `/repuestos/[id]` (`?item=<id>`). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`):
// reexporta lo que esa pantalla dibuja y nada más. Una segunda pantalla del área va en `pantallas/flujo-<pantalla>.ts`.
export { BotonDelPanelDelItem } from '../features/flujo/components/boton-del-panel-del-item'
export { DrawerDelItemDiferido as DrawerDelItem } from '../features/flujo/components/diferidos'
export { useItemPorUrl } from '../features/flujo/hooks/use-item-por-url'
