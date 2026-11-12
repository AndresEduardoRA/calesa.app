// Lo que llega a la persona cuando la base rechaza mover el stock de un ítem (8.10-2, C2). Puro. Las RPC del stock (8.10-1) levantan el mensaje ya escrito y el `hint`
// nombra el campo (`cantidad`, `nota`, `motivo`, `proyecto`, `id`): ese texto va junto a su campo. Un `PT409` (el stock cambió, el ítem ya no existe) es un conflicto, sin campo.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest } from '@/shared/lib/errores'

export const SIN_PERMISO_PARA_MOVER_STOCK = 'No tienes permiso para mover el stock de repuestos.'
export const NO_SE_LEYO_LA_RESPUESTA = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

export type ErrorDeStock = { code?: string | null; message: string; hint?: string | null }

const CAMPOS = new Set(['cantidad', 'nota', 'motivo', 'proyecto', 'id'])

/** El error de la base, dicho para la persona y, si nombra un campo, junto a él. */
export function rechazoDeStock(error: ErrorDeStock): ResultadoDeAccion<never> {
  const app = errorDePostgrest({ code: error.code ?? null, message: error.message })
  if (error.hint && CAMPOS.has(error.hint) && app.codigo !== 'inesperado') {
    return { ok: false, error: app, porCampo: { [error.hint]: app.mensaje } }
  }
  return { ok: false, error: app }
}
