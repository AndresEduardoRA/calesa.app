// Composición del módulo en el navegador: lo que un componente o un hook necesita de `infra/*.client.ts`.
// Separado de `composicion.ts` porque aquel importa `server-only`.
export { quitarArchivoDeImportacion, subirArchivoDeImportacion } from './infra/archivo.client'
