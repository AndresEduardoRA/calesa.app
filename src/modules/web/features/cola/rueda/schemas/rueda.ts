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

// Lo que ya tiene una fila (quitar y «Deshacer» lo devuelven tal cual): la base acepta prioridad y orden en todo `smallint`, y una fila escrita por fuera de
// esta pantalla puede salir de los rangos de la interfaz. El cupo sigue el `check` de la tabla (1–50 o nulo).
const SMALLINT = { min: -32768, max: 32767 }

export const esquemaConfiguracionGuardada = z.object({
  usuarioId: z.guid(),
  maxAbiertas: entero(cupo.min, cupo.max).nullable(),
  prioridad: entero(SMALLINT.min, SMALLINT.max),
  orden: entero(SMALLINT.min, SMALLINT.max),
})
