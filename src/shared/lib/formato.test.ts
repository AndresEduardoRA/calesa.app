import { describe, expect, it } from 'vitest'
import { formatearMonto, formatearNumero, formatearPorcentaje } from './formato'

// Intl separa símbolo y cifra con espacios duros; para comparar se normalizan.
const plano = (texto: string) => texto.replace(/[  ]/g, ' ')

describe('formatearNumero', () => {
  it('usa punto de miles y coma decimal en es-BO, sin ceros de relleno', () => {
    expect(formatearNumero(1234.5)).toBe('1.234,5')
    expect(formatearNumero(1000)).toBe('1.000')
  })

  it('redondea a los decimales pedidos', () => {
    expect(formatearNumero(1234.567)).toBe('1.234,57')
    expect(formatearNumero(1234.567, { decimales: 0 })).toBe('1.235')
  })
})

describe('formatearMonto', () => {
  it('imprime siempre dos decimales con el código o símbolo de la moneda', () => {
    expect(plano(formatearMonto(1234.5, { moneda: 'USD' }))).toBe('USD 1.234,50')
    expect(plano(formatearMonto(1234.5, { moneda: 'BOB' }))).toBe('Bs 1.234,50')
  })

  it('conserva el signo de los negativos', () => {
    expect(plano(formatearMonto(-50, { moneda: 'BOB' }))).toBe('-Bs 50,00')
  })

  it('respeta el locale y los decimales de otra empresa', () => {
    expect(plano(formatearMonto(1234.5, { moneda: 'USD', locale: 'es-CL', decimales: 0 }))).toBe(
      'US$1.235',
    )
  })
})

describe('formatearPorcentaje', () => {
  it('recibe una fracción', () => {
    expect(plano(formatearPorcentaje(0.125))).toBe('12,5%')
    expect(plano(formatearPorcentaje(0.5, { decimales: 0 }))).toBe('50%')
  })
})
