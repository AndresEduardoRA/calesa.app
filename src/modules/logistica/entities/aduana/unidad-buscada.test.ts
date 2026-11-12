import { describe, expect, it } from 'vitest'
import { unidadesBuscadasDesde } from './unidad-buscada'

const ID = '6a1f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f70'

describe('unidadesBuscadasDesde', () => {
  it('toma el título, el VIN, el lote y la fase, y si hay más', () => {
    expect(
      unidadesBuscadasDesde({
        unidades: [
          {
            id: ID,
            origen_id: ID,
            titulo: 'Toyota Hilux',
            vin: 'VIN1',
            lote: null,
            fase_id: null,
            fase_nombre: 'Puerto',
          },
        ],
        hay_mas: true,
      }),
    ).toEqual({
      hayMas: true,
      unidades: [{ id: ID, titulo: 'Toyota Hilux', vin: 'VIN1', lote: null, fase: 'Puerto' }],
    })
  })

  it('una forma distinta no se descarta en silencio: da nulo', () => {
    expect(unidadesBuscadasDesde({ unidades: [{ id: 'x' }], hay_mas: false })).toBeNull()
    expect(unidadesBuscadasDesde(null)).toBeNull()
  })
})
