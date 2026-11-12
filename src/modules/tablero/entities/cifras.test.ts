import { describe, expect, it } from 'vitest'
import { formatearPorcentaje } from '@/shared/lib/formato'
import { textoDeConteo, textoDeTasa } from './cifras'

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
