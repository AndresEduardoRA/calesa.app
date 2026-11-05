import { describe, expect, it } from 'vitest'
import { rutaDeLaCotizacion, rutaDeLaHoja, rutaDelListado } from './ruta-de-la-hoja'

describe('rutaDeLaHoja', () => {
  it('lleva el origen y conserva el lead; el vehículo no viaja (es de otro origen)', () => {
    expect(rutaDeLaHoja({ origen: 'o1', lead: 'l1' })).toBe('/cotizaciones/nuevo?origen=o1&lead=l1')
    expect(rutaDeLaHoja({ origen: 'o1', lead: null })).toBe('/cotizaciones/nuevo?origen=o1')
  })
})

describe('rutaDeLaCotizacion', () => {
  it('es la página de la cotización por su id', () => {
    expect(rutaDeLaCotizacion('0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b')).toBe(
      '/cotizaciones/0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
    )
  })
})

describe('rutaDelListado', () => {
  it('sin vehículo es el listado; con vehículo, el listado de ese vehículo', () => {
    expect(rutaDelListado({})).toBe('/cotizaciones')
    expect(rutaDelListado({ vehiculo: '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b' })).toBe(
      '/cotizaciones?vehiculo=0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
    )
  })
})
