// Lo que llega a la persona cuando la base rechaza guardar, aceptar o anular una cotización de repuestos (8.12-4, C5). Puro. Las RPC (8.12-1) levantan
// el mensaje ya escrito: el error de una línea dice «Línea N: …», con `hint` = el campo y `details` = el id de la línea, y va a esa celda
// (`porCampo['<línea>:<campo>']`) además de arriba; las notas van a su campo; un PT409 es `conflicto` (la pantalla ofrece «Recargar»); lo demás, arriba.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest } from '@/shared/lib/errores'
import type { ErrorDeCotizacion } from './errores-de-cotizacion'

export const SIN_PERMISO_PARA_ACEPTAR = 'No tienes permiso para aceptar esta cotización.'

export type CampoDeLinea = 'descripcion' | 'cantidad' | 'costo' | 'logistica' | 'caja'

// El `hint` de la base → la celda donde se muestra. El ítem y el bloque no tienen celda propia: van junto a la descripción.
const CELDA_DEL_HINT: Readonly<Record<string, CampoDeLinea>> = {
  descripcion: 'descripcion',
  cantidad: 'cantidad',
  costo: 'costo',
  logistica: 'logistica',
  caja: 'caja',
  item_id: 'descripcion',
  bloque: 'descripcion',
}

/** La clave de `porCampo` del error de una celda. */
export function claveDeCelda(lineaId: string, campo: CampoDeLinea): string {
  return `${lineaId}:${campo}`
}

/** El error de la base al guardar, dicho para la persona y, si es de una línea o de las notas, también en su lugar. */
export function rechazoAlGuardar(error: ErrorDeCotizacion): ResultadoDeAccion<never> {
  const app = errorDePostgrest({ code: error.code ?? null, message: error.message })
  if (app.codigo === 'inesperado' || app.codigo === 'conflicto') return { ok: false, error: app }
  const celda = error.hint ? CELDA_DEL_HINT[error.hint] : undefined
  const linea = error.details?.trim()
  if (celda && linea) {
    return { ok: false, error: app, porCampo: { [claveDeCelda(linea, celda)]: app.mensaje } }
  }
  if (error.hint === 'notas') return { ok: false, error: app, porCampo: { notas: app.mensaje } }
  return { ok: false, error: app }
}

/** El error de la base al aceptar o anular: siempre arriba, con el mensaje de la base. */
export function rechazoDeLaCotizacion(error: ErrorDeCotizacion): ResultadoDeAccion<never> {
  return {
    ok: false,
    error: errorDePostgrest({ code: error.code ?? null, message: error.message }),
  }
}
