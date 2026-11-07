import { describe, expect, it } from 'vitest'
import { rutaDeLaCotizacion, rutaDeLaHoja, rutaDelListado, rutaDelPdf } from './ruta-de-la-hoja'

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

describe('rutaDelPdf', () => {
  it('es el PDF de la cotización guardada, bajo su página', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    expect(rutaDelPdf(id)).toBe(`/cotizaciones/${id}/pdf`)
    expect(rutaDelPdf(id).startsWith(rutaDeLaCotizacion(id))).toBe(true)
  })
})

describe('rutaDelListado', () => {
  it('sin vehículo es el listado; con vehículo, el listado de ese vehículo', () => {
    expect(rutaDelListado({})).toBe('/cotizaciones')
    expect(rutaDelListado({ vehiculo: '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b' })).toBe(
      '/cotizaciones?vehiculo=0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
    )
  })

  it('con lead, el listado de ese cliente; con los dos, primero el lead', () => {
    const lead = '1c8b3a1f-2d3e-4f60-9bac-1d2e3f4a5b6c'
    const vehiculo = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
    expect(rutaDelListado({ lead })).toBe(`/cotizaciones?lead=${lead}`)
    expect(rutaDelListado({ lead, vehiculo })).toBe(
      `/cotizaciones?lead=${lead}&vehiculo=${vehiculo}`,
    )
  })
})
