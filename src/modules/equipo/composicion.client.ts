// Composición del módulo en el navegador: lo que un componente necesita de `infra/*.client.ts`.
// Separado de `composicion.ts` porque aquel importa `server-only`.
export { descartarAvatar, subirAvatar } from './infra/avatar.client'
