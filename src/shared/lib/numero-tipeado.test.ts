import { describe, expect, it } from 'vitest'
import { avisoDeNumero, leerNumeroTipeado } from './numero-tipeado'

const BO = 'es-BO'
const US = 'en-US'
const valor = (texto: string, locale: string) => {
  const leido = leerNumeroTipeado(texto, locale)
  return leido.ok ? leido.valor : leido.motivo
}

describe('leerNumeroTipeado (4-25)', () => {
  it('con coma decimal (es-BO): la coma es el decimal y el punto sólo agrupa de a 3', () => {
    expect(valor('1234,5', BO)).toBe(1234.5)
    expect(valor('1,234', BO)).toBe(1.234)
    expect(valor('1.234', BO)).toBe(1234)
    expect(valor('1.234.567', BO)).toBe(1234567)
    expect(valor('1.234,5', BO)).toBe(1234.5)
    expect(valor('5,', BO)).toBe(5)
    expect(valor(',5', BO)).toBe(0.5)
    expect(valor('  -12,5 ', BO)).toBe(-12.5)
    expect(valor('+3', BO)).toBe(3)
    expect(valor('', BO)).toBeNull()
    expect(valor('   ', BO)).toBeNull()
  })

  it('con punto decimal (en-US): al revés', () => {
    expect(valor('1234.5', US)).toBe(1234.5)
    expect(valor('1.234', US)).toBe(1.234)
    expect(valor('1,234', US)).toBe(1234)
    expect(valor('1,234.5', US)).toBe(1234.5)
    expect(valor('1.5', US)).toBe(1.5)
    expect(valor('1,5', US)).toBe('separador')
  })

  it('un punto fuera de un grupo de 3 es un aviso, no un número (P7)', () => {
    for (const texto of ['1.5', '0.125', '1.23', '1.2345', '12.34.567', '1.234.5', '1,234.5']) {
      expect(valor(texto, BO), texto).toBe('separador')
    }
  })

  it('lo que no es un número no se lee', () => {
    const infinito = '9'.repeat(400)
    for (const texto of [
      'abc',
      '1e3',
      '0x10',
      'Infinity',
      '1_000',
      '1 234',
      '1,2,3',
      '--1',
      infinito,
    ]) {
      expect(valor(texto, BO), texto).toBe('no_es_numero')
    }
  })

  it('dice cuántos decimales se tipearon', () => {
    expect(leerNumeroTipeado('6,9600001', BO)).toEqual({ ok: true, valor: 6.9600001, decimales: 7 })
    expect(leerNumeroTipeado('1.234', BO)).toEqual({ ok: true, valor: 1234, decimales: 0 })
  })
})

describe('avisoDeNumero', () => {
  it('con un solo punto y ninguna coma, el ejemplo es lo tipeado con la coma', () => {
    expect(avisoDeNumero('1.5', 'separador', BO)).toBe('Usa coma para los decimales: 1,5.')
    expect(avisoDeNumero('0.125', 'separador', BO)).toBe('Usa coma para los decimales: 0,125.')
    expect(avisoDeNumero('1,5', 'separador', US)).toBe('Usa punto para los decimales: 1.5.')
  })

  it('si no hay un ejemplo obvio, el de P4 con el locale de la empresa', () => {
    expect(avisoDeNumero('1.23.4', 'separador', BO)).toBe(
      'Usa coma para los decimales y el punto sólo para los miles: 1.234,5.',
    )
    expect(avisoDeNumero('1,234.5', 'separador', BO)).toBe(
      'Usa coma para los decimales y el punto sólo para los miles: 1.234,5.',
    )
    expect(avisoDeNumero('1.234,5', 'separador', US)).toBe(
      'Usa punto para los decimales y la coma sólo para los miles: 1,234.5.',
    )
  })

  it('lo que no es un número pide uno, con el ejemplo escrito en el locale', () => {
    expect(avisoDeNumero('abc', 'no_es_numero', BO)).toBe('Escribe un número, por ejemplo 1234,5.')
    expect(avisoDeNumero('abc', 'no_es_numero', US)).toBe('Escribe un número, por ejemplo 1234.5.')
  })
})
