// Publicar una tabla de referencia (4.23-2): el pedido, la nota y lo que se hace con la respuesta de `tabla_referencia_publicar()`. La regla de verdad (el permiso de la
// tabla y de cada origen que la usa, la versión esperada, la nota, las filas) es de la base; sus mensajes llegan tal cual: el PT409 dice quién publicó qué versión y
// cuándo, y un 22023 con `hint` dice qué campo o qué celda («La fila 2: «Monto» va con un número.»).
import { z } from 'zod'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { conflicto, errorDePostgrest, fallo, ok } from '@/shared/lib/errores'

// Copia de la nota de publicar la fórmula (`entities/formula/publicacion.ts`): un área no importa otra.
const MENSAJE_DE_NOTA_VACIA = 'Publicar pide una nota.'
const LARGO_MAXIMO_DE_NOTA = 2000
const MENSAJE_DE_NOTA_LARGA = 'La nota pasa de 2.000 caracteres.'

export const esquemaDeNotaDeTabla = z
  .string()
  .trim()
  .min(1, { error: MENSAJE_DE_NOTA_VACIA })
  .max(LARGO_MAXIMO_DE_NOTA, { error: MENSAJE_DE_NOTA_LARGA })

export const MOTIVO_SIN_PERMISO_DE_TABLA =
  'No tienes permiso para configurar las tablas de referencia de este origen.'

// La tabla entera en su orden (`filasParaPublicar()`), la nota y la versión que se leyó. `origenId` es nulo en una compartida.
export type PedidoDePublicarTabla = {
  tablaId: string
  origenId: string | null
  filas: Record<string, number | string | boolean | null>[]
  nota: string
  versionEsperada: number
}

// La versión nueva de la tabla y la N+1 de cada fórmula que la usa.
export type PublicacionDeTabla = {
  version: number
  formulas: { origenId: string; version: number }[]
}

export type RespuestaDePublicar = {
  data: unknown
  error: { code?: string | null; message: string; hint?: string | null } | null
}

const esquemaDeLaRespuesta = z.object({
  version: z.int(),
  formulas: z.array(z.object({ origen_id: z.guid(), version: z.int() })),
})

const HINT_DE_CAMPO = /^(version|nota|filas(\..+)?)$/

export function resultadoDePublicar({
  data,
  error,
}: RespuestaDePublicar): ResultadoDeAccion<PublicacionDeTabla> {
  if (error) {
    if (error.code === 'PT409') return conflicto(error.message)
    // El mensaje tal cual: `errorDePostgrest` cambiaría por el genérico «… no tiene la columna «x».» (dice «column»).
    if (error.code === '22023' && error.hint && HINT_DE_CAMPO.test(error.hint)) {
      return {
        ok: false,
        error: { codigo: 'regla', mensaje: error.message },
        porCampo: { [error.hint]: error.message },
      }
    }
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leida = esquemaDeLaRespuesta.safeParse(data)
  if (!leida.success) {
    return fallo('inesperado', 'No pudimos leer la respuesta. Recarga para ver cómo quedó.')
  }
  return ok({
    version: leida.data.version,
    formulas: leida.data.formulas.map((f) => ({ origenId: f.origen_id, version: f.version })),
  })
}
