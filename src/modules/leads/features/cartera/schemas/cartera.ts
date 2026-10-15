import { z } from 'zod'

// Lo que cruza el límite de la cartera: sólo la forma. Si el lead se ve, si el destino es válido y si
// quien actúa puede lo decide la base.
export const esquemaCompartirLead = z.object({
  leadId: z.guid(),
  usuarioId: z.guid(),
})

export const esquemaTransferirLead = z.object({
  leadId: z.guid(),
  destinoId: z.guid(),
  // Quién creía quien transfiere que era el dueño; nulo si el lead no tenía dueño.
  duenoEsperadoId: z.guid().nullable(),
})

export const esquemaQuitarAcceso = z.object({
  leadId: z.guid(),
  usuarioId: z.guid(),
})

export const esquemaSalirDelLead = z.object({ leadId: z.guid() })
