// Lo que el área `comprobantes` necesita de afuera, dicho como interfaz (4.26-2). La implementación (Supabase) vive en `infra/comprobantes/` y se la entrega
// `areas/comprobantes/composicion.ts`. Todo se escribe por RPC (4.26-1): la base mira los permisos, la versión y el vigente, y devuelve el motivo escrito.
import type { Resultado } from '@/shared/lib/errores'

export type ComprobanteEmitido = { id: string; serie: string; numero: number; emitidoEn: string }

export type ComprobanteAnulado = { id: string; anuladoEn: string }

export type RepositorioDeComprobantes = {
  // `cotizacionEsperada`: el `actualizado_en` de la cotización que se ve (la versión).
  emitir: (
    cotizacionId: string,
    cotizacionEsperada: string,
  ) => Promise<Resultado<ComprobanteEmitido>>
  anular: (comprobanteId: string, motivo: string) => Promise<Resultado<ComprobanteAnulado>>
}
