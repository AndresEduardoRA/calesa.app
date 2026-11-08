// La visibilidad que da un diseño: nodo → quién lo ve y quién lo edita. Es el espejo de `_compilar_visibilidad()` (la base la guarda en
// `formulas.visibilidad` al publicar): sirve para mostrar y avisar en el editor, no es la autoridad. Si discrepa, manda la base.
// Cuentan los ítems `celda`, `subtotal`, `variante` e `interruptor` (los `atajos` no); un nodo `total` o `aparte` lo ve todo el mundo.
import { NIVEL_TODOS, type Diseno, type ItemDeDiseno, type SeccionDeDiseno } from '../diseno'
import type { Definicion } from '../formula'
import type { Nodo } from '../nodos'

export type VisibilidadDeNodo = { ver: string; editar: string | null }
type Par = { ver: string; editar: string }

const TIPOS_QUE_CUENTAN = new Set(['celda', 'subtotal', 'variante', 'interruptor'])

const paraTodos = (n: Nodo) => n.salida === 'total' || n.salida === 'aparte'

// El nodo que el pct de la celda dibuja con su par: el de un `porcentaje_de` cuya celda lleva `secundario`.
function pctDeLaCelda(it: ItemDeDiseno, nodos: Map<string, Nodo>): string | undefined {
  if (it.tipo !== 'celda' || it.secundario === undefined) return undefined
  const nodo = nodos.get(it.nodo)
  return nodo?.tipo === 'calculo' && nodo.op === 'porcentaje_de' ? nodo.pct : undefined
}

// El par de un ítem: el nivel propio (sólo la celda lo lleva), si no el de su sección, si no todos.
function parDelItem(it: ItemDeDiseno, s: SeccionDeDiseno): Par {
  const propio = it.tipo === 'celda' ? it : undefined
  return {
    ver: propio?.nivel_ver ?? s.nivel_ver ?? NIVEL_TODOS,
    editar: propio?.nivel_editar ?? s.nivel_editar ?? NIVEL_TODOS,
  }
}

// Lo dibujado: primero los ítems y después el pct de cada celda con `secundario`; el último gana (como `jsonb_object_agg`).
function dibujadoPorElDiseno(diseno: Diseno, nodos: Map<string, Nodo>): Map<string, Par> {
  const dibujado = new Map<string, Par>()
  const conPct: [string, Par][] = []
  for (const s of diseno.secciones) {
    for (const it of s.items) {
      if (!TIPOS_QUE_CUENTAN.has(it.tipo)) continue
      const par = parDelItem(it, s)
      dibujado.set(it.nodo, par)
      const pct = pctDeLaCelda(it, nodos)
      if (pct !== undefined) conPct.push([pct, par])
    }
  }
  for (const [pct, par] of conPct) dibujado.set(pct, par)
  return dibujado
}

export function visibilidadDelDiseno(
  definicion: Definicion,
  diseno: Diseno,
): Map<string, VisibilidadDeNodo> {
  const nodos = new Map(definicion.nodos.map((n) => [n.id, n]))
  const dibujado = dibujadoPorElDiseno(diseno, nodos)
  const visibilidad = new Map<string, VisibilidadDeNodo>()
  for (const [id, par] of dibujado) {
    const nodo = nodos.get(id)
    if (nodo !== undefined) {
      visibilidad.set(id, { ver: paraTodos(nodo) ? NIVEL_TODOS : par.ver, editar: par.editar })
    }
  }
  for (const n of definicion.nodos) {
    if (paraTodos(n) && !dibujado.has(n.id))
      visibilidad.set(n.id, { ver: NIVEL_TODOS, editar: null })
  }
  return visibilidad
}
