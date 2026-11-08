import { describe, expect, it } from 'vitest'
import type { ColumnaDeTabla } from '../tabla-de-ayuda'
import { textoParaEditar, valorTipeado } from './celda-tipeada'

const col = (tipo: string): ColumnaDeTabla => ({ clave: 'c', etiqueta: 'C', tipo })
const NUMERO = col('numero')
const ANIO = col('anio')
const TEXTO = col('texto')
const OTRO = col('')

describe('valorTipeado', () => {
  it('en es-BO lee el punto como miles y la coma como decimal', () => {
    expect(valorTipeado(NUMERO, '9.200,5', 'es-BO')).toEqual({ ok: true, valor: 9200.5 })
    expect(valorTipeado(NUMERO, '1.234', 'es-BO')).toEqual({ ok: true, valor: 1234 })
    expect(valorTipeado(NUMERO, '9195,5', 'es-BO')).toEqual({ ok: true, valor: 9195.5 })
  })

  it('lee los negativos y avisa con un signo solo', () => {
    expect(valorTipeado(NUMERO, '-9.200,5', 'es-BO')).toEqual({ ok: true, valor: -9200.5 })
    expect(valorTipeado(NUMERO, '-', 'es-BO')).toEqual({
      ok: false,
      mensaje: 'Escribe un número, por ejemplo 1234,5.',
    })
  })

  it('«1.5» en es-BO es un aviso del separador, no 1,5', () => {
    expect(valorTipeado(NUMERO, '1.5', 'es-BO')).toEqual({
      ok: false,
      mensaje: 'Usa coma para los decimales: 1,5.',
    })
  })

  it('en en-US el decimal es el punto', () => {
    expect(valorTipeado(NUMERO, '9,200.5', 'en-US')).toEqual({ ok: true, valor: 9200.5 })
  })

  it('lo que no es un número da el aviso de siempre', () => {
    expect(valorTipeado(NUMERO, 'abc', 'es-BO')).toEqual({
      ok: false,
      mensaje: 'Escribe un número, por ejemplo 1234,5.',
    })
  })

  it('vacío o sólo espacios quita la celda en todo tipo', () => {
    for (const columna of [NUMERO, ANIO, TEXTO, OTRO]) {
      expect(valorTipeado(columna, '', 'es-BO')).toEqual({ ok: true, valor: null })
      expect(valorTipeado(columna, '   ', 'es-BO')).toEqual({ ok: true, valor: null })
    }
  })

  it('un año va sin decimales', () => {
    expect(valorTipeado(ANIO, '2018', 'es-BO')).toEqual({ ok: true, valor: 2018 })
    expect(valorTipeado(ANIO, '2018,5', 'es-BO')).toEqual({
      ok: false,
      mensaje: 'Escribe un año sin decimales, por ejemplo 2018.',
    })
    expect(valorTipeado(ANIO, 'dos mil', 'es-BO')).toEqual({
      ok: false,
      mensaje: 'Escribe un número, por ejemplo 1234,5.',
    })
  })

  it('un texto se recorta y nunca se lee como número', () => {
    expect(valorTipeado(TEXTO, ' Sedán ', 'es-BO')).toEqual({ ok: true, valor: 'Sedán' })
    expect(valorTipeado(TEXTO, '12,5', 'es-BO')).toEqual({ ok: true, valor: '12,5' })
  })

  it('un tipo que no se conoce lee un número si puede y si no queda texto', () => {
    expect(valorTipeado(OTRO, '12,5', 'es-BO')).toEqual({ ok: true, valor: 12.5 })
    expect(valorTipeado(OTRO, ' Sedán ', 'es-BO')).toEqual({ ok: true, valor: 'Sedán' })
  })
})

describe('textoParaEditar', () => {
  it('un número con la coma del locale y sin miles', () => {
    expect(textoParaEditar(NUMERO, 9191.5, 'es-BO')).toBe('9191,5')
    expect(textoParaEditar(ANIO, 2018, 'es-BO')).toBe('2018')
    expect(textoParaEditar(NUMERO, 9191.5, 'en-US')).toBe('9191.5')
  })

  it('un texto tal cual, un booleano como texto y lo vacío en blanco', () => {
    expect(textoParaEditar(TEXTO, 'Sedán', 'es-BO')).toBe('Sedán')
    expect(textoParaEditar(OTRO, true, 'es-BO')).toBe('true')
    expect(textoParaEditar(NUMERO, null, 'es-BO')).toBe('')
    expect(textoParaEditar(NUMERO, undefined, 'es-BO')).toBe('')
  })

  it('lo que muestra se vuelve a leer igual', () => {
    for (const valor of [9200.5, -3.25, 2018, 0.1494]) {
      expect(valorTipeado(NUMERO, textoParaEditar(NUMERO, valor, 'es-BO'), 'es-BO')).toEqual({
        ok: true,
        valor,
      })
    }
  })
})
