// Reducir operadores del parser: una cadena `a+b+c` (`-`, `*`) se aplana al reducir en UN nodo, en el orden del texto; un
// paréntesis o una función corta el aplanado, y `/` nunca se aplana.
import {
  demasiadosTerminos,
  esError,
  faltaUnValor,
  type Arbol,
  type Calculo,
  type ErrorCrudo,
  type OpDeArbol,
} from './compilador-arbol'
import { contar, type Estado, type Operador } from './compilador-estado'

export const PRECEDENCIA: Readonly<Record<string, number>> = { '+': 1, '-': 1, '*': 2, '/': 2 }
const OPERACION: Readonly<Record<string, OpDeArbol>> = {
  '+': 'suma',
  '-': 'restar',
  '*': 'multiplicar',
  '/': 'dividir',
}

function combinar(e: Estado, izq: Arbol, o: Operador, der: Arbol): Arbol | ErrorCrudo {
  const op = OPERACION[o.op] ?? 'suma'
  if (!contar(e)(1)) return demasiadosTerminos(o)
  if (op !== 'dividir' && izq.k === 'calc' && izq.op === op && !izq.paren && !izq.deFuncion) {
    izq.hijos.push(der)
    izq.hasta = der.hasta
    return izq
  }
  const nuevo: Calculo = {
    k: 'calc',
    op,
    hijos: [izq, der],
    campos: {},
    deFuncion: false,
    paren: false,
    desde: izq.desde,
    hasta: der.hasta,
  }
  return contar(e)(1) ? nuevo : demasiadosTerminos(o)
}

// Reduce los operadores del marco de arriba cuya precedencia es al menos `prec` (izquierda con izquierda).
export function reducir(e: Estado, prec: number): ErrorCrudo | undefined {
  const base = e.marcos[e.marcos.length - 1]?.baseOperadores ?? 0
  while (e.operadores.length > base) {
    const o = e.operadores[e.operadores.length - 1]
    if (o === undefined || (PRECEDENCIA[o.op] ?? 0) < prec) break
    e.m.visitas += 1
    e.operadores.pop()
    const der = e.operandos.pop()
    const izq = e.operandos.pop()
    if (der === undefined || izq === undefined) return faltaUnValor(o)
    const r = combinar(e, izq, o, der)
    if (esError(r)) return r
    e.operandos.push(r)
  }
  return undefined
}
