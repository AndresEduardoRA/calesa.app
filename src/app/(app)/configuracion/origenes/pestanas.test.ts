import { describe, expect, it } from 'vitest'
import { PESTANAS, pestanaDe } from './pestanas'

describe('pestanaDe', () => {
  it('abre la que viene en la URL', () => {
    for (const pestana of PESTANAS) {
      expect(pestanaDe(pestana.clave)).toBe(pestana.clave)
    }
  })

  it('lo que no es una pestaña abre «datos»', () => {
    expect(pestanaDe(undefined)).toBe('datos')
    expect(pestanaDe('<script>')).toBe('datos')
  })
})
