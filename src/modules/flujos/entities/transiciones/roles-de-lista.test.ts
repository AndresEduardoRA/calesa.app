import { describe, expect, it } from 'vitest'
import { alternarRol, firmaDeRoles, mismosRoles } from './roles-de-lista'

describe('alternarRol', () => {
  it('agrega el rol marcado y quita el desmarcado', () => {
    expect(alternarRol([], 'a', true)).toEqual(['a'])
    expect(alternarRol(['a', 'b'], 'a', false)).toEqual(['b'])
  })

  it('no repite un rol ya marcado', () => {
    expect(alternarRol(['a'], 'a', true)).toEqual(['a'])
  })

  it('conserva un id que no está entre los roles visibles', () => {
    expect(alternarRol(['oculto', 'a'], 'a', false)).toEqual(['oculto'])
    expect(alternarRol(['oculto'], 'b', true)).toEqual(['oculto', 'b'])
  })
})

describe('mismosRoles y firmaDeRoles', () => {
  it('ignoran el orden y los repetidos', () => {
    expect(mismosRoles(['a', 'b'], ['b', 'a', 'a'])).toBe(true)
    expect(firmaDeRoles(['b', 'a', 'b'])).toBe('a,b')
  })

  it('distinguen listas distintas y la vacía', () => {
    expect(mismosRoles(['a'], ['a', 'b'])).toBe(false)
    expect(mismosRoles([], [])).toBe(true)
    expect(mismosRoles([], ['a'])).toBe(false)
  })
})
