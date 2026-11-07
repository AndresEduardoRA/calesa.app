// Las filas de una fórmula con texto (4.21-1; docs/COTIZADOR.md › «El editor (4.21-1)»): una fila es un nodo que no es auxiliar de otra, y
// sus auxiliares son los nodos `<id>__<n>` que el compilador (4.07) creó para su texto. Puro, sin I/O, lineal con el medidor.
import { crearLexico, siguiente, T } from '../compilador-lexico'
import { recorrer, type Medidor } from '../medidor'
import { referenciasDe, type Nodo } from '../nodos'
import type { Definicion } from '../formula'

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

// El id de la auxiliar n de una fila: la MISMA regla que `idAuxiliar()` de `compilador-emitir.ts:49-53` (que no se toca): si no cabe en
// 41 caracteres, se recorta el prefijo.
export function idAuxiliarDe(raiz: string, n: number): string {
  const sufijo = `__${String(n)}`
  return raiz.slice(0, 41 - sufijo.length) + sufijo
}

const textoGuardadoDe = (n: Nodo): string | undefined =>
  n.tipo === 'constante' || n.tipo === 'calculo' ? n.texto : undefined

// El `k` del sufijo `__<k>` de un id: un entero desde 1, sin ceros a la izquierda.
function sufijoDe(id: string): number | null {
  const i = id.lastIndexOf('__')
  if (i < 0) return null
  const digitos = id.slice(i + 2)
  if (digitos === '' || digitos.startsWith('0')) return null
  for (let j = 0; j < digitos.length; j += 1) {
    const c = digitos.charCodeAt(j)
    if (c < 48 || c > 57) return null
  }
  const k = Number(digitos)
  return Number.isSafeInteger(k) && k >= 1 ? k : null
}

// Los nombres que un texto escribe (cada token de nombre).
function nombresDelTexto(texto: string, m: Medidor): Set<string> {
  const nombres = new Set<string>()
  const lex = crearLexico(texto, m)
  for (;;) {
    const t = siguiente(lex)
    if (t.t === T.FIN) break
    if (t.t === T.NOMBRE) nombres.add(texto.slice(t.desde, t.hasta))
  }
  return nombres
}

// Antes de cortar la cadena (O(k)): empieza con `aux(R, 1)` y termina con `aux(R, k)`.
function extremosDeLaCadena(nodos: readonly Nodo[], p: number, k: number, raiz: Nodo): boolean {
  return (
    nodos[p - k]?.id === idAuxiliarDe(raiz.id, 1) && nodos[p - 1]?.id === idAuxiliarDe(raiz.id, k)
  )
}

// ¿Los nodos son, en orden, `aux(R, 1..k)` y ninguno lleva texto (una auxiliar nunca lo lleva)?
function sonLaCadena(cadena: readonly Nodo[], raiz: Nodo, m: Medidor): boolean {
  for (const [i, n] of cadena.entries()) {
    m.visitas += 1
    if (n.id !== idAuxiliarDe(raiz.id, i + 1) || textoGuardadoDe(n) !== undefined) return false
  }
  return true
}

// ¿Cada auxiliar la nombra exactamente un nodo de la cadena o la raíz? (como en una emisión: su padre en el árbol; V5b)
function nombradaPorUno(cadena: readonly Nodo[], raiz: Nodo, m: Medidor): boolean {
  const nombradas = new Map<string, number>()
  for (const n of recorrer([...cadena, raiz], m)) {
    const propias = new Set(referenciasDe(n).map((r) => r.id))
    for (const id of recorrer(propias, m)) nombradas.set(id, (nombradas.get(id) ?? 0) + 1)
  }
  return cadena.every((n) => nombradas.get(n.id) === 1)
}

// El k del nodo de justo antes de la raíz, si la cadena de k nodos empieza con `aux(R, 1)` y termina con `aux(R, k)` (se mira antes de cortar: O(1)).
function largoDeLaCadena(nodos: readonly Nodo[], p: number, raiz: Nodo): number {
  const k = sufijoDe(nodos[p - 1]?.id ?? '')
  if (k === null || k > p || !extremosDeLaCadena(nodos, p, k, raiz)) return 0
  return k
}

// Los k nodos inmediatamente antes de la raíz, si son su cadena entera: ids `aux(R, 1..k)` en orden; sin texto; cada uno nombrado por
// exactamente un nodo posterior de la cadena o por la raíz; y el texto de la raíz no los nombra (el compilador nunca escribe en el texto el
// nombre de una auxiliar que crea: si el texto lo nombra, es una fila propia que la raíz lee).
function cadenaDe(nodos: readonly Nodo[], p: number, m: Medidor): number {
  const raiz = nodos[p]
  const texto = raiz === undefined ? undefined : textoGuardadoDe(raiz)
  if (raiz === undefined || texto === undefined) return 0
  const k = largoDeLaCadena(nodos, p, raiz)
  if (k === 0) return 0
  const cadena = nodos.slice(p - k, p)
  if (!sonLaCadena(cadena, raiz, m) || !nombradaPorUno(cadena, raiz, m)) return 0
  const escritos = nombresDelTexto(texto, m)
  return cadena.some((n) => escritos.has(n.id)) ? 0 : k
}

export function filasDe(definicion: Definicion, medidor?: Medidor): Fila[] {
  const m = medidor ?? { visitas: 0 }
  const nodos = definicion.nodos
  // El largo de la cadena de cada raíz; una auxiliar ya tomada por otra cadena no se toma dos veces.
  const tomada = new Set<number>()
  const cadenas = new Map<number, number>()
  for (const [p] of recorrer(nodos.entries(), m)) {
    const k = cadenaDe(nodos, p, m)
    if (k === 0) continue
    let libre = true
    for (let j = p - k; j < p; j += 1) if (tomada.has(j)) libre = false
    if (!libre) continue
    for (let j = p - k; j < p; j += 1) tomada.add(j)
    cadenas.set(p, k)
  }
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
