// Escribir un CSV para Excel. Sin módulos y sin I/O: lo usan la exportación de leads y, en la Fase 9,
// `datos`.
//
// - UTF-8 con BOM, para que Excel no lea el archivo como Latin-1.
// - Comillas según RFC 4180: una celda con el delimitador, comillas o un salto de línea va entre
//   comillas y las comillas se duplican. Las líneas terminan en CRLF.
// - **Inyección de fórmulas:** una celda de texto que empieza por `=`, `+`, `-`, `@`, tabulación o
//   retorno se escribe con un apóstrofo delante, para que Excel no la ejecute. Un número no es texto:
//   `-5` sale como `-5`, sin apóstrofo.

export const DELIMITADORES = [';', ','] as const
export type Delimitador = (typeof DELIMITADORES)[number]

// Una celda: texto, un número (se escribe con el decimal que lee Excel con ese delimitador) o vacía.
export type Celda = string | number | null | undefined

export const BOM_UTF8 = '﻿'

const COMIENZA_UNA_FORMULA = /^[=+\-@\t\r]/

export function esDelimitador(valor: unknown): valor is Delimitador {
  return valor === ';' || valor === ','
}

// El texto de una celda con el apóstrofo que lo vuelve inofensivo, si hace falta.
export function celdaSegura(texto: string): string {
  return COMIENZA_UNA_FORMULA.test(texto) ? `'${texto}` : texto
}

// Con «;» (Excel en español) el decimal es la coma; con «,» es el punto.
export function numeroComoTexto(valor: number, delimitador: Delimitador): string {
  if (!Number.isFinite(valor)) {
    return ''
  }
  const texto = String(valor)
  return delimitador === ';' ? texto.replace('.', ',') : texto
}

function textoDeLaCelda(celda: Celda, delimitador: Delimitador): string {
  if (celda === null || celda === undefined) {
    return ''
  }
  return typeof celda === 'number' ? numeroComoTexto(celda, delimitador) : celdaSegura(celda)
}

function entreComillasSiHaceFalta(texto: string, delimitador: Delimitador): string {
  return texto.includes(delimitador) || /["\r\n]/.test(texto)
    ? `"${texto.replaceAll('"', '""')}"`
    : texto
}

export function lineaDeCsv(celdas: readonly Celda[], delimitador: Delimitador): string {
  return celdas
    .map((celda) => entreComillasSiHaceFalta(textoDeLaCelda(celda, delimitador), delimitador))
    .join(delimitador)
}

// Varias líneas (cada una termina en CRLF). Sin BOM: lo pone quien arma el archivo, una sola vez.
export function lineasDeCsv(
  filas: readonly (readonly Celda[])[],
  delimitador: Delimitador,
): string {
  return filas.map((fila) => `${lineaDeCsv(fila, delimitador)}\r\n`).join('')
}
