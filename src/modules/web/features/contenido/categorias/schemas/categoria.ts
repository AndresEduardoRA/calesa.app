import { z } from 'zod'
import { MAXIMO_DEL_NOMBRE_DE_CATEGORIA } from '../../../../entities/contenido/categorias'

const nombre = z
  .string()
  .trim()
  .min(1, { error: 'Escribe el nombre de la categoría.' })
  .max(MAXIMO_DEL_NOMBRE_DE_CATEGORIA, {
    error: `El nombre lleva hasta ${String(MAXIMO_DEL_NOMBRE_DE_CATEGORIA)} caracteres.`,
  })

export const esquemaCrearCategoria = z.object({ nombre })
export const esquemaRenombrarCategoria = z.object({ id: z.guid(), nombre })
export const esquemaActivarCategoria = z.object({ id: z.guid(), activa: z.boolean() })
export const esquemaMoverCategoria = z.object({
  id: z.guid(),
  direccion: z.enum(['subir', 'bajar']),
})
export const esquemaEliminarCategoria = z.object({ id: z.guid() })
