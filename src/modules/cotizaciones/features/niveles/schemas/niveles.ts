import { z } from 'zod'

// Lo que cruza el límite de los niveles: sólo la forma. El largo, el repetido, la clave que sale del nombre y el tope los dice la base con el
// campo en el `hint`.
const nombre = z.string().max(200)
const version = z.string().min(1)

export const esquemaCrearNivel = z.object({
  // El del intento: el mismo en cada reintento.
  id: z.guid(),
  nombre,
})

export const esquemaRenombrarNivel = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  nombre,
})

// Retirar, restaurar y eliminar: el nivel y la versión que se tenía en pantalla.
export const esquemaDeUnNivel = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
})
