import { describe, expect, it } from 'vitest'
import { PESTANAS, pestanaDe } from './pestanas'

describe('pestanaDe', () => {
  it('reconoce cada pestaña por su clave', () => {
    for (const pestana of PESTANAS) {
      expect(pestanaDe(pestana.clave)).toBe(pestana.clave)
    }
  })

  it('sin parámetro, o con uno que no existe, abre la primera', () => {
    expect(pestanaDe(undefined)).toBe('empresa')
    expect(pestanaDe('otra')).toBe('empresa')
  })
})
