import { describe, expect, it } from 'vitest'
import { zonaDelPatio } from './zona-del-patio'

describe('zonaDelPatio', () => {
  it('reconoce el estado en las formas en que llega', () => {
    expect(zonaDelPatio('TX')).toBe('America/Chicago')
    expect(zonaDelPatio('ca')).toBe('America/Los_Angeles')
    expect(zonaDelPatio('NY - LONG ISLAND')).toBe('America/New_York')
    expect(zonaDelPatio('Phoenix, AZ')).toBe('America/Phoenix')
    expect(zonaDelPatio('ON')).toBe('America/Toronto')
  })

  it('sin un estado conocido no inventa una zona', () => {
    expect(zonaDelPatio('')).toBeNull()
    expect(zonaDelPatio('ZZ')).toBeNull()
    expect(zonaDelPatio(null)).toBeNull()
    expect(zonaDelPatio(42)).toBeNull()
  })

  it('cada zona del catálogo existe para Intl', () => {
    for (const estado of ['TX', 'HI', 'AK', 'IN', 'ID', 'NL', 'SK', 'PR']) {
      const zona = zonaDelPatio(estado) ?? ''
      expect(() => new Intl.DateTimeFormat('es', { timeZone: zona })).not.toThrow()
    }
  })
})
