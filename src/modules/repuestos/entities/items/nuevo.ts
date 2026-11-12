import { cambioDeCelda } from './celda'
import type { DatosDeItemNuevo } from './repositorio'

// Lo que se teclea en la fila nueva de la hoja (8.09-2, C10): la descripción y, si ya se puso, la cantidad y el precio (con la moneda que irá con él). Puro: valida con las mismas reglas de las celdas
// y arma `p_datos` de `repuesto_item_crear`. El primer campo que no pasa se dice junto a su columna.
export type EntradaDeItemNuevo = {
  descripcion: string
  cantidad?: number | undefined
  precioCliente?: number | undefined
  moneda?: string | undefined
}

export type ItemNuevoValidado =
  { ok: true; datos: DatosDeItemNuevo } | { ok: false; columna: string; error: string }

export function validarItemNuevo(entrada: EntradaDeItemNuevo): ItemNuevoValidado {
  const datos: DatosDeItemNuevo = { descripcion: '' }
  const pasos: [string, ReturnType<typeof cambioDeCelda>][] = [
    ['descripcion', cambioDeCelda('descripcion', entrada.descripcion)],
  ]
  if (entrada.cantidad !== undefined) {
    pasos.push(['cantidad', cambioDeCelda('cantidad', entrada.cantidad)])
  }
  if (entrada.precioCliente !== undefined) {
    pasos.push([
      'precio_cliente',
      cambioDeCelda('precio_cliente', entrada.precioCliente, entrada.moneda),
    ])
  }
  for (const [columna, cambio] of pasos) {
    if (!cambio.ok) {
      return { ok: false, columna, error: cambio.error }
    }
    Object.assign(datos, cambio.fila)
  }
  return { ok: true, datos }
}
