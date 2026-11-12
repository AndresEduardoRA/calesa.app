// Lo que llega a la persona cuando la base rechaza escribir contenido de la web (8.02). Puro: lo usa `infra/contenido/`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest } from '@/shared/lib/errores'

export const SIN_PERMISO_PARA_CONTENIDO =
  'No tienes permiso para configurar las preguntas frecuentes.'
export const FAQ_QUE_YA_NO_EXISTE = 'Esta pregunta ya no existe. Recarga para ver lo nuevo.'
export const FAQ_CAMBIADA =
  'Alguien cambió esta pregunta mientras la editabas. Recarga para seguir.'
export const ORDEN_CAMBIADO = 'Alguien cambió el orden mientras lo veías. Recarga para seguir.'

export type ErrorAlEscribir = { code?: string | null; message: string; hint?: string | null }

/** El error de la base, dicho para la persona. */
export function rechazoDeEscritura(error: ErrorAlEscribir): ResultadoDeAccion<never> {
  if (error.code === '42501') {
    return { ok: false, error: { codigo: 'sin_permiso', mensaje: SIN_PERMISO_PARA_CONTENIDO } }
  }
  return {
    ok: false,
    error: errorDePostgrest({ code: error.code ?? null, message: error.message }),
  }
}

/**
 * Una escritura con la versión esperada quedó en cero filas: la fila no existe (otra persona la borró), existe con otra versión (conflicto) o existe con la
 * misma versión y la RLS no dejó escribir (sin permiso).
 */
export function sinFilas(
  fila: { existe: boolean; versionDistinta: boolean },
  mensajeDeConflicto: string = FAQ_CAMBIADA,
): ResultadoDeAccion<never> {
  if (!fila.existe) {
    return { ok: false, error: { codigo: 'conflicto', mensaje: FAQ_QUE_YA_NO_EXISTE } }
  }
  return fila.versionDistinta
    ? { ok: false, error: { codigo: 'conflicto', mensaje: mensajeDeConflicto } }
    : { ok: false, error: { codigo: 'sin_permiso', mensaje: SIN_PERMISO_PARA_CONTENIDO } }
}
