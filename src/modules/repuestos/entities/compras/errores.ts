// Lo que llega a la persona cuando la base rechaza guardar, eliminar o restaurar una compra (8.11-3, C2). Puro. Las RPC de 8.11-1 levantan el mensaje ya escrito y el
// `hint` nombra el campo: ese texto va junto a su campo del formulario. Un `PT409` (otra versión, la compra ya no existe) es un conflicto, sin campo; el proyecto
// cerrado (`hint` = `proyecto`) va arriba del formulario.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest } from '@/shared/lib/errores'

export const SIN_PERMISO_PARA_COMPRAS = 'No tienes permiso para registrar ni cambiar compras.'
export const NO_SE_LEYO_LA_RESPUESTA = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

export type ErrorDeCompra = { code?: string | null; message: string; hint?: string | null }

// El `hint` de la base → la clave del borrador (`BorradorDeCompra`).
const CAMPO_DEL_BORRADOR: Readonly<Record<string, string>> = {
  item_id: 'itemId',
  proveedor: 'proveedor',
  moneda: 'moneda',
  monto: 'monto',
  fecha: 'fecha',
  notas: 'notas',
  comprobante_ruta: 'comprobanteRuta',
}

/** El error de la base, dicho para la persona y, si nombra un campo, junto a él. */
export function rechazoDeCompra(error: ErrorDeCompra): ResultadoDeAccion<never> {
  const app = errorDePostgrest({ code: error.code ?? null, message: error.message })
  const campo = error.hint ? CAMPO_DEL_BORRADOR[error.hint] : undefined
  if (campo && app.codigo !== 'inesperado' && app.codigo !== 'conflicto') {
    return { ok: false, error: app, porCampo: { [campo]: app.mensaje } }
  }
  return { ok: false, error: app }
}
