// Lo que se tipea en una celda del editor de tablas (4.23-3, C1): el texto pasa a la celda según el tipo de su columna y el locale de la empresa. Es dinero (una tabla de
// precios de referencia): un número sale sólo de `leerNumeroTipeado` (en es-BO «1.234» es 1234 y «1.5» es un aviso, nunca 1,5). Lo que no se lee no toca la fila: el
// editor lo guarda como texto crudo de la celda, con su mensaje.
import { formatearParaEditar } from '@/shared/lib/formato'
import { avisoDeNumero, leerNumeroTipeado } from '@/shared/lib/numero-tipeado'
import type { ColumnaDeTabla } from '../tabla-de-ayuda'
import type { ValorDeCelda } from './edicion'

export type CeldaTipeada = { ok: true; valor: ValorDeCelda } | { ok: false; mensaje: string }

export const MENSAJE_DE_ANIO = 'Escribe un año sin decimales, por ejemplo 2018.'

function numero(texto: string, locale: string, entero: boolean): CeldaTipeada {
  const leido = leerNumeroTipeado(texto, locale)
  if (!leido.ok) return { ok: false, mensaje: avisoDeNumero(texto, leido.motivo, locale) }
  if (entero && leido.decimales > 0) return { ok: false, mensaje: MENSAJE_DE_ANIO }
  return { ok: true, valor: leido.valor }
}

// Vacío (o sólo espacios) quita la celda. Un texto va recortado: una clave con un espacio al final no casaría en un `match` de la fórmula. Una columna de otro tipo (sólo
// por SQL) toma el número si se lee y si no, el texto: la base acepta los dos.
export function valorTipeado(columna: ColumnaDeTabla, texto: string, locale: string): CeldaTipeada {
  const limpio = texto.trim()
  if (limpio === '') return { ok: true, valor: null }
  switch (columna.tipo) {
    case 'numero':
      return numero(limpio, locale, false)
    case 'anio':
      return numero(limpio, locale, true)
    case 'texto':
      return { ok: true, valor: limpio }
    default: {
      const leido = leerNumeroTipeado(limpio, locale)
      return leido.ok ? { ok: true, valor: leido.valor } : { ok: true, valor: limpio }
    }
  }
}

// Lo que muestra el campo: un número con 15 cifras significativas (las del cast de la base), sin miles y con el decimal del locale (salir con Tab no cambia nada: el editor no aplica un texto igual a este); un booleano (sólo por SQL) como
// texto, para que `motivoDeCelda` lo marque.
export function textoParaEditar(
  _columna: ColumnaDeTabla,
  valor: ValorDeCelda | undefined,
  locale: string,
): string {
  if (valor === null || valor === undefined) return ''
  if (typeof valor === 'number') return formatearParaEditar(valor, { locale })
  return String(valor)
}
