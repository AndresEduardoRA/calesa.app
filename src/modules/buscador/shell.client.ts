// La entrada del SHELL del módulo `buscador` para Client Components de `src/app/(app)/_shell/`: sólo el botón de la barra y su paleta (diferida). Existe aparte de
// `client.ts` porque lo que importa el shell viaja en el JS de **todas** las pantallas (`docs/RENDIMIENTO.md`).
export { Buscador } from './features/paleta/components/buscador'
export type { AccionDeLaPaleta } from './entities/acciones-de-la-paleta'
