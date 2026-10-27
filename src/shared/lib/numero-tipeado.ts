// El lector de un número que la persona tipea (4-25, `docs/PLAN.md`): uno solo para la XCell, los campos numéricos, el tipo de cambio, el
// precio de la vitrina y el monto de una oportunidad. Con el locale de la empresa, el decimal es su separador decimal y el otro (de la coma y
// el punto) sólo agrupa de a 3: en es-BO «1.234» es 1234 y «1.5» es un aviso, no 1,5 (P7 del 4.13-3b). «1e3», «0x10» e «Infinity» no son
// números. Sin I/O ni React: lo usan igual el navegador y el servidor.
import { formatearParaEditar } from './formato'

export type MotivoDeNumero = 'separador' | 'no_es_numero'

export type NumeroTipeado =
  { ok: true; valor: number | null; decimales: number } | { ok: false; motivo: MotivoDeNumero }

type Separadores = { decimal: ',' | '.'; miles: ',' | '.' }

// El decimal del locale (el de `formatearParaEditar`, que cae al de fábrica con un locale inválido); si no es la coma ni el punto, la coma.
function separadoresDe(locale: string): Separadores {
  const decimal = formatearParaEditar(1.5, { locale }).charAt(1) === '.' ? '.' : ','
  return { decimal, miles: decimal === ',' ? '.' : ',' }
}

const escapar = (c: string) => (c === '.' ? '\\.' : c)

// Dos formas, con un signo opcional delante: dígitos con su decimal, o miles en grupos de 3 (el primero de 1 a 3 dígitos sin un 0 adelante).
// Ninguna retrocede: el lector es lineal en el largo del texto.
function formas({ decimal, miles }: Separadores) {
  const d = escapar(decimal)
  const m = escapar(miles)
  return {
    simple: new RegExp(`^(\\d*)(?:${d}(\\d*))?$`),
    agrupada: new RegExp(`^([1-9]\\d{0,2}(?:${m}\\d{3})+)(?:${d}(\\d*))?$`),
    soloSeparadores: new RegExp(`^[\\d${d}${m}]+$`),
  }
}

const NO_ES_NUMERO: NumeroTipeado = { ok: false, motivo: 'no_es_numero' }

// Lo que cumple una de las dos formas, como número; nulo si no cumple ninguna.
function comoNumero(cuerpo: string, signo: string, separadores: Separadores): NumeroTipeado | null {
  const { simple, agrupada } = formas(separadores)
  const encontrado = agrupada.exec(cuerpo) ?? simple.exec(cuerpo)
  if (!encontrado) {
    return null
  }
  const entero = (encontrado[1] ?? '').split(separadores.miles).join('')
  const fraccion = encontrado[2] ?? ''
  if (entero + fraccion === '') {
    return null
  }
  const valor = Number(`${signo}${entero || '0'}.${fraccion || '0'}`)
  return Number.isFinite(valor) ? { ok: true, valor, decimales: fraccion.length } : NO_ES_NUMERO
}

// Sólo dígitos y separadores, a lo sumo un decimal y algún separador de miles fuera de un grupo de 3: un aviso (P7). Lo demás no es un número.
function motivoDe(cuerpo: string, separadores: Separadores): NumeroTipeado {
  const decimales = cuerpo.split(separadores.decimal).length - 1
  const separador =
    formas(separadores).soloSeparadores.test(cuerpo) &&
    decimales <= 1 &&
    cuerpo.includes(separadores.miles)
  return separador ? { ok: false, motivo: 'separador' } : NO_ES_NUMERO
}

export function leerNumeroTipeado(texto: string, locale: string): NumeroTipeado {
  const limpio = texto.trim()
  if (limpio === '') {
    return { ok: true, valor: null, decimales: 0 }
  }
  const separadores = separadoresDe(locale)
  const signo = limpio.startsWith('-') ? '-' : ''
  const cuerpo = /^[+-]/.test(limpio) ? limpio.slice(1) : limpio
  return comoNumero(cuerpo, signo, separadores) ?? motivoDe(cuerpo, separadores)
}

const NOMBRE = { ',': 'coma', '.': 'punto' } as const

// El aviso de lo que no se leyó. `separador`: con un solo separador de miles y ningún decimal, lo tipeado con el decimal («Usa coma para
// los decimales: 1,5.»); si no, el ejemplo de P4 del 4.13-3c. `no_es_numero`: el texto de siempre, con el ejemplo escrito en el locale.
export function avisoDeNumero(texto: string, motivo: MotivoDeNumero, locale: string): string {
  const { decimal, miles } = separadoresDe(locale)
  if (motivo === 'no_es_numero') {
    return `Escribe un número, por ejemplo ${formatearParaEditar(1234.5, { locale })}.`
  }
  const limpio = texto.trim()
  const unoSolo = limpio.split(miles).length === 2 && !limpio.includes(decimal)
  if (unoSolo) {
    return `Usa ${NOMBRE[decimal]} para los decimales: ${limpio.replace(miles, decimal)}.`
  }
  const articulo = miles === ',' ? 'la' : 'el'
  return `Usa ${NOMBRE[decimal]} para los decimales y ${articulo} ${NOMBRE[miles]} sólo para los miles: 1${miles}234${decimal}5.`
}
