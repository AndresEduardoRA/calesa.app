import { describe, expect, it } from 'vitest'
import {
  aprobadasDelVehiculoDesde,
  idsAprobadosDesde,
  marcaDeLaGuardadaDesde,
  resultadoDeAprobar,
} from './lectura'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const V = '33333333-3333-4333-8333-333333333333'
const VERSION = '2026-11-14T10:00:00.123456+00:00'

describe('resultadoDeAprobar', () => {
  it('con y sin anterior, con la versión tal cual', () => {
    const nueva = { id: A, numero: 7, actualizado_en: VERSION }
    expect(resultadoDeAprobar({ cotizacion: nueva, anterior: null })).toEqual({
      cotizacion: { id: A, numero: 7, actualizadoEn: VERSION },
      anterior: null,
    })
    expect(
      resultadoDeAprobar({ cotizacion: nueva, anterior: { ...nueva, id: B, numero: 3 } })?.anterior,
    ).toEqual({ id: B, numero: 3, actualizadoEn: VERSION })
  })

  it('lo que no cumple es nulo', () => {
    expect(resultadoDeAprobar(null)).toBeNull()
    expect(
      resultadoDeAprobar({ cotizacion: { id: 'x', numero: 1, actualizado_en: VERSION } }),
    ).toBeNull()
    expect(
      resultadoDeAprobar({ cotizacion: { id: A, numero: 1, actualizado_en: '' }, anterior: null }),
    ).toBeNull()
  })
})

describe('aprobadasDelVehiculoDesde', () => {
  it('el monto queda como texto, también nulo', () => {
    expect(
      aprobadasDelVehiculoDesde([
        { vehiculo_id: V, cotizacion_id: A, monto: '1234.50', moneda: 'USD' },
        { vehiculo_id: B, cotizacion_id: B, monto: null, moneda: 'USD' },
      ]),
    ).toEqual([
      { vehiculoId: V, cotizacionId: A, monto: '1234.50', moneda: 'USD' },
      { vehiculoId: B, cotizacionId: B, monto: null, moneda: 'USD' },
    ])
  })

  it('una moneda que no es un código, un monto numérico o un id roto: nulo', () => {
    expect(
      aprobadasDelVehiculoDesde([{ vehiculo_id: V, cotizacion_id: A, monto: '1', moneda: 'usd' }]),
    ).toBeNull()
    expect(
      aprobadasDelVehiculoDesde([{ vehiculo_id: V, cotizacion_id: A, monto: 1, moneda: 'USD' }]),
    ).toBeNull()
    expect(
      aprobadasDelVehiculoDesde([
        { vehiculo_id: 'x', cotizacion_id: A, monto: '1', moneda: 'USD' },
      ]),
    ).toBeNull()
  })
})

describe('idsAprobadosDesde', () => {
  it('el conjunto de las aprobadas', () => {
    expect([...(idsAprobadosDesde([{ cotizacion_id: A }, { cotizacion_id: B }]) ?? [])]).toEqual([
      A,
      B,
    ])
    expect(idsAprobadosDesde([{ cotizacion_id: 'x' }])).toBeNull()
  })
})

describe('marcaDeLaGuardadaDesde', () => {
  it('aprobada si el embebido es un objeto, no si es nulo', () => {
    expect(
      marcaDeLaGuardadaDesde([{ estado: 'activa', cotizaciones_aprobadas: { cotizacion_id: A } }]),
    ).toEqual({
      aprobada: true,
      estado: 'activa',
    })
    expect(marcaDeLaGuardadaDesde([{ estado: 'invalida', cotizaciones_aprobadas: null }])).toEqual({
      aprobada: false,
      estado: 'invalida',
    })
  })

  it('sin fila o con un estado desconocido: nulo', () => {
    expect(marcaDeLaGuardadaDesde([])).toBeNull()
    expect(marcaDeLaGuardadaDesde([{ estado: 'rara', cotizaciones_aprobadas: null }])).toBeNull()
  })
})
