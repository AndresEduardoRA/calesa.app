// El léxico del compilador de fórmulas como texto: cada token con su tramo, leído de a uno (el parser lo pide cuando lo necesita,
// así un error se nombra en el orden del texto). Sin expresiones regulares: se recorren los códigos de carácter, y cada carácter
// que se examina es una visita del medidor.
import type { Medidor } from './medidor'
import type { CodigoDeCompilacion } from './motivos-del-compilador'

export const T = {
  NUM: 1,
  NOMBRE: 2,
  MAS: 3,
  MENOS: 4,
  POR: 5,
  ENTRE: 6,
  ABRE: 7,
  CIERRA: 8,
  PUNTO_Y_COMA: 9,
  COMA: 10,
  PORCIENTO: 11,
  FIN: 12,
  ERROR: 13,
} as const

export type Token = { t: number; desde: number; hasta: number; codigo?: CodigoDeCompilacion }
export type Lexico = { texto: string; pos: number; m: Medidor }

const SIGNOS = new Map<number, number>([
  [43, T.MAS],
  [45, T.MENOS],
  [42, T.POR],
  [47, T.ENTRE],
  [40, T.ABRE],
  [41, T.CIERRA],
  [59, T.PUNTO_Y_COMA],
  [44, T.COMA],
  [37, T.PORCIENTO],
])

const esDigito = (c: number) => c >= 48 && c <= 57
const esLetra = (c: number) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122)
const iniciaNombre = (c: number) => esLetra(c) || c === 95 || c === 36
const esDeNombre = (c: number) => iniciaNombre(c) || esDigito(c)
// Espacio, tab, salto de línea y el espacio duro que deja pegar desde una página web.
const esEspacio = (c: number) => c === 32 || c === 9 || c === 10 || c === 13 || c === 160

function saltarEspacios(lex: Lexico) {
  while (esEspacio(lex.texto.charCodeAt(lex.pos))) {
    lex.m.visitas += 1
    lex.pos += 1
  }
}

// Un «=» al principio es opcional.
export function crearLexico(texto: string, m: Medidor): Lexico {
  const lex: Lexico = { texto, pos: 0, m }
  saltarEspacios(lex)
  if (texto.charCodeAt(lex.pos) === 61) lex.pos += 1
  return lex
}

function pasar(lex: Lexico, desde: number, sirve: (c: number) => boolean): number {
  let i = desde
  while (sirve(lex.texto.charCodeAt(i))) {
    lex.m.visitas += 1
    i += 1
  }
  return i
}

const deNumeroMalo = (c: number) => esDeNombre(c) || c === 46

// «1.», «.5», «1.2.3», «1e», «4x»: todo el tramo pegado cuenta como un número mal escrito.
function malEscrito(lex: Lexico, desde: number): Token {
  const hasta = pasar(lex, desde, deNumeroMalo)
  lex.pos = hasta
  return { t: T.ERROR, desde, hasta, codigo: 'numero_mal_escrito' }
}

function leerNumero(lex: Lexico, desde: number): Token {
  const texto = lex.texto
  let i = pasar(lex, desde, esDigito)
  if (texto.charCodeAt(i) === 46) {
    if (!esDigito(texto.charCodeAt(i + 1))) return malEscrito(lex, desde)
    i = pasar(lex, i + 1, esDigito)
  }
  const e = texto.charCodeAt(i)
  if (e === 101 || e === 69) {
    const signo = texto.charCodeAt(i + 1)
    const j = signo === 43 || signo === 45 ? i + 2 : i + 1
    if (!esDigito(texto.charCodeAt(j))) return malEscrito(lex, desde)
    i = pasar(lex, j, esDigito)
  }
  if (deNumeroMalo(texto.charCodeAt(i))) return malEscrito(lex, desde)
  lex.pos = i
  return { t: T.NUM, desde, hasta: i }
}

export function siguiente(lex: Lexico): Token {
  saltarEspacios(lex)
  const { texto } = lex
  const desde = lex.pos
  lex.m.visitas += 1
  if (desde >= texto.length) return { t: T.FIN, desde, hasta: desde }
  const c = texto.charCodeAt(desde)
  if (esDigito(c)) return leerNumero(lex, desde)
  if (c === 46) return malEscrito(lex, desde)
  if (iniciaNombre(c)) {
    lex.pos = pasar(lex, desde, esDeNombre)
    return { t: T.NOMBRE, desde, hasta: lex.pos }
  }
  const signo = SIGNOS.get(c)
  if (signo !== undefined) {
    lex.pos = desde + 1
    return { t: signo, desde, hasta: desde + 1 }
  }
  // Un carácter fuera de la gramática; un par de sustitutos (un emoji) se nombra entero.
  const par = c >= 0xd800 && c <= 0xdbff && (texto.charCodeAt(desde + 1) & 0xfc00) === 0xdc00
  lex.pos = desde + (par ? 2 : 1)
  return { t: T.ERROR, desde, hasta: lex.pos, codigo: 'caracter_invalido' }
}

// El valor de un número ya leído. Con `pct` se corre el punto dos lugares en el TEXTO (0.1% = 0.1e-2 = 0.001): dividir el
// doble entre 100 daría otro doble. Null si no cabe en un doble.
export function valorDeNumero(
  texto: string,
  desde: number,
  hasta: number,
  pct: boolean,
): number | null {
  const s = texto.slice(desde, hasta)
  let i = s.indexOf('e')
  if (i < 0) i = s.indexOf('E')
  const mantisa = i < 0 ? s : s.slice(0, i)
  const exponente = i < 0 ? 0 : Number.parseInt(s.slice(i + 1), 10)
  if (!Number.isSafeInteger(exponente) || Math.abs(exponente) > 100_000) {
    if (Number(mantisa) === 0) return 0
    return exponente > 0 ? null : 0
  }
  const v = Number(`${mantisa}e${String(exponente - (pct ? 2 : 0))}`)
  return Number.isFinite(v) ? v : null
}
