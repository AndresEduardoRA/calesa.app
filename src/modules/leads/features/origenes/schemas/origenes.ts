import { z } from 'zod'

// Lo que cruza el límite de los orígenes del lead: sólo la forma. El largo, el repetido y el tope los
// dice la base con el campo en el `hint`.
const nombre = z.string().max(200)
const version = z.string().min(1)
// Una clave del catálogo o nada: la base rechaza la que no es del catálogo («Ese icono no está en el catálogo»).
const icono = z.string().max(40).nullable()

export const esquemaCrearOrigen = z.object({
  // El del intento: el mismo en cada reintento.
  id: z.guid(),
  nombre,
  icono,
})

export const esquemaGuardarOrigen = z
  .object({
    id: z.guid(),
    actualizadoEnEsperado: version,
    nombre: nombre.optional(),
    icono: icono.optional(),
    activo: z.boolean().optional(),
    porDefecto: z.boolean().optional(),
  })
  .refine(
    (e) =>
      e.nombre !== undefined ||
      e.icono !== undefined ||
      e.activo !== undefined ||
      e.porDefecto !== undefined,
    {
      error: 'No hay nada que guardar.',
    },
  )

export const esquemaMoverOrigen = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  // «Después de X»; nulo = primero.
  despuesDe: z.guid().nullable(),
})

export const esquemaEliminarOrigen = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
})
