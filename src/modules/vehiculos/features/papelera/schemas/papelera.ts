import { z } from 'zod'
import { MAXIMO_POR_LOTE } from '../../../entities/papelera'

// Un envío: de uno a doscientos vehículos, cada uno con la versión que tenía en pantalla.
export const esquemaEnviarAPapelera = z.object({
  vehiculos: z
    .array(z.object({ id: z.guid(), actualizadoEn: z.string().min(1) }))
    .min(1)
    .max(MAXIMO_POR_LOTE),
})

// Restaurar o purgar un lote, con su versión. Sin `vehiculos` es el lote entero.
export const esquemaSobreUnLote = z.object({
  loteId: z.guid(),
  actualizadoEnEsperado: z.string().min(1),
  vehiculos: z.array(z.guid()).min(1).max(MAXIMO_POR_LOTE).optional(),
})
