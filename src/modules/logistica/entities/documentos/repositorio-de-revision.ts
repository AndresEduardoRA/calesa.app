// Revisar, editar y eliminar un documento, dicho como interfaz (6.06-3). La implementación (Supabase, por RPC) vive en `infra/documentos/modificar.ts` y se la entrega
// `areas/documentos/composicion.ts`. Cada escritura lleva la versión que se tenía en pantalla (`PT409` si ya cambió).
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { CambiosDeLaEdicion } from './revision'

export type PedidoDeRevision = {
  id: string
  actualizadoEnEsperado: string
  estado: 'aprobado' | 'rechazado'
  // Obligatorio al rechazar (1 a 500); al aprobar no va.
  motivo: string | null
}

export type PedidoDeEdicion = {
  id: string
  actualizadoEnEsperado: string
  cambios: CambiosDeLaEdicion & { visible_portal?: boolean }
}

export type PedidoDeEliminar = { id: string; actualizadoEnEsperado: string }

export type DocumentoModificado = { id: string; actualizadoEn: string | null }

export type RepositorioDeRevision = {
  // `documento_revisar`: aprobar limpia el motivo; rechazar lo exige.
  revisar: (pedido: PedidoDeRevision) => Promise<ResultadoDeAccion<DocumentoModificado>>
  // `documento_editar`: sólo fechas, nota y «Visible en el portal».
  editar: (pedido: PedidoDeEdicion) => Promise<ResultadoDeAccion<DocumentoModificado>>
  // `documento_eliminar`: borrado suave, sin restaurar.
  eliminar: (pedido: PedidoDeEliminar) => Promise<ResultadoDeAccion<DocumentoModificado>>
}
