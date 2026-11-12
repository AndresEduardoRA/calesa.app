// Registrar documentos de una unidad, dicho como interfaz (6.06-2). La implementación (Supabase, por RPC) vive en `infra/documentos/registrar.ts` y se la entrega
// `areas/documentos/composicion.ts`. El archivo ya está en el bucket `documentos`: lo sube el navegador (`infra/documentos/subir.client.ts`).
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'

export type PedidoDeRegistro = {
  // El id del intento: reintentar con el mismo id y la misma ruta devuelve las mismas filas (V32).
  id: string
  // Una unidad es un vehículo (de 1 a 100) o un repuesto, nunca las dos.
  vehiculos: string[]
  repuestoId: string | null
  tipoId: string
  ruta: string
  nombre: string
  mime: string
  bytes: number
  emitidoEl: string | null
  venceEl: string | null
  nota: string | null
}

// Lo que `documento_registrar` devolvió por cada unidad: la fila nueva y su versión.
export type DocumentoRegistrado = { id: string; actualizadoEn: string }

export type RepositorioDeDocumentos = {
  // `documento_registrar`: una fila por unidad, en «Subido», con la misma ruta.
  registrar: (pedido: PedidoDeRegistro) => Promise<ResultadoDeAccion<DocumentoRegistrado[]>>
}
