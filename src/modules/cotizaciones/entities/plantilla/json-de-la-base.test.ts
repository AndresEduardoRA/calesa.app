import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { juegoDePlantilla, RUTA_DEL_JUEGO } from './juego-de-plantilla.soporte'
import {
  btrim,
  bytesComoJsonb,
  caracteres,
  clavesEnOrdenC,
  compararComoC,
  ES_ID,
  esObjetoJsonb,
  tipoJsonb,
} from './json-de-la-base'

const ruta = RUTA_DEL_JUEGO
const juego = juegoDePlantilla(readFileSync(new URL(ruta, import.meta.url), 'utf8'))

describe('bytesComoJsonb', () => {
  // Los mismos `octetos` que la base comprueba con `octet_length(valor::text)` (T1 de plantilla-validar.sql).
  it.each(juego.octetos)('$valor: $bytes bytes', ({ valor, bytes }) => {
    expect(bytesComoJsonb(valor)).toBe(bytes)
  })

  it('el orden de las claves no cambia la cuenta', () => {
    expect(bytesComoJsonb({ b: 1, a: [true] })).toBe(bytesComoJsonb({ a: [true], b: 1 }))
  })
})

describe('caracteres', () => {
  it('cuenta code points, como char_length', () => {
    expect(caracteres('Garantía')).toBe(8)
    expect(caracteres('🚗🚗')).toBe(2)
    // Un emoji con tono de piel son dos code points (no un grafema).
    expect(caracteres('👍🏽')).toBe(2)
    expect(caracteres('')).toBe(0)
  })
})

describe('btrim', () => {
  it('quita sólo espacios de los bordes', () => {
    expect(btrim('  a b  ')).toBe('a b')
    expect(btrim('   ')).toBe('')
    expect(btrim('\t')).toBe('\t')
    expect(btrim(' ')).toBe(' ')
    expect(btrim('\n a')).toBe('\n a')
  })
})

describe('compararComoC', () => {
  const ordenar = (xs: string[]) => [...xs].sort(compararComoC)

  it('ordena por code point, como `collate "C"`', () => {
    expect(ordenar(['a', 'Z'])).toEqual(['Z', 'a'])
    // Por unidades UTF-16 «🚗» (0xD83D…) iría antes que «Ａ» (0xFF21).
    expect(ordenar(['🚗', 'Ａ'])).toEqual(['Ａ', '🚗'])
    expect(ordenar(['ab', 'a', 'b'])).toEqual(['a', 'ab', 'b'])
    expect(compararComoC('x', 'x')).toBe(0)
  })
})

describe('tipoJsonb', () => {
  it('distingue arreglo, objeto, null y ausente', () => {
    expect(tipoJsonb([])).toBe('array')
    expect(tipoJsonb({})).toBe('object')
    expect(tipoJsonb(null)).toBe('null')
    expect(tipoJsonb(undefined)).toBeNull()
    expect(tipoJsonb('x')).toBe('string')
    expect(tipoJsonb(1)).toBe('number')
    expect(tipoJsonb(false)).toBe('boolean')
  })
})

describe('ES_ID', () => {
  it('es la forma de un id de la base, hasta el final del texto', () => {
    expect(ES_ID.test('remate_2')).toBe(true)
    expect(ES_ID.test('a'.repeat(41))).toBe(true)
    expect(ES_ID.test('a'.repeat(42))).toBe(false)
    expect(ES_ID.test('Remate')).toBe(false)
    expect(ES_ID.test('remate\n')).toBe(false)
    expect(ES_ID.test('__proto__')).toBe(false)
  })
})

describe('esObjetoJsonb', () => {
  it('sólo un objeto: ni arreglo ni null', () => {
    expect(esObjetoJsonb({})).toBe(true)
    expect(esObjetoJsonb([])).toBe(false)
    expect(esObjetoJsonb(null)).toBe(false)
    expect(esObjetoJsonb(undefined)).toBe(false)
  })
})

describe('clavesEnOrdenC', () => {
  it('las claves propias en orden C; ausente, ninguna', () => {
    expect(clavesEnOrdenC({ b: 1, a: 1, Z: 1 })).toEqual(['Z', 'a', 'b'])
    expect(
      clavesEnOrdenC(JSON.parse('{"__proto__": 1, "constructor": 2}') as Record<string, unknown>),
    ).toEqual(['__proto__', 'constructor'])
    expect(clavesEnOrdenC(undefined)).toEqual([])
  })
})
