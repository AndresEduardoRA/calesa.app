// El estado del parser del compilador y lo que todos sus pasos comparten: leer un token (con uno de adelanto), el texto de un
// tramo y el tope de términos.
import type { ErrorCrudo, Arbol, Marco } from './compilador-arbol'
import { error } from './compilador-arbol'
import { siguiente, T, type Lexico, type Token } from './compilador-lexico'
import type { Nombres } from './compilador-nombres'
import type { Medidor } from './medidor'
import { MAXIMO_DE_TERMINOS, type CodigoDeCompilacion } from './motivos-del-compilador'

export type Operador = { op: string; desde: number; hasta: number }

export type Estado = {
  lex: Lexico
  nombres: Nombres
  m: Medidor
  operandos: Arbol[]
  operadores: Operador[]
  marcos: Marco[]
  esperaValor: boolean
  // Si el token anterior fue un número (para el «%»).
  ultimaNum: boolean
  numPrevio: boolean
  ultimo: Token | undefined
  pendiente: Token | undefined
  terminos: number
}

export type Manejador = (e: Estado, t: Token) => ErrorCrudo | undefined

export function mirar(e: Estado): Token {
  e.pendiente ??= siguiente(e.lex)
  return e.pendiente
}

export function tomar(e: Estado): Token {
  const t = mirar(e)
  e.pendiente = undefined
  if (t.t !== T.FIN) e.ultimo = t
  return t
}

export const textoDe = (e: Estado, a: { desde: number; hasta: number }) =>
  e.lex.texto.slice(a.desde, a.hasta)

export const enToken = (
  t: { desde: number; hasta: number },
  codigo: CodigoDeCompilacion,
  datos = {},
) => error(codigo, t.desde, t.hasta, datos)

// Suma términos al total y avisa si se pasó el tope.
export const contar = (e: Estado) => (n: number) => {
  e.terminos += n
  return e.terminos <= MAXIMO_DE_TERMINOS
}
