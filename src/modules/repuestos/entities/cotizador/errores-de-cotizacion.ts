// Lo que llega a la persona cuando la base rechaza crear una cotización de repuestos (8.12-3, C6). Puro. `repuestos_cotizacion_crear` (8.12-1)
// levanta el mensaje ya escrito y el `hint` nombra qué falló: la configuración que falta (`config`, la pantalla agrega el enlace a Configuración) y la
// moneda (`moneda`) van junto a su lugar; el proyecto cerrado, el que ya no existe y un id de otra cotización van arriba, sin campo.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest } from '@/shared/lib/errores'

export const SIN_PERMISO_PARA_COTIZAR = 'No tienes permiso para cotizar repuestos.'
export const NO_SE_LEYO_LA_RESPUESTA = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

// `details` es como lo trae PostgREST (no `detail`): en guardar, el id de la línea que falló (8.12-4).
export type ErrorDeCotizacion = {
  code?: string | null
  message: string
  hint?: string | null
  details?: string | null
}

const CAMPOS_AL_CREAR: ReadonlySet<string> = new Set(['config', 'moneda'])

/** El error de la base al crear, dicho para la persona y, si es de la configuración o la moneda, en su campo. */
export function rechazoAlCrear(error: ErrorDeCotizacion): ResultadoDeAccion<never> {
  const app = errorDePostgrest({ code: error.code ?? null, message: error.message })
  const campo = error.hint && CAMPOS_AL_CREAR.has(error.hint) ? error.hint : undefined
  if (campo && app.codigo !== 'inesperado' && app.codigo !== 'conflicto') {
    return { ok: false, error: app, porCampo: { [campo]: app.mensaje } }
  }
  return { ok: false, error: app }
}
