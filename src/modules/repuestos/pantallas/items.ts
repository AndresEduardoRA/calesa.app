// Pantalla del área `items` de `repuestos` (8.09-2): la hoja de `/repuestos/[id]`. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`):
// reexporta lo que esa pantalla dibuja y nada más. Una segunda pantalla del área va en `pantallas/items-<pantalla>.ts`.
export { HojaDeItems } from '../features/items/components/hoja-de-items'
export type { ApiDelHueco, HuecoDeLaHoja } from '../features/items/components/hueco-de-la-hoja'
