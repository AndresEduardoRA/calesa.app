import { z } from 'zod'
import { MAXIMO_POR_LOTE } from '../../../entities/papelera'

// Un envío: de uno a doscientos leads, con el id del lote que genera quien envía (así un reintento
// no lo duplica). Si cada uno se ve y se puede enviar lo decide la base.
export const esquemaEnviarAPapelera = z.object({
  loteId: z.guid(),
  leads: z.array(z.guid()).min(1).max(MAXIMO_POR_LOTE),
})

// Restaurar o purgar un lote, con su versión. Sin `leads` es el lote entero.
export const esquemaSobreUnLote = z.object({
  loteId: z.guid(),
  actualizadoEnEsperado: z.string().min(1),
  leads: z.array(z.guid()).min(1).max(MAXIMO_POR_LOTE).optional(),
})
