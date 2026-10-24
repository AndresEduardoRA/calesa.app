import { describe, expect, it } from 'vitest'
import { CLAVES_DE_PESTANA, pestanaDe } from './pestanas'

describe('las pestañas', () => {
  it('hoy son los niveles de acceso', () => {
    expect([...CLAVES_DE_PESTANA]).toEqual(['niveles'])
  })
})

describe('pestanaDe', () => {
  it('abre la que dice la URL', () => {
    expect(pestanaDe('niveles')).toBe('niveles')
  })

  it('lo que no es una pestaña abre la primera', () => {
    expect(pestanaDe(undefined)).toBe(CLAVES_DE_PESTANA[0])
    expect(pestanaDe('<script>')).toBe(CLAVES_DE_PESTANA[0])
    expect(pestanaDe('')).toBe(CLAVES_DE_PESTANA[0])
  })
})
