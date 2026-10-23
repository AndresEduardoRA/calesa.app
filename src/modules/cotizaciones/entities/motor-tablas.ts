// Las tablas de referencia en el motor: cuál manda (D5: la congelada en `params.tablas`, aunque esté vacía; si no,
// la viva de la entrada) y qué fila se lee, siempre la primera que coincide en el orden de la tabla. Cada nodo anota
// a lo sumo un faltante, el primero en este orden: tabla sin filas, campo sin valor, fila sin coincidencia, celda.
import type { FilaDeTabla } from './formula'
import { buscar, propia, recorrer } from './medidor'
import { anotar, leer, type Evaluacion, type Valor } from './motor-contexto'
import type { Nodo } from './nodos'

type NodoTabla = Extract<Nodo, { tipo: 'tabla' }>
// Lo que se busca: el nodo que lee, su tabla y la columna que da el valor.
type Busqueda = { id: string; tabla: string; columna: string }
type Clave = { columna: string; valor: number | string }

export function filasDe(ev: Evaluacion, b: Busqueda): readonly FilaDeTabla[] | null {
  const filas = buscar(ev.congeladas, b.tabla, ev.m) ?? buscar(ev.entrada.tablas, b.tabla, ev.m)
  if (filas === undefined || filas.length === 0) return anotar(ev, 'tabla_sin_filas', b.id, b.tabla)
  return filas
}

// `tabla`: la primera fila cuyas columnas del `match` son todas iguales, sin conversión (2024 no es "2024"), al
// valor que nombran: un nodo anterior con ese id o, si no hay, el campo del vehículo.
export function valorDeTabla(ev: Evaluacion, n: NodoTabla): Valor {
  const filas = filasDe(ev, n)
  if (filas === null) return null
  const claves = clavesDeMatch(ev, n)
  if (claves === null) return null
  const fila = primeraQueCoincide(ev, filas, claves)
  if (fila === undefined) return anotar(ev, 'fila_sin_coincidencia', n.id, n.tabla)
  return celda(ev, fila, n)
}

// `tramo` y `depreciar`: la primera fila con `desde ≤ sobre ≤ hasta`, los dos extremos incluidos. Una fila sin
// `desde` o sin `hasta` numérico no coincide nunca.
export function valorDeTramo(ev: Evaluacion, b: Busqueda, sobre: Valor): Valor {
  const filas = filasDe(ev, b)
  if (filas === null || sobre === null) return null
  for (const fila of recorrer(filas, ev.m)) {
    const desde = propia(fila, 'desde', ev.m)
    const hasta = propia(fila, 'hasta', ev.m)
    if (
      typeof desde === 'number' &&
      typeof hasta === 'number' &&
      desde <= sobre &&
      sobre <= hasta
    ) {
      return celda(ev, fila, b)
    }
  }
  return anotar(ev, 'fila_sin_coincidencia', b.id, b.tabla)
}

// Los valores del `match`, o null si alguno falta. Si faltan varios campos, el faltante nombra el menor (en orden
// de código): así no depende del orden de las claves, que jsonb no guarda.
function clavesDeMatch(ev: Evaluacion, n: NodoTabla): Clave[] | null {
  const claves: Clave[] = []
  let nulo = false
  let campoQueFalta: string | undefined
  for (const [columna, ref] of recorrer(Object.entries(n.match), ev.m)) {
    const valor = valorDeMatch(ev, n.id, ref)
    if (valor === undefined) campoQueFalta = menor(campoQueFalta, ref)
    if (valor === undefined || valor === null) nulo = true
    else claves.push({ columna, valor })
  }
  if (campoQueFalta !== undefined) anotar(ev, 'campo_sin_valor', n.id, campoQueFalta)
  return nulo ? null : claves
}

// El valor de un nodo anterior (null si es null), o el del campo del vehículo (undefined si no está o es null).
function valorDeMatch(
  ev: Evaluacion,
  quien: string,
  ref: string,
): number | string | null | undefined {
  if (buscar(ev.nodos, ref, ev.m) !== undefined) return leer(ev, ref, quien)
  return buscar(ev.entrada.vehiculo, ref, ev.m) ?? undefined
}

const menor = (a: string | undefined, b: string) => (a === undefined || b < a ? b : a)

function primeraQueCoincide(
  ev: Evaluacion,
  filas: readonly FilaDeTabla[],
  claves: readonly Clave[],
): FilaDeTabla | undefined {
  for (const fila of recorrer(filas, ev.m)) {
    if (coincide(ev, fila, claves)) return fila
  }
  return undefined
}

function coincide(ev: Evaluacion, fila: FilaDeTabla, claves: readonly Clave[]): boolean {
  for (const c of recorrer(claves, ev.m)) {
    if (propia(fila, c.columna, ev.m) !== c.valor) return false
  }
  return true
}

// La columna de la fila: un número, o null (la «X» del Excel, un texto o una columna que no está).
function celda(ev: Evaluacion, fila: FilaDeTabla, b: Busqueda): Valor {
  const v = propia(fila, b.columna, ev.m)
  return typeof v === 'number' ? v : anotar(ev, 'celda_sin_valor', b.id, b.tabla)
}
