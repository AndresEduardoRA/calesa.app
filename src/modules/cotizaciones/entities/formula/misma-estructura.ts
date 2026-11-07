// Si dos nodos son el mismo salvo la `etiqueta` (4.21-1, C7): las mismas claves con los mismos valores, comparados en profundidad.
// El orden de las claves no cuenta; el de una lista (`de`) sí. Una clave con valor indefinido es una clave ausente. `formato` cuenta:
// `4%` es `pct` y `0.04` es `raw`, y un `PORCENTAJE_DE` de otra fila exige `pct`. Puro, nunca lanza.
import type { Nodo } from '../nodos'

function igual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((x, i) => igual(x, b[i]))
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  const ra = a as Record<string, unknown>
  const rb = b as Record<string, unknown>
  const clavesA = Object.keys(ra).filter((k) => ra[k] !== undefined)
  const clavesB = Object.keys(rb).filter((k) => rb[k] !== undefined)
  if (clavesA.length !== clavesB.length) return false
  return clavesA.every((k) => Object.hasOwn(rb, k) && igual(ra[k], rb[k]))
}

export function mismaEstructura(a: Nodo, b: Nodo): boolean {
  const { etiqueta: _a, ...restoA } = a
  const { etiqueta: _b, ...restoB } = b
  return igual(restoA, restoB)
}
