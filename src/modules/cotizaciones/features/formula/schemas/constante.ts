import { z } from 'zod'
import { esquemaId } from '../../../entities/nodos'

// Lo que manda el ⚙ de una constante (4.20-3a): el origen, el nodo, el valor ya en la unidad de `params` (finito: `z.number()` no deja pasar `Infinity` ni `NaN`) y la
// publicada que se leyó, que no puede faltar.
export const esquemaDeCambiarConstante = z.object({
  origenId: z.guid(),
  nodo: esquemaId,
  valor: z.number(),
  publicadaEsperada: z.guid(),
})

export type EntradaDeCambiarConstante = z.infer<typeof esquemaDeCambiarConstante>
