// Lo que comparten las pasadas de `validarDiseno()`: el índice de la fórmula (cada id con su nodo, el total y qué banderas condicionan
// algo), los conjuntos del contexto (niveles, retirados, tonos) y lo que las secciones van dejando (dónde se dibuja cada nodo).
import type { Definicion } from './formula'
import { esta, recorrer, type Medidor } from './medidor'
import type { FalloDeDiseno } from './motivos-de-diseno'
import { fallo } from './motivos-de-diseno'
import { NIVEL_TODOS } from './diseno'
import { condicionDe, type Nodo } from './nodos'

export type ContextoDeDiseno = {
  // Los niveles que existen (también los retirados), sin «todos»: ése siempre existe.
  niveles: readonly string[]
  // Los niveles retirados: ya no se ofrecen, aunque lo que los usa se siga filtrando igual.
  retirados: readonly string[]
  // Las claves del catálogo de tonos de la empresa.
  tonos: readonly string[]
}

export type Indice = {
  def: Definicion
  nodos: ReadonlyMap<string, Nodo>
  // Las banderas que algún nodo lee en su `condicion` o que algún input pide en `requerido_si`.
  condicionadas: ReadonlySet<string>
  requeridas: ReadonlySet<string>
  niveles: ReadonlySet<string>
  retirados: ReadonlySet<string>
  tonos: ReadonlySet<string>
  // Cuántos buckets tiene la fórmula: un modo los llena todos.
  nBuckets: number
  m: Medidor
}

export function indexar(def: Definicion, contexto: ContextoDeDiseno, m: Medidor): Indice {
  const nodos = new Map<string, Nodo>()
  const condicionadas = new Set<string>()
  const requeridas = new Set<string>()
  for (const n of recorrer(def.nodos, m)) {
    nodos.set(n.id, n)
    const condicion = condicionDe(n)
    if (condicion !== undefined) condicionadas.add(condicion)
    if (n.tipo === 'input' && n.requerido_si !== undefined) requeridas.add(n.requerido_si)
  }
  return {
    def,
    nodos,
    condicionadas,
    requeridas,
    niveles: new Set(recorrer(contexto.niveles, m)),
    retirados: new Set(recorrer(contexto.retirados, m)),
    tonos: new Set(recorrer(contexto.tonos, m)),
    nBuckets: Array.from(recorrer(Object.keys(def.buckets ?? {}), m)).length,
    m,
  }
}

// Con qué niveles se dibuja un nodo la primera vez: en su celda, como el porcentaje que muestra una celda, en un subtotal, en los chips
// de la variante o en un interruptor. Los atajos no dibujan el valor y la tarjeta repite lo suyo: ninguno cuenta. Un nodo de tabla sólo
// puede dibujarse en una celda o como el porcentaje de una (los demás ítems piden otra clase de nodo y se rechazan antes).
export type Aparicion = { ver: string; editar: string }

// Un ítem de atajos, con el nivel de su sección, para compararlo con la celda de su nodo cuando ya se vio todo el diseño.
export type AtajoVisto = { nodo: string; ver: string; editar: string }

export type Estado = {
  apariciones: Map<string, Aparicion>
  atajos: AtajoVisto[]
  atajosVistos: Set<string>
}

export const estadoVacio = (): Estado => ({
  apariciones: new Map(),
  atajos: [],
  atajosVistos: new Set(),
})

// El nivel existe y no está retirado. «todos» siempre existe y nunca se retira. Los dos rechazos nombran dónde se usa.
export function revisarNivel(
  ix: Indice,
  nivel: string | undefined,
  donde: string,
): FalloDeDiseno | undefined {
  if (nivel === undefined || nivel === NIVEL_TODOS) return undefined
  if (!esta(ix.niveles, nivel, ix.m)) return fallo('nivel_inexistente', { donde, nivel })
  if (esta(ix.retirados, nivel, ix.m)) return fallo('nivel_retirado', { donde, nivel })
  return undefined
}
