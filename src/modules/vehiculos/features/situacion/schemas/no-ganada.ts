import { z } from 'zod'

// «No la ganamos» (`noGanada: true`) o su «Deshacer» (`false`). El origen sirve para decidir con `puede()` por comodidad: la base vuelve a decidir con
// el origen real.
export const esquemaNoGanada = z.object({
  vehiculoId: z.guid(),
  origenId: z.guid(),
  noGanada: z.boolean(),
})

export type EntradaNoGanada = z.infer<typeof esquemaNoGanada>
