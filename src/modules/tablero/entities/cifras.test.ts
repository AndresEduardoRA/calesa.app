import { describe, expect, it } from 'vitest'
import { formatearNumero, formatearPorcentaje } from '@/shared/lib/formato'
import { textoDeConteo, textoDeSinVenta, textoDeTasa, textoDeVehiculosDelMargen } from './cifras'

describe('textoDeTasa', () => {
  it('una tasa nula es «Sin datos», nunca «0 %»', () => {
    const texto = textoDeTasa(null)
    expect(texto).toBe('Sin datos')
    expect(texto).not.toMatch(/0\s?%/)
  })

  it('una tasa de cero con leads es un dato: «0%»', () => {
    expect(textoDeTasa(0)).toBe(formatearPorcentaje(0))
    expect(textoDeTasa(0)).toMatch(/0\s?%/)
  })

  it('una fracción se escribe como porcentaje', () => {
    expect(textoDeTasa(0.1234)).toBe(formatearPorcentaje(0.1234))
  })
})

describe('textoDeConteo', () => {
  it('un conteo entero', () => {
    expect(textoDeConteo(0)).toBe('0')
    expect(textoDeConteo(12)).toBe('12')
  })
})

describe('textoDeSinVenta', () => {
  it('sin vehículos no dice nada; uno en singular; muchos con su número', () => {
    expect(textoDeSinVenta(0)).toBeNull()
    expect(textoDeSinVenta(1)).toBe('1 vehículo sin venta registrada')
    expect(textoDeSinVenta(1200)).toBe(`${formatearNumero(1200)} vehículos sin venta registrada`)
  })
})

describe('textoDeVehiculosDelMargen', () => {
  it('dice que cada vehículo cuenta por su último pago confirmado', () => {
    expect(textoDeVehiculosDelMargen(1)).toBe('1 vehículo por su último pago confirmado')
    expect(textoDeVehiculosDelMargen(3)).toBe('3 vehículos por su último pago confirmado')
  })
})
