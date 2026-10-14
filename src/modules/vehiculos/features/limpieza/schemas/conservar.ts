import { z } from 'zod'

// Conservar o dejar de conservar un vehículo. Manda el estado deseado, no una alternancia: dos
// clics seguidos o un reintento tras perder la respuesta dan lo mismo.
export const esquemaConservar = z.object({
  vehiculoId: z.guid(),
  conservar: z.boolean(),
})
