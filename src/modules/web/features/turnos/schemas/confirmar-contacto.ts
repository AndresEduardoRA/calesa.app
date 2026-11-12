import { z } from 'zod'

// «Contacté» y «Vincular a lead» (8.05-1): la solicitud y, si se vincula, el lead. Los dos son uuid (`z.guid()`).
export const esquemaConfirmarContacto = z.object({
  solicitud: z.guid(),
  lead: z.guid().optional(),
})
