import { z } from 'zod'
import {
  LARGO_DE_CATEGORIA,
  LARGO_DE_PREGUNTA,
  LARGO_DE_RESPUESTA,
} from '../../../../entities/contenido/faqs'

// Lo que cruza al servidor al crear, guardar, eliminar o mover una pregunta frecuente (8.02-1). La base vuelve a revisarlo con la RLS y las columnas.
const pregunta = z.string().trim().min(1).max(LARGO_DE_PREGUNTA)
const respuesta = z.string().trim().min(1).max(LARGO_DE_RESPUESTA)
const categoria = z.string().trim().min(1).max(LARGO_DE_CATEGORIA).nullable()
const version = z.iso.datetime({ offset: true })

export const esquemaCrearFaq = z.object({
  pregunta,
  respuesta,
  categoria,
  publicada: z.boolean(),
})

// Sólo lo que cambió (`cambiosDeFaq`): al menos una clave, con la versión que se vio.
export const esquemaGuardarFaq = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  cambios: z
    .strictObject({
      pregunta: pregunta.optional(),
      respuesta: respuesta.optional(),
      categoria: categoria.optional(),
      publicada: z.boolean().optional(),
    })
    .refine((c) => Object.keys(c).length > 0, { error: 'No hay cambios que guardar.' }),
})

export const esquemaEliminarFaq = z.object({ id: z.guid(), actualizadoEnEsperado: version })

export const esquemaMoverFaq = z.object({ id: z.guid(), direccion: z.enum(['subir', 'bajar']) })
