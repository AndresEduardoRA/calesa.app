import { z } from 'zod'
import { MAXIMO_DE_IMAGENES_POR_ITEM, rutaDeImagenValida } from '../../../entities/items/imagenes'

// Lo que cruza al servidor con las imágenes de un ítem (8.09-3, C5 a C7). Cada ruta lleva la carpeta del ítem y el hash del contenido; la base vuelve a revisarlo todo.
export const esquemaLeerImagenes = z.object({ itemId: z.guid() })

export const esquemaAgregarImagenes = z
  .object({
    itemId: z.guid(),
    rutas: z.array(z.string().max(200)).min(1).max(MAXIMO_DE_IMAGENES_POR_ITEM),
  })
  .refine((v) => v.rutas.every((ruta) => rutaDeImagenValida(v.itemId, ruta)), {
    error: 'Una de las imágenes no es de este ítem.',
    path: ['rutas'],
  })

export const esquemaQuitarImagen = z.object({ imagenId: z.guid() })
