import { describe, expect, it } from 'vitest'
import { interpretarBusqueda } from './busqueda-de-leads'

describe('interpretarBusqueda', () => {
  it('un número, con o sin #, busca el número y el texto; el resto, sólo el nombre', () => {
    expect(interpretarBusqueda(' 124 ')).toEqual({ texto: '124', numero: 124, soloNumero: false })
    expect(interpretarBusqueda('Ana 124')).toEqual({
      texto: 'Ana 124',
      numero: null,
      soloNumero: false,
    })
    expect(interpretarBusqueda('59170000001')).toEqual({
      texto: '59170000001',
      numero: 59170000001,
      soloNumero: false,
    })
  })

  it('«#124» busca sólo el número; un # delante de un texto no', () => {
    expect(interpretarBusqueda('#124')).toEqual({ texto: '124', numero: 124, soloNumero: true })
    expect(interpretarBusqueda('  #124 ')?.soloNumero).toBe(true)
    expect(interpretarBusqueda('#Ana')).toEqual({ texto: 'Ana', numero: null, soloNumero: false })
  })

  it('vacío no busca; un número demasiado largo no se trata como número', () => {
    expect(interpretarBusqueda('  ')).toBeNull()
    expect(interpretarBusqueda('#')).toBeNull()
    expect(interpretarBusqueda('1234567890123456')?.numero).toBeNull()
  })

  it('lo que escribió la persona viaja como texto, sin tocar (el saneado es de infra)', () => {
    expect(interpretarBusqueda('Ana 50%_, "x"')).toEqual({
      texto: 'Ana 50%_, "x"',
      numero: null,
      soloNumero: false,
    })
  })

  // 5a-8: el nombre se busca con 3 letras o dígitos seguidos; menos no busca ni recorre nada.
  it('sin un tramo de 3 letras o dígitos seguidos no busca por nombre', () => {
    for (const texto of [
      'x',
      'zq',
      'Al',
      'Ñu',
      'a_b',
      '%',
      '\\',
      '_',
      'a b c',
      '50%_, "x"',
      '#ab',
      '*',
    ]) {
      expect(interpretarBusqueda(texto), JSON.stringify(texto)).toBeNull()
    }
  })

  it('con tramo busca por nombre, también con tildes, eñes y mayúsculas', () => {
    for (const texto of ['Ana', 'ñandú', 'ÁLAMO', 'Gómez', 'ab cde', 'a%b cde']) {
      expect(interpretarBusqueda(texto)?.soloNumero, texto).toBe(false)
      expect(interpretarBusqueda(texto)?.texto, texto).toBe(texto)
    }
  })

  it('un número de 1 o 2 dígitos busca sólo el número, con o sin #', () => {
    expect(interpretarBusqueda('5')).toEqual({ texto: '5', numero: 5, soloNumero: true })
    expect(interpretarBusqueda('12')).toEqual({ texto: '12', numero: 12, soloNumero: true })
    expect(interpretarBusqueda('#5')).toEqual({ texto: '5', numero: 5, soloNumero: true })
    expect(interpretarBusqueda('123')).toEqual({ texto: '123', numero: 123, soloNumero: false })
  })
})
