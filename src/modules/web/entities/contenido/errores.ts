// Lo que llega a la persona cuando la base rechaza escribir contenido de la web (8.02). Puro: lo usa `infra/contenido/`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest } from '@/shared/lib/errores'

export const SIN_PERMISO_PARA_CONTENIDO =
  'No tienes permiso para configurar las preguntas frecuentes.'
export const FAQ_QUE_YA_NO_EXISTE = 'Esta pregunta ya no existe. Recarga para ver lo nuevo.'
export const FAQ_CAMBIADA =
  'Alguien cambió esta pregunta mientras la editabas. Recarga para seguir.'
export const SIN_PERMISO_PARA_TESTIMONIOS = 'No tienes permiso para configurar los testimonios.'
export const TESTIMONIO_QUE_YA_NO_EXISTE =
  'Este testimonio ya no existe. Recarga para ver lo nuevo.'
export const TESTIMONIO_CAMBIADO =
  'Alguien cambió este testimonio mientras lo veías. Recarga para seguir.'
export const ORDEN_CAMBIADO = 'Alguien cambió el orden mientras lo veías. Recarga para seguir.'

export type ErrorAlEscribir = { code?: string | null; message: string; hint?: string | null }

/** El error de la base, dicho para la persona. */
export function rechazoDeEscritura(
  error: ErrorAlEscribir,
  sinPermiso: string = SIN_PERMISO_PARA_CONTENIDO,
): ResultadoDeAccion<never> {
  if (error.code === '42501') {
    return { ok: false, error: { codigo: 'sin_permiso', mensaje: sinPermiso } }
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
  textos: { yaNoExiste: string; sinPermiso: string } = {
    yaNoExiste: FAQ_QUE_YA_NO_EXISTE,
    sinPermiso: SIN_PERMISO_PARA_CONTENIDO,
  },
): ResultadoDeAccion<never> {
  if (!fila.existe) {
    return { ok: false, error: { codigo: 'conflicto', mensaje: textos.yaNoExiste } }
  }
  return fila.versionDistinta
    ? { ok: false, error: { codigo: 'conflicto', mensaje: mensajeDeConflicto } }
    : { ok: false, error: { codigo: 'sin_permiso', mensaje: textos.sinPermiso } }
}

/**
 * El error de la base al escribir un testimonio o su consentimiento, dicho para la persona. Además de lo común: `P0002` (ya no existe) es un conflicto, y
 * `22022`/`22023` traen el mensaje ya escrito (el del consentimiento, y si su `hint` es `canal`, va junto a ese campo).
 */
export function rechazoDeTestimonio(error: ErrorAlEscribir): ResultadoDeAccion<never> {
  if (error.code === 'P0002') {
    return { ok: false, error: { codigo: 'conflicto', mensaje: TESTIMONIO_QUE_YA_NO_EXISTE } }
  }
  if ((error.code === '22022' || error.code === '22023') && error.message.trim() !== '') {
    const mensaje = error.message.trim()
    return {
      ok: false,
      error: { codigo: 'regla', mensaje },
      ...(error.hint === 'canal' ? { porCampo: { canal: mensaje } } : {}),
    }
  }
  return rechazoDeEscritura(error, SIN_PERMISO_PARA_TESTIMONIOS)
}
