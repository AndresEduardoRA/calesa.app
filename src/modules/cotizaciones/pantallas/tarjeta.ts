// Pantalla del área `tarjeta` de `cotizaciones` (4.15-4). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más.
// Una segunda pantalla del área va en `pantallas/tarjeta-<pantalla>.ts`.
//
// `<ProveedorDeLaTarjeta>` (4.18-2) envuelve a la hoja de cotizar (`/cotizaciones/nuevo` y `/cotizaciones/[id]`) y enciende «Vista previa»: la tarjeta de la cotización en un modal.
export { ProveedorDeLaTarjeta } from '../features/tarjeta/components/proveedor-de-la-tarjeta'
