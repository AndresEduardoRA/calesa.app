// Las filas de una fórmula con texto (4.21-1; docs/COTIZADOR.md › «El editor (4.21-1)»): una fila es un nodo que no es auxiliar de otra, y
// sus auxiliares son los nodos `<id>__<n>` que el compilador (4.07) creó para su texto (la regla, en `compilador-auxiliares.ts`). Puro, sin I/O,
// lineal con el medidor.
import { cadenasDeAuxiliares, textoGuardadoDe } from '../compilador-auxiliares'
import { recorrer, type Medidor } from '../medidor'
import type { Nodo } from '../nodos'
import type { Definicion } from '../formula'

export { idAuxiliarDe } from '../compilador-auxiliares'

export type Fila = {
  // El lugar entre las filas (desde 0).
  indice: number
  nodo: Nodo
  // Dónde está su raíz en `definicion.nodos`, y dónde empieza su cadena de auxiliares (igual si no tiene).
  posicion: number
  desde: number
  // Los ids de sus auxiliares, en el orden de la lista.
  auxiliares: string[]
  texto: string | undefined
}

export function filasDe(definicion: Definicion, medidor?: Medidor): Fila[] {
  const m = medidor ?? { visitas: 0 }
  const nodos = definicion.nodos
  const cadenas = cadenasDeAuxiliares(nodos, m)
  const tomada = new Set<number>()
  for (const [p, k] of cadenas) for (let j = p - k; j < p; j += 1) tomada.add(j)
  const filas: Fila[] = []
  for (const [p, nodo] of recorrer(nodos.entries(), m)) {
    if (tomada.has(p)) continue
    const k = cadenas.get(p) ?? 0
    filas.push({
      indice: filas.length,
      nodo,
      posicion: p,
      desde: p - k,
      auxiliares: nodos.slice(p - k, p).map((n) => n.id),
      texto: textoGuardadoDe(nodo),
    })
  }
  return filas
}
