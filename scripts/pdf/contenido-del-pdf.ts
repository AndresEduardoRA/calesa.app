// Un stream de contenido de un PDF de pdfkit, para el lector de las pruebas (4.18-3a, C12): los trozos de texto con su posición en la página (la matriz de la página por la
// del texto) y los colores de relleno (`r g b scn` tras `/DeviceRGB cs`, `sc` o `rg`). Sólo los operadores que eso pide; los demás se saltan.
import { noEntiende } from './no-entiende'

export type Cmap = { largo: number; codigos: Map<string, string> }
export type Trozo = { x: number; y: number; texto: string }

type Matriz = [number, number, number, number, number, number]
type Ficha =
  | { tipo: 'num'; v: number }
  | { tipo: 'hex'; v: string }
  | { tipo: 'literal' }
  | { tipo: 'nombre'; v: string }
  | { tipo: 'op'; v: string }
type Operandos = { numeros: number[]; nombre: string | null; textos: Ficha[] }

const IDENTIDAD: Matriz = [1, 0, 0, 1, 0, 0]

// Un grupo por clase de ficha: los corchetes y los diccionarios, un hex, una cadena literal, un nombre, un número, un operador o un comentario.
const FICHA =
  /\s*(?:(\[|\]|<<|>>)|<([0-9a-fA-F\s]*)>|(\((?:\\.|[^\\)])*\))|\/([^\s/[\]()<>{}%]+)|([+-]?(?:\d+\.?\d*|\.\d+))|([A-Za-z'"*][A-Za-z0-9*]*)|(%[^\n]*))/y

const CONSTRUCTORES: ((s: string) => Ficha | null)[] = [
  () => null,
  (s) => ({ tipo: 'hex', v: s.replace(/\s/g, '') }),
  () => ({ tipo: 'literal' }),
  (s) => ({ tipo: 'nombre', v: s }),
  (s) => ({ tipo: 'num', v: Number(s) }),
  (s) => ({ tipo: 'op', v: s }),
  () => null,
]

function* fichas(texto: string): Generator<Ficha> {
  const fichero = new RegExp(FICHA.source, 'y')
  while (fichero.lastIndex < texto.length) {
    const donde = fichero.lastIndex
    const m = fichero.exec(texto)
    if (m === null) {
      const resto = texto.slice(donde)
      if (resto.trim() !== '') {
        noEntiende(`un contenido con «${resto.trim().slice(0, 12)}»`)
      }
      return
    }
    // Un grupo que no participó es `undefined` aunque el tipo diga `string`.
    const grupo = m.slice(1).findIndex((g: string | undefined) => g !== undefined) + 1
    const ficha = CONSTRUCTORES[grupo - 1]?.(m[grupo] ?? '') ?? null
    if (ficha !== null) {
      yield ficha
    }
  }
}

const por = (m: Matriz, n: Matriz): Matriz => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
]

function matriz(n: number[]): Matriz {
  const [a, b, c, d, e, f] = n
  if (
    n.length !== 6 ||
    a === undefined ||
    b === undefined ||
    c === undefined ||
    d === undefined ||
    e === undefined ||
    f === undefined
  ) {
    noEntiende('una matriz que no tiene seis números')
  }
  return [a, b, c, d, e, f]
}

class Lectura {
  pila: Matriz[] = []
  ctm: Matriz = IDENTIDAD
  tm: Matriz = IDENTIDAD
  tlm: Matriz = IDENTIDAD
  fuente: Cmap | null | undefined
  trozos: Trozo[] = []
  constructor(
    readonly fuentes: Map<string, Cmap | null>,
    readonly rellenos: Set<string>,
  ) {}
}

function decodificar(hex: string, cmap: Cmap): string {
  let s = ''
  for (let i = 0; i < hex.length; i += cmap.largo) {
    const codigo = hex.slice(i, i + cmap.largo).toLowerCase()
    s += cmap.codigos.get(codigo) ?? noEntiende(`el glifo <${codigo}> sin ToUnicode`)
  }
  return s
}

function mostrar(l: Lectura, o: Operandos): void {
  if (o.textos.some((t) => t.tipo === 'literal')) {
    noEntiende('un texto en cadena literal (una fuente estándar, sin ToUnicode)')
  }
  const cmap = l.fuente ?? noEntiende('una fuente sin ToUnicode')
  const texto = o.textos.map((t) => (t.tipo === 'hex' ? decodificar(t.v, cmap) : '')).join('')
  const donde = por(l.tm, l.ctm)
  l.trozos.push({ x: donde[4], y: donde[5], texto })
}

const hexDe = (x: number) =>
  Math.round(Math.min(1, Math.max(0, x)) * 255)
    .toString(16)
    .padStart(2, '0')

function color(l: Lectura, o: Operandos): void {
  if (o.numeros.length === 3) {
    l.rellenos.add(`#${o.numeros.map(hexDe).join('')}`)
  }
}

function desplazar(l: Lectura, o: Operandos): void {
  l.tlm = por([1, 0, 0, 1, o.numeros[0] ?? 0, o.numeros[1] ?? 0], l.tlm)
  l.tm = l.tlm
}

const OPERADORES = new Map<string, (l: Lectura, o: Operandos) => void>([
  [
    'q',
    (l) => {
      l.pila.push(l.ctm)
    },
  ],
  [
    'Q',
    (l) => {
      l.ctm = l.pila.pop() ?? IDENTIDAD
    },
  ],
  [
    'cm',
    (l, o) => {
      l.ctm = por(matriz(o.numeros), l.ctm)
    },
  ],
  [
    'BT',
    (l) => {
      l.tm = IDENTIDAD
      l.tlm = IDENTIDAD
    },
  ],
  [
    'Tm',
    (l, o) => {
      l.tm = matriz(o.numeros)
      l.tlm = l.tm
    },
  ],
  ['Td', desplazar],
  ['TD', desplazar],
  [
    'Tf',
    (l, o) => {
      l.fuente = l.fuentes.get(o.nombre ?? '')
    },
  ],
  ['TJ', mostrar],
  ['Tj', mostrar],
  ['scn', color],
  ['sc', color],
  ['rg', color],
])

const vacios = (): Operandos => ({ numeros: [], nombre: null, textos: [] })

// Los operandos de un operador se juntan hasta él (los números de un `TJ`, su espaciado, no se usan).
export function leerContenido(
  texto: string,
  fuentes: Map<string, Cmap | null>,
  rellenos: Set<string>,
): Trozo[] {
  const l = new Lectura(fuentes, rellenos)
  let o = vacios()
  for (const f of fichas(texto)) {
    if (f.tipo === 'op') {
      OPERADORES.get(f.v)?.(l, o)
      o = vacios()
    } else if (f.tipo === 'num') {
      o.numeros.push(f.v)
    } else if (f.tipo === 'nombre') {
      o.nombre = f.v
    } else {
      o.textos.push(f)
    }
  }
  return l.trozos
}
