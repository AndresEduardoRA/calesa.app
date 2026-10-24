// La regla `campo_con_punto` (4-3): un campo del vehículo es una columna (`anio`, `precio`…) o la clave de un campo del origen
// (`origenes_campos.clave`, sin puntos), y `cotizacion_evaluar()` lo lee así. Un campo con punto valida pero nunca calcula, así que
// se rechaza. Va al final de las reglas, como en la base: el primer nodo, en el orden de la lista, que nombre uno.
import { recorrer } from './medidor'
import type { Nodo } from './nodos'
import { fallo, type Contexto, type Fallo } from './validar-contexto'

const PUNTO = '.'
const tienePunto = (campo: string) => campo.split(PUNTO, 2).length > 1

// Los campos del vehículo que un nodo nombra: el `campo` de un `campo_vehiculo` y los valores de un `match`. Un valor con punto no
// puede ser un nodo (un id no lleva puntos), así que no hace falta mirar cuáles lo son.
function camposDe(n: Nodo): string[] {
  if (n.tipo === 'campo_vehiculo') return [n.campo]
  return n.tipo === 'tabla' ? Object.values(n.match) : []
}

export function revisarCampos(ctx: Contexto): Fallo | undefined {
  for (const n of recorrer(ctx.nodos, ctx.m)) {
    for (const campo of recorrer(camposDe(n), ctx.m)) {
      if (tienePunto(campo)) return fallo('campo_con_punto', { donde: n.id, campo })
    }
  }
  return undefined
}
