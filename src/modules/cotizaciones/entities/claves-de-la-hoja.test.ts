import { describe, expect, it } from 'vitest'
import { claveDeLaHoja, claveDelBorrador, claveDelPendiente } from './claves-de-la-hoja'

describe('claveDeLaHoja', () => {
  it('cambia con la fórmula y con el vehículo', () => {
    const base = claveDeLaHoja({ formulaId: 'f', vehiculoId: null })
    expect(claveDeLaHoja({ formulaId: 'g', vehiculoId: null })).not.toBe(base)
    expect(claveDeLaHoja({ formulaId: 'f', vehiculoId: 'v' })).not.toBe(base)
    expect(claveDeLaHoja({ formulaId: 'f', vehiculoId: null })).toBe(base)
  })
})

describe('las claves de la pestaña', () => {
  const combinaciones = [
    ['o1', 'l1', null],
    ['o2', 'l1', null],
    ['o1', 'l2', null],
    ['o1', 'l1', 'v1'],
    ['o1', 'l1', 'v2'],
  ] as const

  it('el pendiente es de una hoja: otro origen, otro lead u otro vehículo es otra clave', () => {
    const claves = combinaciones.map(([o, l, v]) => claveDelPendiente(o, l, v))
    expect(new Set(claves).size).toBe(combinaciones.length)
  })

  it('el borrador también, y no se confunde con el pendiente', () => {
    const claves = combinaciones.map(([o, l, v]) => claveDelBorrador(o, l, v))
    expect(new Set(claves).size).toBe(combinaciones.length)
    expect(claveDelBorrador('o', null, null)).not.toBe(claveDelBorrador('o', 'l', null))
    expect(claveDelBorrador('o', 'l', null)).not.toBe(claveDelPendiente('o', 'l', null))
  })
})
