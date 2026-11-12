import { z } from 'zod'
import { esquemaDelCuerpoDeLaNota } from '../../../entities/mover/notas'

// Lo que cruza el límite de escribir una nota: la forma y el largo. El `origenId` sólo sirve para decidir con `puede()` por comodidad (D7 de 6.04); la policy vuelve a decidir con el origen real.
export const esquemaCrearNota = z.object({
  vehiculo: z.guid(),
  origenId: z.guid(),
  cuerpo: esquemaDelCuerpoDeLaNota,
})

export const esquemaEditarNota = z.object({
  id: z.guid(),
  origenId: z.guid(),
  cuerpo: esquemaDelCuerpoDeLaNota,
})
