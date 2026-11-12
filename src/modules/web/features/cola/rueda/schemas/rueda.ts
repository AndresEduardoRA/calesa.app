import { z } from 'zod'
import { LIMITES_DE_LA_RUEDA } from '../../../../entities/cola/rueda'

const { cupo, prioridad, orden } = LIMITES_DE_LA_RUEDA

function entero(min: number, max: number) {
  const error = `Escribe un número entero entre ${min} y ${max}.`
  return z.number({ error }).int({ error }).min(min, { error }).max(max, { error })
}

// Cómo queda alguien en la rueda: el cupo vacío (nulo) hereda el de la política.
export const esquemaEnLaRueda = z.object({
  usuarioId: z.guid(),
  maxAbiertas: entero(cupo.min, cupo.max).nullable(),
  prioridad: entero(prioridad.min, prioridad.max),
  orden: entero(orden.min, orden.max),
})
