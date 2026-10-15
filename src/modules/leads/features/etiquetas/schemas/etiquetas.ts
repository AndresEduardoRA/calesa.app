import { z } from 'zod'
import { CLAVES_DE_COLOR, LARGO_MAXIMO_DE_ETIQUETA } from '../../../entities/etiqueta'

// Lo que cruza el límite de las etiquetas: sólo la forma. El repetido y los topes los dice la base,
// con el campo en el `hint`.
const nombre = z.string().trim().min(1).max(LARGO_MAXIMO_DE_ETIQUETA)
const color = z.enum(CLAVES_DE_COLOR)
const version = z.string().min(1)

export const esquemaCrearEtiqueta = z.object({
  // El del intento: el mismo en cada reintento (y en «Deshacer» de un borrado).
  id: z.guid(),
  nombre,
  color: color.nullable(),
})

export const esquemaGuardarEtiqueta = z
  .object({
    id: z.guid(),
    actualizadoEnEsperado: version,
    nombre: nombre.optional(),
    color: color.optional(),
  })
  .refine((e) => e.nombre !== undefined || e.color !== undefined, {
    error: 'No hay nada que guardar.',
  })

export const esquemaEliminarEtiqueta = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
})
