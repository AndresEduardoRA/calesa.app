// API pública del módulo `notificaciones` para Server Components: la primera página de `/notificaciones` y el filtro
// de su URL. Los componentes salen por `pantallas/` (la pantalla) y `shell.client.ts` (la campana del marco).
export { leerPaginaDeNotificaciones } from './composicion'
export { filtroDeLista } from './entities/notificacion'
export type { FiltroDeLista } from './entities/notificacion'
