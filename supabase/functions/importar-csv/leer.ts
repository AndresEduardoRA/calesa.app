// Leer un CSV que subió una persona. Sin módulos: lo usa la importación de leads y, en la Fase 9, `datos`.
// Es todo texto: nada se ejecuta ni se interpreta (una celda `=1+1` es el texto «=1+1»).
//
// - UTF-8, con o sin BOM. Lo que no es UTF-8 válido (un Latin-1 de Excel, un binario) se rechaza
//   diciendo cómo guardarlo.
// - El separador (coma, punto y coma o tabulación) lo detecta `papaparse`; si las filas no traen todas
//   la misma cantidad de columnas que el encabezado, se dice la fila (separadores mezclados).
// - Los límites los pone quien llama: archivo, filas, columnas y largo de una celda.
import Papa from 'papaparse'

export type LimitesDeLectura = {
  bytes: number
  filas: number
  columnas: number
  celda: number
}

export type DelimitadorLeido = ',' | ';' | '\t'

export type ErrorDeLectura =
  | { tipo: 'vacio' }
  | { tipo: 'no_utf8' }
  | { tipo: 'binario' }
  | { tipo: 'grande' }
  | { tipo: 'sin_filas' }
  | { tipo: 'demasiadas_filas'; filas: number }
  | { tipo: 'demasiadas_columnas'; columnas: number }
  | { tipo: 'celda_larga'; fila: number; columna: number }
  | { tipo: 'comillas'; fila: number }
  | { tipo: 'columnas_irregulares'; fila: number }

export type ArchivoLeido = {
  ok: true
  delimitador: DelimitadorLeido
  // Recortados. La fila 1 del archivo son los encabezados; `filas[0]` es la fila 2.
  encabezados: string[]
  filas: string[][]
}

export type LecturaDeCsv = ArchivoLeido | { ok: false; error: ErrorDeLectura }

const BOM = '﻿'

const falla = (error: ErrorDeLectura): LecturaDeCsv => ({ ok: false, error })

// Los bytes del archivo como texto. Un UTF-8 inválido o un byte nulo no es un CSV.
export function textoDeBytes(
  bytes: ArrayBuffer | Uint8Array,
  limites: Pick<LimitesDeLectura, 'bytes'>,
): { ok: true; texto: string } | { ok: false; error: ErrorDeLectura } {
  const largo = bytes.byteLength
  if (largo === 0) {
    return { ok: false, error: { tipo: 'vacio' } }
  }
  if (largo > limites.bytes) {
    return { ok: false, error: { tipo: 'grande' } }
  }
  let texto: string
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return { ok: false, error: { tipo: 'no_utf8' } }
  }
  if (texto.includes('\u0000')) {
    return { ok: false, error: { tipo: 'binario' } }
  }
  return { ok: true, texto: texto.startsWith(BOM) ? texto.slice(1) : texto }
}

// Quita las celdas vacías que sobran al final de una fila (Excel las deja al exportar).
function sinVaciasDeSobra(fila: string[], columnas: number): string[] {
  let largo = fila.length
  while (largo > columnas && fila[largo - 1]?.trim() === '') {
    largo -= 1
  }
  return fila.slice(0, largo)
}

function primeraCeldaLarga(
  filas: readonly (readonly string[])[],
  maximo: number,
): { fila: number; columna: number } | null {
  for (const [i, fila] of filas.entries()) {
    const columna = fila.findIndex((celda) => celda.length > maximo)
    if (columna >= 0) {
      // La fila del archivo: la 1 son los encabezados.
      return { fila: i + 1, columna: columna + 1 }
    }
  }
  return null
}

type Parseado = { encabezados: string[]; filas: string[][]; crudos: string[] }

// Los encabezados y las filas del texto, ya con la forma validada contra los límites.
function validarForma(
  [crudos, ...resto]: string[][],
  limites: LimitesDeLectura,
): Parseado | ErrorDeLectura {
  if (!crudos) {
    return { tipo: 'vacio' }
  }
  const encabezados = crudos.map((celda) => celda.trim())
  while (encabezados.length > 1 && encabezados.at(-1) === '') {
    encabezados.pop()
  }
  if (encabezados.length > limites.columnas) {
    return { tipo: 'demasiadas_columnas', columnas: encabezados.length }
  }
  if (resto.length === 0) {
    return { tipo: 'sin_filas' }
  }
  if (resto.length > limites.filas) {
    return { tipo: 'demasiadas_filas', filas: resto.length }
  }
  const filas = resto.map((fila) => sinVaciasDeSobra(fila, encabezados.length))
  const irregular = filas.findIndex((fila) => fila.length !== encabezados.length)
  if (irregular >= 0) {
    return { tipo: 'columnas_irregulares', fila: irregular + 2 }
  }
  return { encabezados, filas, crudos }
}

export function leerCsv(texto: string, limites: LimitesDeLectura): LecturaDeCsv {
  if (texto.trim() === '') {
    return falla({ tipo: 'vacio' })
  }
  const parseado = Papa.parse<string[]>(texto, {
    delimitersToGuess: [',', ';', '\t'],
    skipEmptyLines: 'greedy',
    header: false,
    dynamicTyping: false,
  })
  const sinCerrar = parseado.errors.find((e) => e.type === 'Quotes' && e.code === 'MissingQuotes')
  if (sinCerrar) {
    return falla({ tipo: 'comillas', fila: (sinCerrar.row ?? 0) + 1 })
  }
  const forma = validarForma(parseado.data, limites)
  if ('tipo' in forma) {
    return falla(forma)
  }
  const larga = primeraCeldaLarga([forma.crudos, ...forma.filas], limites.celda)
  if (larga) {
    return falla({ tipo: 'celda_larga', ...larga })
  }
  const delimitador = parseado.meta.delimiter
  return {
    ok: true,
    delimitador: delimitador === ';' || delimitador === '\t' ? delimitador : ',',
    encabezados: forma.encabezados,
    filas: forma.filas,
  }
}

const GUARDARLO =
  'Guárdalo como «CSV UTF-8» desde tu planilla (en Excel: Guardar como › CSV UTF-8) y vuelve a subirlo.'

// Lo que se le dice a la persona.
export function mensajeDeLectura(error: ErrorDeLectura, limites: LimitesDeLectura): string {
  switch (error.tipo) {
    case 'vacio':
      return 'El archivo está vacío.'
    case 'no_utf8':
      return `El archivo no está en UTF-8, o no es un CSV. ${GUARDARLO}`
    case 'binario':
      return `El archivo no es un CSV de texto. ${GUARDARLO}`
    case 'grande':
      return `El archivo pesa más de ${String(Math.round(limites.bytes / (1024 * 1024)))} MB. Divídelo en varios archivos.`
    case 'sin_filas':
      return 'El archivo tiene los encabezados pero ninguna fila con datos.'
    case 'demasiadas_filas':
      return `El archivo tiene ${String(error.filas)} filas y se admiten hasta ${String(limites.filas)}. Divídelo en varios archivos.`
    case 'demasiadas_columnas':
      return `El archivo tiene ${String(error.columnas)} columnas y se admiten hasta ${String(limites.columnas)}. Quita las que no necesitas.`
    case 'celda_larga':
      return `La celda de la fila ${String(error.fila)}, columna ${String(error.columna)}, tiene más de ${String(limites.celda)} caracteres.`
    case 'comillas':
      return `Hay unas comillas sin cerrar en la fila ${String(error.fila)}. Revisa esa fila y vuelve a subir el archivo.`
    case 'columnas_irregulares':
      return `La fila ${String(error.fila)} no tiene la misma cantidad de columnas que los encabezados. Revisa que todas usen el mismo separador.`
  }
}
