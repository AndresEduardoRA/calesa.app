// Pantalla del área `proyectos` de `repuestos` (8.09-1): `/repuestos`. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`):
// reexporta lo que esa pantalla dibuja y nada más. Una segunda pantalla del área va en `pantallas/proyectos-<pantalla>.ts`.
export { BotonNuevoProyecto } from '../features/proyectos/components/boton-nuevo-proyecto'
export type { BuscadorDeProyecto } from '../features/proyectos/components/campos-de-proyecto'
export { DrawerDeNuevoProyectoDiferido } from '../features/proyectos/components/diferidos'
export { ListadoDeProyectos } from '../features/proyectos/components/listado-de-proyectos'
export { useNuevoProyectoPorUrl } from '../features/proyectos/hooks/use-nuevo-proyecto-por-url'
export { CabeceraDeProyecto } from '../features/proyectos/components/cabecera-de-proyecto'
