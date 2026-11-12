// Pantalla del área `aduana` de `logistica` (6.09): `/logistica/aduana`, la lista de declaraciones y el resumen de una. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`):
// reexporta lo que esa pantalla dibuja y nada más. Una segunda pantalla del área va en `pantallas/aduana-<pantalla>.ts`.
export { DrawerDeDeclaracion } from '../features/aduana/components/drawer-de-declaracion'
export { DrawerDeLaDeclaracion } from '../features/aduana/components/drawer-de-la-declaracion'
export { ListadoDeAduana } from '../features/aduana/components/listado-de-aduana'
export { ResumenDeLaDeclaracion } from '../features/aduana/components/resumen-de-la-declaracion'
