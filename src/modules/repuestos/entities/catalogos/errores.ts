// Lo que llega a la persona cuando la base rechaza escribir un valor de catálogo (8.08-2, C6). Puro: lo usa `infra/catalogos/escribir.ts`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest } from '@/shared/lib/errores'

export const SIN_PERMISO_PARA_LOS_CATALOGOS =
  'No tienes permiso para configurar los catálogos de repuestos.'
export const VALOR_DUPLICADO = 'Ya hay uno con ese nombre.'
export const VALOR_QUE_YA_NO_EXISTE = 'Este valor ya no existe. Recarga para ver lo nuevo.'

export type ErrorAlEscribir = { code?: string | null; message: string; hint?: string | null }

/** El error de la base, dicho para la persona. */
export function rechazoDeValor(error: ErrorAlEscribir): ResultadoDeAccion<never> {
  switch (error.code ?? '') {
    case '23505':
      return {
        ok: false,
        error: { codigo: 'duplicado', mensaje: VALOR_DUPLICADO },
        porCampo: { nombre: VALOR_DUPLICADO },
      }
    case '23514':
      // El trigger `repuestos_catalogo_sin_uso` (8.08-1) escribe su texto para la persona; otro 23514 es técnico.
      return error.hint === 'en_uso'
        ? { ok: false, error: { codigo: 'regla', mensaje: error.message } }
        : { ok: false, error: errorDePostgrest(error) }
    case '42501':
      return {
        ok: false,
        error: { codigo: 'sin_permiso', mensaje: SIN_PERMISO_PARA_LOS_CATALOGOS },
      }
    default:
      return {
        ok: false,
        error: errorDePostgrest({ code: error.code ?? null, message: error.message }),
      }
  }
}

/** La RLS dejó la escritura en cero filas: si la fila sigue existiendo es falta de permiso; si no, otro la borró (D24). */
export function sinFilas(existe: boolean): ResultadoDeAccion<never> {
  return existe
    ? { ok: false, error: { codigo: 'sin_permiso', mensaje: SIN_PERMISO_PARA_LOS_CATALOGOS } }
    : { ok: false, error: { codigo: 'conflicto', mensaje: VALOR_QUE_YA_NO_EXISTE } }
}
