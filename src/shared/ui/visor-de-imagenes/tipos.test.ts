import { describe, expect, it } from 'vitest'
import { contador, indiceDeLaUrl, vecina } from './tipos'

describe('visor de imágenes', () => {
  it('la vecina da la vuelta en los dos sentidos', () => {
    expect(vecina(0, 3, -1)).toBe(2)
    expect(vecina(2, 3, 1)).toBe(0)
    expect(vecina(1, 3, 1)).toBe(2)
    expect(vecina(0, 0, 1)).toBe(0)
  })

  it('?foto= se vuelve un índice válido y lo que no se entiende es la primera', () => {
    expect(indiceDeLaUrl('3', 12)).toBe(2)
    expect(indiceDeLaUrl('40', 12)).toBe(11)
    expect(indiceDeLaUrl('cero', 12)).toBe(0)
    expect(indiceDeLaUrl(null, 12)).toBe(0)
    expect(indiceDeLaUrl('2', 0)).toBe(0)
  })

  it('el contador dice la posición y el total', () => {
    expect(contador(2, 12)).toBe('3 de 12')
  })
})
