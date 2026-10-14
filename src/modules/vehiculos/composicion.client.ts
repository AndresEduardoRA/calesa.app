// Composición del módulo en el navegador: lo que un componente necesita de `infra/*.client.ts`.
// Separado de `composicion.ts` porque aquel importa `server-only`.
export { prepararFoto, subirFoto, type FotoPreparada } from './infra/fotos.client'
export { consultarFicha, descargarFoto } from './infra/apibara.client'
