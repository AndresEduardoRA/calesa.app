import { z } from 'zod'
import { esquemaDelMotivo } from '../../../entities/comprobantes/motivo'

// Emitir el comprobante de una cotización (4.26-2): su id y la versión que se ve (el `actualizado_en` de la base, tal cual).
export const esquemaEmitirComprobante = z.object({
  cotizacionId: z.guid(),
  cotizacionEsperada: z.string().min(10).max(64),
})

// Anular un comprobante: su id y el motivo (de 1 a 500).
export const esquemaAnularComprobante = z.object({
  comprobanteId: z.guid(),
  motivo: esquemaDelMotivo,
})
