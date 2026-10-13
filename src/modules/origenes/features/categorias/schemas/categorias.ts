import { z } from 'zod'

const version = z.string().min(1)

const nombre = z
  .string()
  .trim()
  .min(2, { error: 'Escribe un nombre.' })
  .max(60, { error: 'El nombre no puede pasar de 60 caracteres.' })

export const esquemaCrearCategoria = z.object({
  origenId: z.guid(),
  nombre,
  // null = una categoría de primer nivel. Sólo hay un nivel de anidado.
  padreId: z.guid().nullable(),
})

export const esquemaGuardarCategoria = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  nombre: nombre.optional(),
  activa: z.boolean().optional(),
})

export const esquemaMoverCategoria = z.object({
  id: z.guid(),
  despuesDe: z.guid().nullable(),
  actualizadoEnEsperado: version,
})

export const esquemaEliminarCategoria = z.object({ id: z.guid(), actualizadoEnEsperado: version })
