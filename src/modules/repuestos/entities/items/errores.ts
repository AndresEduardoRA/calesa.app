// Lo que llega a la persona cuando la base rechaza escribir un ítem (8.09-2, C9 a C11). Puro. El `hint` de las RPC nombra la columna; acá se traduce a la de la hoja para escribir el motivo en su
// celda. Un `PT409` es un conflicto (la hoja ofrece «Recargar»); `23514` con `en_uso` conserva el motivo que escribió la base.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { conflicto, errorDePostgrest, fallo } from '@/shared/lib/errores'
import { MENSAJE_DE_CANTIDAD, MENSAJE_DE_PRECIO } from './celda'

export const SIN_PERMISO_PARA_EDITAR_ITEMS = 'No tienes permiso para editar los ítems de repuestos.'
export const NO_SE_LEYO_EL_ITEM = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'
export const ITEM_YA_NO_EXISTE = 'Este ítem ya no existe.'
export const ITEM_CAMBIO_DE_MANOS = 'Otra persona cambió este ítem. Recarga para ver lo nuevo.'

export type ErrorDeItem = { code?: string | null; message: string; hint?: string | null }

/** `{ ok: false }` de conflicto: el ítem cambió desde que se vio. */
export const elItemCambio = (): ResultadoDeAccion<never> => conflicto(ITEM_CAMBIO_DE_MANOS)
export const elItemYaNoExiste = (): ResultadoDeAccion<never> =>
  fallo('conflicto', ITEM_YA_NO_EXISTE)

// El `hint` de `repuesto_item_crear` → la columna de la hoja.
const COLUMNA_DE_LA_HOJA: Record<string, string> = {
  descripcion: 'descripcion',
  tipo_pieza_id: 'tipo_pieza_id',
  condicion_id: 'condicion_id',
  pais_origen_id: 'pais_origen_id',
  modo_transporte_id: 'modo_transporte_id',
  cantidad: 'cantidad',
  precio_cliente: 'precio_cliente',
  moneda: 'moneda',
  tracking: 'tracking',
  notas: 'notas',
}

/** El error de la base, dicho para la persona y, si nombra una columna de la hoja, junto a ella. */
export function rechazoDeItem(error: ErrorDeItem): ResultadoDeAccion<never> {
  const app = errorDePostgrest({ code: error.code ?? null, message: error.message })
  const columna = error.hint ? COLUMNA_DE_LA_HOJA[error.hint] : undefined
  if (columna && app.codigo !== 'inesperado') {
    return { ok: false, error: app, porCampo: { [columna]: app.mensaje } }
  }
  return { ok: false, error: app }
}

/** Un `update` directo: una violación de `check` o de rango trae texto técnico que no se muestra; se dice por columna. Lo que rechaza el trigger
 * `repuestos_item_escritura` (proyecto cerrado, catálogo, cantidad bajo lo que pasó a stock) trae `hint` y su propio texto, que se conserva. */
export function rechazoDeCelda(columna: string, error: ErrorDeItem): ResultadoDeAccion<never> {
  if (error.code === '23514' && columna === 'cantidad' && !error.hint) {
    return { ok: false, error: { codigo: 'regla', mensaje: MENSAJE_DE_CANTIDAD } }
  }
  if (error.code === '22003' && columna === 'precio_cliente') {
    return { ok: false, error: { codigo: 'regla', mensaje: MENSAJE_DE_PRECIO } }
  }
  return rechazoDeItem(error)
}
