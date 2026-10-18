// El patrón de lista (9i, `.claude/rules/ui.md`): una vista elegida en el servidor, la tabla ancha con el nombre y el «⋯» pegados, un clic
// en cualquier parte de la fila o la tarjeta abre su resumen, y el «⋯» se llama igual en todas partes. Toda lista de un módulo lo usa;
// `scripts/guardas/listas-con-patron.ts` falla si una no lo hace.
export { AbrirResumen } from './abrir-resumen'
export type { AccionDeMenu } from './acciones'
export { FilaDeLista } from './fila-de-lista'
export { MasAcciones } from './mas-acciones'
export { CabeceraPegada, CeldaPegada, TablaDeLista } from './tabla-de-lista'
export { TarjetaDeLista } from './tarjeta-de-lista'
export { UnaSolaVista } from './una-sola-vista'
