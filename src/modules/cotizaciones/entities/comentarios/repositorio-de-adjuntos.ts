// Registrar y quitar un adjunto de una cotización, dicho como interfaz (4.27-3). La implementación (Supabase, por RPC) vive en `infra/comentarios/adjuntos.ts` y se
// la entrega `areas/comentarios/composicion.ts`. El archivo ya está en el bucket: lo sube el navegador (`infra/comentarios/adjuntos.client.ts`).
import type { Resultado } from '@/shared/lib/errores'
import type { Adjunto, ArchivoSubido } from './adjunto'

export type RepositorioDeAdjuntos = {
  // `cotizacion_adjuntar`: pide ver y poder adjuntar; el tipo y el tamaño los toma de storage.
  adjuntar: (pedido: { cotizacionId: string } & ArchivoSubido) => Promise<Resultado<Adjunto>>
  // `cotizacion_adjunto_quitar`: quien lo subió (si todavía puede adjuntar) o quien modera.
  quitar: (pedido: { adjuntoId: string }) => Promise<Resultado<{ resultado: 'quitado' }>>
}
