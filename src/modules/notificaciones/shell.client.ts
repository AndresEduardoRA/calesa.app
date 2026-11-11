// La entrada del SHELL del módulo `notificaciones` para Client Components de `src/app/(app)/_shell/`: sólo lo que el
// marco dibuja en toda pantalla (la campana de la barra). Existe aparte de `client.ts` porque lo que importa el
// shell viaja en el JS de **todas** las pantallas (`docs/RENDIMIENTO.md`). El contenido del popover va diferido.
export { Campana } from './features/campana/components/campana'
export type { AccionesPorTipo } from './features/campana/components/fila-de-notificacion'
