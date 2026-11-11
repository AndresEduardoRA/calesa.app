import { z } from 'zod'
import { AMBITOS_DE_FLUJO } from '../../../entities/flujo'
import { LARGO_MAXIMO_DE_LAS_NOTAS } from '../../../entities/requisitos/formulario-de-dato'

// Lo que cruza el límite de los requisitos: la forma y la lista cerrada de claves. Lo que vale cada dato (la clave del ámbito, el porcentaje, el largo de las
// notas) lo dice la base con el campo en el `hint`. El `ambito` va en todas: la action necesita saber qué permiso exigir antes de escribir.
const version = z.string().min(1)
const ambito = z.enum(AMBITOS_DE_FLUJO)

export const esquemaCrearRequisitoDeDato = z.object({
  // El del intento: el mismo en cada reintento.
  id: z.guid(),
  ambito,
  faseId: z.guid(),
  actualizadoEnEsperado: version,
  datos: z.strictObject({
    clave_dato: z.string().min(1).max(100),
    notas: z
      .string()
      .max(LARGO_MAXIMO_DE_LAS_NOTAS * 4)
      .optional(),
    config: z.strictObject({ pct: z.number() }).optional(),
  }),
})

export const esquemaMoverRequisito = z.object({
  id: z.guid(),
  ambito,
  actualizadoEnEsperado: version,
  // «Después de X»; nulo = primero.
  despuesDe: z.guid().nullable(),
})

export const esquemaEliminarRequisito = z.object({
  id: z.guid(),
  ambito,
  actualizadoEnEsperado: version,
})

export const esquemaLeerOpciones = z.object({ flujoId: z.guid() })
