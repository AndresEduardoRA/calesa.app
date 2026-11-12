import { z } from 'zod'

// El panel de un ítem de repuestos (8.13-2): `?item=<id>`. La clave es la misma que usan el stock y las imágenes (`?panel=stock|imagenes&item=<id>`); la constante es propia porque un área
// no importa otra. Regla: el panel del ítem sólo se abre con `?item=` **sin** `?panel=`; con `?panel=` manda el panel de siempre y las dos URL no se pisan.
export const CLAVE_DE_ITEM_DEL_PANEL = 'item'
const CLAVE_DE_PANEL = 'panel'

type Parametros = Readonly<Record<string, string | string[] | undefined>>

/** El id del ítem cuyo panel está abierto, o nulo: `?item=` es un guid y no hay `?panel=` (de ningún valor); un valor repetido o vacío no abre nada. */
export function itemAbiertoDe(parametros: Parametros): string | null {
  const valor = parametros[CLAVE_DE_ITEM_DEL_PANEL]
  if (typeof valor !== 'string' || parametros[CLAVE_DE_PANEL] !== undefined) return null
  return z.guid().safeParse(valor).success ? valor : null
}
