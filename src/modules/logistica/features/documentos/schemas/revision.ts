import { z } from 'zod'
import { MOTIVO_MAXIMO } from '../../../entities/documentos/revision'

// Lo que cruza al servidor al revisar, editar o eliminar un documento (6.06-3). La base vuelve a revisarlo todo; aquí se corta lo que no tiene la forma.
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const id = z.guid()
const version = z.string().min(1)

export const esquemaRevisarDocumento = z.object({
  id,
  actualizadoEnEsperado: version,
  estado: z.enum(['aprobado', 'rechazado']),
  motivo: z.string().trim().min(1).max(MOTIVO_MAXIMO).nullable(),
})

export const esquemaEditarDocumento = z.object({
  id,
  actualizadoEnEsperado: version,
  cambios: z
    .object({
      emitido_el: fecha.nullable().optional(),
      vence_el: fecha.nullable().optional(),
      nota: z.string().trim().max(2000).nullable().optional(),
      visible_portal: z.boolean().optional(),
    })
    .strict()
    .refine((c) => Object.keys(c).length > 0, { error: 'No hay nada que guardar.' }),
})

export const esquemaEliminarDocumento = z.object({ id, actualizadoEnEsperado: version })
