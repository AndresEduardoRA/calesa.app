// Escribir conversaciones (7.09-2): lo que responden las RPC `chat_*` (7.08) y lo que el repositorio sabe hacer. La respuesta de una RPC es un
// `jsonb` sin tipo: se **parsea**. Un error vuelve como valor con el campo del formulario que lo causó (el `hint` de la base); quién puede lo
// dice la base (42501, 23514): acá no se decide nada. Sin I/O.
import { z } from 'zod'
import { fallo, type ErrorApp } from '@/shared/lib/errores'
import type { Conversacion } from './conversaciones'

export type ResultadoDeConversacion = {
  // `creada`, `existente`, `creado`, `repetido`, `entro`, `ya_estaba`, `salio`, `guardado`, `sin_cambios`: todo es éxito, la pantalla no ramifica.
  resultado: string
  id: string
}

export type FalloDeEscritura = { ok: false; error: ErrorApp; campo?: string }

export type RespuestaDeEscritura = Promise<
  { ok: true; data: ResultadoDeConversacion } | FalloDeEscritura
>

const esquemaDeRespuesta = z.object({ resultado: z.string().min(1), id: z.guid() })

// De lo que devolvió la RPC a un resultado, o un error si no tiene la forma esperada.
export function leerResultadoDeConversacion(
  datos: unknown,
): { ok: true; data: ResultadoDeConversacion } | FalloDeEscritura {
  const leido = esquemaDeRespuesta.safeParse(datos)
  if (!leido.success) {
    return fallo('inesperado', 'No pudimos confirmar que se hizo. Revisa tus conversaciones.')
  }
  return { ok: true, data: leido.data }
}

// Una directa no se deja (se silencia); un grupo y el canal global sí.
export function puedeSalirDe(conversacion: Pick<Conversacion, 'tipo'>): boolean {
  return conversacion.tipo !== 'directa'
}
