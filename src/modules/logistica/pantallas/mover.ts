// Pantalla del área `mover` de `logistica` (6.01, llenada en 6.04): lo que dibuja `/logistica` para mover varias unidades a la vez. El proveedor guarda la selección (sólo se monta si quien mira
// puede mover) y la barra la muestra; la cadena sólo lee su contexto por el núcleo. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
export { BarraDelLoteDiferida as BarraDelLote } from '../features/mover/components/diferidos'
export { ProveedorDeLaSeleccion } from '../features/mover/components/proveedor-de-la-seleccion'
