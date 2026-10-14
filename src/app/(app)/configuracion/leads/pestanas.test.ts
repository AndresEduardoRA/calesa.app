import { describe, expect, it } from 'vitest'
import { CLAVES_DE_PESTANA, pestanaDe } from './pestanas'

describe('pestanaDe', () => {
  it('abre la que dice la URL', () => {
    expect(pestanaDe('campos')).toBe('campos')
  })

  it('lo que no es una pestaña abre la primera', () => {
    expect(pestanaDe(undefined)).toBe(CLAVES_DE_PESTANA[0])
    expect(pestanaDe('<script>')).toBe(CLAVES_DE_PESTANA[0])
  })
})
