import { describe, expect, it } from 'vitest'
import { rutaDeLaHoja } from './ruta-de-la-hoja'

describe('rutaDeLaHoja', () => {
  it('lleva el origen y conserva el lead; el vehículo no viaja (es de otro origen)', () => {
    expect(rutaDeLaHoja({ origen: 'o1', lead: 'l1' })).toBe('/cotizaciones/nuevo?origen=o1&lead=l1')
    expect(rutaDeLaHoja({ origen: 'o1', lead: null })).toBe('/cotizaciones/nuevo?origen=o1')
  })
})
