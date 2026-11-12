// API pública del módulo `chat` para Server Components: la primera página de `/chat` y la conversación abierta con su `?c=`.
// Los componentes salen por `pantallas/` (la pantalla) y `client.ts` (lo que usa un Client Component).
export { leerConversacion, leerPaginaDeConversaciones } from './composicion'
export { idDeConversacionEnLaUrl, tituloDe } from './entities/conversaciones'
export type { Conversacion, PaginaDeConversaciones } from './entities/conversaciones'
