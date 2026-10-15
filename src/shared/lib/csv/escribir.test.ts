import { describe, expect, it } from 'vitest'
import {
  BOM_UTF8,
  celdaSegura,
  esDelimitador,
  lineaDeCsv,
  lineasDeCsv,
  numeroComoTexto,
} from './escribir'

describe('celdaSegura', () => {
  it.each([
    ["=cmd|' /C calc'!A0", "'=cmd|' /C calc'!A0"],
    ['+591 70011002', "'+591 70011002"],
    ['-2+3', "'-2+3"],
    ['@SUMA(A1)', "'@SUMA(A1)"],
    ['\tTabulación', "'\tTabulación"],
    ['\rRetorno', "'\rRetorno"],
    ['=HYPERLINK("http://x","clic")', '\'=HYPERLINK("http://x","clic")'],
  ])('antepone un apóstrofo a «%s»', (entrada, esperado) => {
    expect(celdaSegura(entrada)).toBe(esperado)
  })

  it('deja igual lo que no empieza por un carácter de fórmula', () => {
    expect(celdaSegura('Juan Pérez')).toBe('Juan Pérez')
    expect(celdaSegura('a=b')).toBe('a=b')
    expect(celdaSegura('')).toBe('')
    expect(celdaSegura('😀 =no')).toBe('😀 =no')
  })

  it('no lo repite si ya lo trae: se vuelve a proteger como cualquier otro texto', () => {
    // Una celda que ya empieza con un apóstrofo no empieza por un carácter de fórmula.
    expect(celdaSegura("'=x")).toBe("'=x")
  })
})

describe('numeroComoTexto', () => {
  it('usa la coma con «;» y el punto con «,»', () => {
    expect(numeroComoTexto(1234.5, ';')).toBe('1234,5')
    expect(numeroComoTexto(1234.5, ',')).toBe('1234.5')
  })

  it('un número negativo no es una fórmula', () => {
    expect(lineaDeCsv([-5, 3.25], ';')).toBe('-5;3,25')
  })

  it('un número que no es finito sale vacío', () => {
    expect(numeroComoTexto(Number.NaN, ';')).toBe('')
    expect(numeroComoTexto(Number.POSITIVE_INFINITY, ',')).toBe('')
  })
})

describe('lineaDeCsv', () => {
  it('separa por el delimitador', () => {
    expect(lineaDeCsv(['a', 'b', 'c'], ';')).toBe('a;b;c')
    expect(lineaDeCsv(['a', 'b', 'c'], ',')).toBe('a,b,c')
  })

  it('pone entre comillas lo que lleva el delimitador, comillas o saltos de línea', () => {
    expect(lineaDeCsv(['a;b', 'c'], ';')).toBe('"a;b";c')
    expect(lineaDeCsv(['a,b', 'c'], ';')).toBe('a,b;c')
    expect(lineaDeCsv(['a,b', 'c'], ',')).toBe('"a,b",c')
    expect(lineaDeCsv(['dijo "hola"', 'x'], ';')).toBe('"dijo ""hola""";x')
    expect(lineaDeCsv(['uno\ndos', 'x'], ';')).toBe('"uno\ndos";x')
    expect(lineaDeCsv(['uno\r\ndos'], ';')).toBe('"uno\r\ndos"')
  })

  it('escribe vacío para null y undefined', () => {
    expect(lineaDeCsv(['a', null, undefined, 'd'], ',')).toBe('a,,,d')
  })

  it('protege una fórmula también cuando va entre comillas', () => {
    expect(lineaDeCsv(['=1+1;2'], ';')).toBe('"\'=1+1;2"')
  })

  it('conserva los emojis y los acentos', () => {
    expect(lineaDeCsv(['Ñandú 🚗', 'canción'], ';')).toBe('Ñandú 🚗;canción')
  })
})

describe('lineasDeCsv', () => {
  it('termina cada línea en CRLF', () => {
    expect(
      lineasDeCsv(
        [
          ['Nombre', 'Teléfono'],
          ['Ana', '70011002'],
        ],
        ';',
      ),
    ).toBe('Nombre;Teléfono\r\nAna;70011002\r\n')
  })

  it('una lista vacía es un texto vacío', () => {
    expect(lineasDeCsv([], ',')).toBe('')
  })
})

describe('el BOM y los delimitadores', () => {
  it('el BOM es U+FEFF', () => {
    expect(BOM_UTF8).toBe('﻿')
    expect(BOM_UTF8.length).toBe(1)
  })

  it('sólo admite la coma y el punto y coma', () => {
    expect(esDelimitador(';')).toBe(true)
    expect(esDelimitador(',')).toBe(true)
    expect(esDelimitador('\t')).toBe(false)
    expect(esDelimitador(undefined)).toBe(false)
  })
})
