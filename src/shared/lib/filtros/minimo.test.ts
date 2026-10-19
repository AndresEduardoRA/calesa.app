import { describe, expect, it } from 'vitest'
import { cumpleElMinimo, type MinimoDeBusqueda } from './minimo'

const MINIMO: MinimoDeBusqueda = {
  letras: 3,
  numerosLibres: true,
  aviso: 'Escribe al menos 3 letras',
}

describe('cumpleElMinimo', () => {
  it('pide un tramo de 3 letras o dígitos seguidos', () => {
    for (const texto of [
      'Ana',
      'ana ro',
      'Ñu',
      'a b c',
      'a_b',
      'x',
      'zq',
      '%',
      '\\',
      '  ',
      '#',
      '',
    ]) {
      expect(cumpleElMinimo(texto, MINIMO), JSON.stringify(texto)).toBe(
        texto === 'ana ro' || texto === 'Ana',
      )
    }
  })

  it('cuenta tildes, eñes y mayúsculas como letras', () => {
    expect(cumpleElMinimo('ñandú', MINIMO)).toBe(true)
    expect(cumpleElMinimo('ÁLAMO', MINIMO)).toBe(true)
    expect(cumpleElMinimo('Ñu', MINIMO)).toBe(false)
    expect(cumpleElMinimo('á é', MINIMO)).toBe(false)
  })

  it('un número vale con 1 o 2 dígitos; con «#» o sin él', () => {
    expect(cumpleElMinimo('5', MINIMO)).toBe(true)
    expect(cumpleElMinimo('12', MINIMO)).toBe(true)
    expect(cumpleElMinimo('#5', MINIMO)).toBe(true)
    expect(cumpleElMinimo('# 5', MINIMO)).toBe(true)
    expect(cumpleElMinimo('5 a', MINIMO)).toBe(false)
    expect(cumpleElMinimo('#ab', MINIMO)).toBe(false)
  })

  it('sin números libres, 12 no alcanza', () => {
    expect(cumpleElMinimo('12', { ...MINIMO, numerosLibres: false })).toBe(false)
    expect(cumpleElMinimo('123', { ...MINIMO, numerosLibres: false })).toBe(true)
  })

  it('un número de más de 15 dígitos se trata como texto: alcanza por su tramo', () => {
    expect(cumpleElMinimo('1234567890123456', MINIMO)).toBe(true)
  })

  // La misma lista que `busqueda-volumen.sql` compara con `[[:alnum:]]{3}` de Postgres (la base real, con ICU): si una regla cambia, cambian las dos.
  it('coincide con el tramo de 3 letras o dígitos de la base', () => {
    const SOLO_TRAMO: MinimoDeBusqueda = { ...MINIMO, numerosLibres: false }
    const casos: [string, boolean][] = [
      ['Ana', true],
      ['ana ro', true],
      ['Ñu', false],
      ['a b c', false],
      ['a_b', false],
      ['x', false],
      ['zq', false],
      ['%', false],
      ['\\', false],
      ['ñandú', true],
      ['ÁLAMO', true],
      ['á é', false],
      ['Ñuñ', true],
      ['123', true],
      ['12', false],
      ['ÿöü', true],
      ['日本語', true],
      ['²³¹', false],
      ['éé', false],
      ['a-b-c', false],
      ['٣٤٥', true],
    ]
    for (const [texto, esperado] of casos) {
      expect(cumpleElMinimo(texto, SOLO_TRAMO), JSON.stringify(texto)).toBe(esperado)
    }
  })
})
