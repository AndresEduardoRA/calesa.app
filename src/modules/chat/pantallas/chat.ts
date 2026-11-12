// Pantalla: `/chat` (la lista de conversaciones y el hilo abierto por `?c=`). Sólo `src/app` importa este archivo
// (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más.
export { ListaDeConversaciones } from '../features/conversaciones/components/lista-de-conversaciones'
export { ZonaDelHilo } from '../features/mensajes/components/zona-del-hilo'
