// Qué admite un nivel de ver (4.22-2): el espejo de `nivel_no_admitido` de `validar_diseno()` para que el editor apague el campo en vez de dejar que
// la base lo rechace. El total y lo que va aparte lo recibe todo el mundo (la base los manda siempre) y la variante titula el PDF: un ítem sobre ellos no
// puede ser de un nivel. «Lo que va aparte» incluye el porcentaje que muestra una celda con secundario y la bandera de un interruptor.
import type { CeldaDeDiseno, ItemDeDiseno, SeccionDeDiseno } from '../diseno'
import type { Definicion } from '../formula'
import type { Nodo } from '../nodos'

export type NodosPorId = ReadonlyMap<string, Nodo>

// Una sola pasada por definición; las consultas de abajo son O(1) por ítem.
export function nodosPorId(definicion: Definicion): NodosPorId {
  return new Map(definicion.nodos.map((n) => [n.id, n]))
}

const sinNivel = (nodo: Nodo | undefined) => nodo?.salida === 'total' || nodo?.salida === 'aparte'

function porcentajeDe(nodos: NodosPorId, nodo: Nodo | undefined): Nodo | undefined {
  return nodo?.tipo === 'calculo' && nodo.op === 'porcentaje_de' ? nodos.get(nodo.pct) : undefined
}

// ¿El ítem puede ser de un nivel restringido? Atajos no se dibujan con valor y no entran en la regla.
export function itemAdmiteNivel(item: ItemDeDiseno, nodos: NodosPorId): boolean {
  if (item.tipo === 'variante') return false
  if (item.tipo === 'atajos') return true
  const nodo = nodos.get(item.nodo)
  if (sinNivel(nodo)) return false
  if (item.tipo === 'celda' && item.secundario !== undefined) {
    return !sinNivel(porcentajeDe(nodos, nodo))
  }
  return true
}

// Una sección con un ítem así no admite un nivel de ver restringido: sus ítems lo heredarían.
export function seccionAdmiteNivel(seccion: SeccionDeDiseno, nodos: NodosPorId): boolean {
  return seccion.items.every((item) => itemAdmiteNivel(item, nodos))
}

export const celdaAdmiteNivel = (celda: CeldaDeDiseno, nodos: NodosPorId) =>
  itemAdmiteNivel(celda, nodos)
