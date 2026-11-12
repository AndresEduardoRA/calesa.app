// Pantalla del área `transporte` de `logistica` (6.08-3): `/logistica/embarques`, la lista de embarques y contenedores y el resumen de un grupo. Sólo `src/app` importa este archivo
// (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más. Una segunda pantalla del área va en `pantallas/transporte-<pantalla>.ts`.
export { DrawerDelGrupo } from '../features/transporte/components/drawer-del-grupo'
export { ListadoDeEmbarques } from '../features/transporte/components/listado-de-embarques'
export { ResumenDelGrupo } from '../features/transporte/components/resumen-del-grupo'
export { DrawerDeEdicionDelGrupoDiferido as DrawerDeEdicionDelGrupo } from '../features/transporte/components/diferidos-de-edicion'
