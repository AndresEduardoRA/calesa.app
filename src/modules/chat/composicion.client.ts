// Composición del módulo en el navegador: lo que un componente necesita de `infra/*.client.ts`.
// Separado de `composicion.ts` porque aquel importa `server-only`.
export { leerConversacion } from './infra/conversacion.client'
export { leerPaginaDeConversaciones } from './infra/conversaciones.client'
export { leerPaginaDeMensajes } from './infra/mensajes.client'
export { suscribirseAlHilo, suscribirseALaLista } from './infra/realtime.client'
export { leerPersonas } from './infra/personas.client'
export { leerReferencias } from './infra/referencias.client'
export { leerFichas } from './infra/fichas.client'
