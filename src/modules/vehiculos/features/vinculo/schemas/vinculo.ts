import { z } from 'zod'
import { TOPE_DE_NOTA } from '../../../entities/vehiculos-del-lead'

// Lo que cruzan las actions del vínculo y del interés. La base vuelve a decidir todo.

// `leadId` nulo desvincula.
export const esquemaVincular = z.object({
  vehiculoId: z.guid(),
  actualizadoEnEsperado: z.string().min(1),
  leadId: z.guid().nullable(),
})

export const esquemaMarcarInteres = z.object({
  vehiculoId: z.guid(),
  leadId: z.guid(),
  nota: z.string().trim().max(TOPE_DE_NOTA).nullable(),
})

export const esquemaQuitarInteres = z.object({
  vehiculoId: z.guid(),
  leadId: z.guid(),
})
