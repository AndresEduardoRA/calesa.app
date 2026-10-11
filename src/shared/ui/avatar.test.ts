import { describe, expect, it } from 'vitest'
import { iniciales } from './avatar'

describe('iniciales', () => {
  it('toma la primera y la última palabra', () => {
    expect(iniciales('Ana María Quispe')).toBe('AQ')
    expect(iniciales('  rosa   mamani ')).toBe('RM')
  })

  it('con una sola palabra da una inicial', () => {
    expect(iniciales('Sofía')).toBe('S')
  })

  it('sin nombre da un signo neutro', () => {
    expect(iniciales('')).toBe('·')
    expect(iniciales('   ')).toBe('·')
  })
})
