import { z } from 'zod'

// El texto de un comentario: sin espacios a los lados, de 1 a 4.000 caracteres, como lo pide la base (`cotizacion_comentar`, mismo mensaje).
export const MAXIMO_DEL_CUERPO = 4000
export const MENSAJE_DEL_CUERPO = 'Escribe el comentario (hasta 4.000 caracteres).'

const cuerpo = z
  .string()
  .trim()
  .min(1, { error: MENSAJE_DEL_CUERPO })
  .max(MAXIMO_DEL_CUERPO, { error: MENSAJE_DEL_CUERPO })

// La versión es el `actualizado_en` del comentario tal cual lo dio la base (texto, nunca por `Date`).
const version = z.string().min(1)

export const esquemaComentar = z.object({
  cotizacionId: z.guid(),
  padreId: z.guid().nullable(),
  cuerpo,
})

export const esquemaEditarComentario = z.object({
  comentarioId: z.guid(),
  actualizadoEnEsperado: version,
  cuerpo,
})

export const esquemaBorrarComentario = z.object({
  comentarioId: z.guid(),
  actualizadoEnEsperado: version,
})

// Lo que se puede decir antes de mandar: vacío o largo. Nulo si está bien.
export function motivoDelCuerpo(texto: string): string | null {
  return cuerpo.safeParse(texto).success ? null : MENSAJE_DEL_CUERPO
}
