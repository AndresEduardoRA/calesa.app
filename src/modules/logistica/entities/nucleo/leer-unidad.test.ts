import { describe, expect, it } from 'vitest'
import { unidadDeVehiculo } from './leer-unidad'

const ID = '6f1b7c1e-2f0a-4e0f-9c52-1d7c1a2b3c4d'
const ORIGEN = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'
const FASE = '11111111-2222-4333-8444-555555555555'
const fila = {
  id: ID,
  origen_id: ORIGEN,
  titulo: 'Toyota Hilux 2019',
  fase_id: FASE,
  fase_desde: '2026-11-08T12:00:00+00:00',
}

describe('unidadDeVehiculo', () => {
  it('la fila válida sale como unidad de vehículo en camelCase', () => {
    expect(unidadDeVehiculo(fila)).toEqual({
      ok: true,
      data: {
        tipo: 'vehiculo',
        id: ID,
        origenId: ORIGEN,
        titulo: 'Toyota Hilux 2019',
        faseId: FASE,
        faseDesde: '2026-11-08T12:00:00+00:00',
      },
    })
  })

  it('sin fila no hay unidad, y no es un error', () => {
    expect(unidadDeVehiculo(null)).toEqual({ ok: true, data: null })
  })

  it('un vehículo sin fase es una unidad sin fase ni fecha', () => {
    const r = unidadDeVehiculo({ ...fila, fase_id: null, fase_desde: null })
    expect(r.ok && r.data).toMatchObject({ faseId: null, faseDesde: null })
  })

  it.each([
    ['id que no es guid', { ...fila, id: '123' }],
    ['origen que no es guid', { ...fila, origen_id: 'x' }],
    ['sin título', { ...fila, titulo: undefined }],
    ['fase que no es guid', { ...fila, fase_id: 'x' }],
  ])('%s es un error', (_caso, mala) => {
    expect(unidadDeVehiculo(mala).ok).toBe(false)
  })
})
