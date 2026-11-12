import { z } from 'zod'
import { AMBITOS_DE_FLUJO } from '../../../entities/flujo'
import { LARGO_MAXIMO_DE_LAS_NOTAS } from '../../../entities/requisitos/notas'

// Lo que cruza el límite de los requisitos: la forma y la lista cerrada de claves. Lo que vale cada dato (la clave del ámbito, el porcentaje, el largo de las
// notas) lo dice la base con el campo en el `hint`. El `ambito` va en todas: la action necesita saber qué permiso exigir antes de escribir.
const version = z.string().min(1)
const ambito = z.enum(AMBITOS_DE_FLUJO)

const notas = z
  .string()
  .max(LARGO_MAXIMO_DE_LAS_NOTAS * 4)
  .optional()

// Lo común a crear: el id del intento (el mismo en cada reintento), el ámbito y la versión del flujo.
const baseDeCrear = {
  id: z.guid(),
  ambito,
  faseId: z.guid(),
  actualizadoEnEsperado: version,
}

const cantidad = z.number().int().optional()

// Un requisito nuevo, por tipo: cada uno con su lista cerrada de claves.
export const esquemaCrearRequisito = z.discriminatedUnion('tipo', [
  z.object({
    ...baseDeCrear,
    tipo: z.literal('dato'),
    datos: z.strictObject({
      clave_dato: z.string().min(1).max(100),
      notas,
      config: z.strictObject({ pct: z.number() }).optional(),
    }),
  }),
  z.object({
    ...baseDeCrear,
    tipo: z.literal('documento'),
    datos: z.strictObject({
      tipo_documento_id: z.guid(),
      min_archivos: cantidad,
      max_archivos: cantidad,
      formatos: z.array(z.string().min(1).max(100)).min(1).max(20).optional(),
      notas,
    }),
  }),
  z.object({
    ...baseDeCrear,
    tipo: z.literal('espera'),
    datos: z.strictObject({ espera_fase_id: z.guid(), notas }),
  }),
])

// Editar: sólo lo que cambió; `null` vacía el campo. `bloqueante` lo manda el interruptor de la fila, solo.
export const esquemaGuardarRequisito = z.object({
  id: z.guid(),
  ambito,
  actualizadoEnEsperado: version,
  cambios: z.strictObject({
    bloqueante: z.boolean().optional(),
    config: z.strictObject({ pct: z.number() }).nullable().optional(),
    min_archivos: z.number().int().nullable().optional(),
    max_archivos: z.number().int().nullable().optional(),
    formatos: z.array(z.string().min(1).max(100)).min(1).max(20).nullable().optional(),
    notas: z
      .string()
      .max(LARGO_MAXIMO_DE_LAS_NOTAS * 4)
      .nullable()
      .optional(),
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

export const esquemaLeerOpciones = z.object({ flujoId: z.guid(), ambito })

// El impacto de volver bloqueante un requisito: el ámbito decide el permiso que se exige.
export const esquemaLeerImpacto = z.object({ id: z.guid(), ambito })
