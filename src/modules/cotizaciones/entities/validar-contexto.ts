// Lo que comparten las reglas de `validar.ts`: el índice de la fórmula (cada id con su posición) y la forma
// de un rechazo. Cada rechazo se escribe `return fallo('código', …)`: así se apaga uno al mutar las pruebas.
import type { Definicion } from './formula'
import { buscar, recorrer, type Medidor } from './medidor'
import {
  rechazoDeFormula,
  type DatosDeRechazo,
  type RechazoDeFormula,
  type ReglaDeFormula,
} from './motivos-de-formula'
import type { Nodo } from './nodos'

export type Fallo = { ok: false; error: RechazoDeFormula }

export const fallo = (regla: ReglaDeFormula, datos: DatosDeRechazo = {}): Fallo => ({
  ok: false,
  error: rechazoDeFormula(regla, datos),
})

export const esFallo = (x: object): x is Fallo => 'ok' in x

export type Contexto = {
  def: Definicion
  nodos: readonly Nodo[]
  // id → posición en la lista (el orden de evaluación).
  pos: ReadonlyMap<string, number>
  // El primer nodo con `salida: total`, y cuántos hay.
  total: Nodo | undefined
  totales: number
  m: Medidor
}

export function indexar(def: Definicion, m: Medidor): Contexto | Fallo {
  const pos = new Map<string, number>()
  let total: Nodo | undefined
  let totales = 0
  let i = 0
  for (const n of recorrer(def.nodos, m)) {
    if (buscar(pos, n.id, m) !== undefined) return fallo('nodo_duplicado', { donde: n.id })
    pos.set(n.id, i)
    if (n.salida === 'total') {
      totales += 1
      total ??= n
    }
    i += 1
  }
  return { def, nodos: def.nodos, pos, total, totales, m }
}

// El nodo con ese id, o nada.
export function nodoDe(ctx: Contexto, id: string): Nodo | undefined {
  const j = buscar(ctx.pos, id, ctx.m)
  return j === undefined ? undefined : ctx.nodos[j]
}
