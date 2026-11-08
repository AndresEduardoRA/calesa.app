import { z } from 'zod'
import {
  MIME_DE_PDF,
  MIME_DE_WORD,
  PESO_MAXIMO_DE_ADJUNTO,
} from '../../../entities/comentarios/adjunto'

// Lo que se registra tras subir: la ruta por hash en la carpeta de la cotización, el nombre limpio y lo que se subió. La base lo vuelve a revisar todo y toma el tipo
// y el tamaño de storage (`cotizacion_adjuntar`).
const RUTA = /^[0-9a-f-]{36}\/[0-9a-f]{64}\.(pdf|webp|jpg|png|docx)$/

export const esquemaAdjuntar = z
  .object({
    cotizacionId: z.guid(),
    ruta: z.string().regex(RUTA),
    nombre: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[^/\\]+$/),
    mime: z.enum([MIME_DE_PDF, MIME_DE_WORD, 'image/webp', 'image/jpeg', 'image/png']),
    bytes: z.int().min(1).max(PESO_MAXIMO_DE_ADJUNTO),
  })
  .refine((pedido) => pedido.ruta.startsWith(`${pedido.cotizacionId}/`), {
    error: 'El archivo no está en la carpeta de esta cotización.',
    path: ['ruta'],
  })

export const esquemaQuitarAdjunto = z.object({ adjuntoId: z.guid() })
