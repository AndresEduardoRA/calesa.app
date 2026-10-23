import { describe, expect, it } from 'vitest'
import { redondear } from './redondeo'

// `redondear(x, n)` es `round(x::numeric, n)::float8` de Postgres: el doble a 15 cifras (como `%.15g`), y después
// mitad lejos de cero. Cada número esperado es el que da Postgres.
describe('redondear', () => {
  it('lee el doble con 15 cifras: 2,675 y 1,005 suben, aunque en binario estén por debajo', () => {
    expect(redondear(2.675, 2)).toBe(2.68)
    expect(redondear(1.005, 2)).toBe(1.01)
    expect(redondear(0.1 + 0.2, 6)).toBe(0.3)
  })

  it('la mitad se aleja de cero, también en los negativos', () => {
    expect([redondear(0.5, 0), redondear(1.5, 0), redondear(2.5, 0)]).toEqual([1, 2, 3])
    expect([redondear(-2.5, 0), redondear(-2.675, 2), redondear(-1.005, 2)]).toEqual([
      -3, -2.68, -1.01,
    ])
  })

  it('un empate en la cifra 16 va al par, como glibc (toExponential iría para arriba)', () => {
    expect(redondear(100000000.0078125, 6)).toBe(100000000.007812)
  })

  it('no devuelve −0', () => {
    expect(Object.is(redondear(-0.001, 2), 0)).toBe(true)
    expect(Object.is(redondear(-0, 3), 0)).toBe(true)
  })

  it('lo que ya tiene menos decimales queda en sus 15 cifras', () => {
    expect(redondear(123456789.123456789, 6)).toBe(123456789.123457)
    expect(redondear(1e300, 6)).toBe(1e300)
    expect(redondear(5e-324, 6)).toBe(0)
    expect(redondear(16826.354, 2)).toBe(16826.35)
    expect(redondear(999.9999999999999, 2)).toBe(1000)
  })
})
