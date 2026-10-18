import { z } from 'zod'
import { CLASES_DE_TIPO } from '../../../entities/tipo-de-lead'

// Lo que cruza el límite de los tipos de lead: sólo la forma. El largo, el repetido, la clase y el tope los dice la base con el
// campo en el `hint`.
const nombre = z.string().max(200)
const version = z.string().min(1)

export const esquemaCrearTipo = z.object({
  // El del intento: el mismo en cada reintento.
  id: z.guid(),
  nombre,
  // Se elige al crearlo y no cambia.
  clase: z.enum(CLASES_DE_TIPO),
})

export const esquemaGuardarTipo = z
  .object({
    id: z.guid(),
    actualizadoEnEsperado: version,
    nombre: nombre.optional(),
    activo: z.boolean().optional(),
  })
  .refine((e) => e.nombre !== undefined || e.activo !== undefined, {
    error: 'No hay nada que guardar.',
  })

export const esquemaMoverTipo = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  // «Después de X»; nulo = primero.
  despuesDe: z.guid().nullable(),
})

export const esquemaEliminarTipo = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
})
