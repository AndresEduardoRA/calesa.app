// Pantalla: `/notificaciones` (todos los avisos de quien mira, con «Ver más»). Sólo `src/app` importa este archivo
// (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más.
export { ListaDeNotificaciones } from '../features/lista/components/lista-de-notificaciones'
export type { AccionesPorTipo } from '../features/lista/components/fila-de-notificacion'
