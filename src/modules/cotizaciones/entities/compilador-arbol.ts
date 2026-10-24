// El árbol que arma el parser del compilador de fórmulas como texto (docs/COTIZADOR.md › «Fórmulas como texto (4.07)»). Cada
// hoja y cada operación guardan su tramo del texto: así un error, una etiqueta y la posición de un auxiliar salen de él.
import type { Token } from './compilador-lexico'
import type { CodigoDeCompilacion, DatosDeError } from './motivos-del-compilador'
import type { Nodo } from './nodos'

export type Rango = { desde: number; hasta: number }

// Las operaciones del grafo que el texto puede producir.
export type OpDeArbol =
  'suma' | 'restar' | 'multiplicar' | 'dividir' | 'porcentaje_de' | 'si' | 'redondear' | 'depreciar'

export type Numero = Rango & {
  k: 'num'
  valor: number
  // Escrito con «%»: vale el número ÷ 100, y la constante es de formato pct.
  pct: boolean
  // Usado donde va un porcentaje (el segundo argumento de PORCENTAJE_DE).
  comoPct: boolean
  negativo: boolean
  // Dónde están los dígitos, sin el signo ni el %.
  numDesde: number
  numHasta: number
  paren: boolean
}
export type Referencia = Rango & { k: 'ref'; nodo: Nodo; paren: boolean }
// Un nombre que no es un nodo: un grupo o el id de una tabla o de una columna, según el argumento de su función.
export type Clave = Rango & { k: 'clave'; texto: string; paren: boolean }

export type Campos = {
  condicion?: string
  n?: number
  tabla?: string
  sobre?: string
  columna?: string
}
export type Calculo = Rango & {
  k: 'calc'
  op: OpDeArbol
  hijos: Arbol[]
  // El porcentaje de PORCENTAJE_DE: una referencia o un número.
  pct?: Arbol
  campos: Campos
  // Viene de una función (SUMA, SI…): una cadena «a+b+c» no se le suma.
  deFuncion: boolean
  paren: boolean
}
export type Arbol = Numero | Referencia | Clave | Calculo

export type ErrorCrudo = Rango & { codigo: CodigoDeCompilacion; datos: DatosDeError }

export const error = (
  codigo: CodigoDeCompilacion,
  desde: number,
  hasta: number,
  datos: DatosDeError = {},
): ErrorCrudo => ({ codigo, desde, hasta, datos })

export const errorEn = (a: Rango, codigo: CodigoDeCompilacion, datos: DatosDeError = {}) =>
  error(codigo, a.desde, a.hasta, datos)

export const esError = (x: object): x is ErrorCrudo => 'codigo' in x

export type TipoDeArgumento = 'valor' | 'bandera' | 'nodo' | 'grupo' | 'clave' | 'entero' | 'pct'
export type EspecDeFuncion = { nombre: string; args: readonly TipoDeArgumento[] }

// Una agrupación abierta: un paréntesis suelto o la llamada a una función.
export type Marco = {
  tipo: 'grupo' | 'funcion'
  // El «(».
  abre: Token
  // La función: su nombre en mayúsculas y su tramo.
  nombre?: string
  nombreRango?: Rango
  spec?: EspecDeFuncion
  args: Arbol[]
  baseOperadores: number
  baseOperandos: number
}
