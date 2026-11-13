import { describe, expect, it } from 'vitest'
import { unidadAMover } from './unidad-a-mover'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

describe('la unidad que se manda a mover', () => {
  it('un vehículo va con su origen', () => {
    expect(unidadAMover({ tipo: 'vehiculo', id: A, origenId: B })).toEqual({
      vehiculo: A,
      origenId: B,
    })
  })

  it('un ítem va sólo como repuesto, sin origen', () => {
    expect(unidadAMover({ tipo: 'repuesto', id: A, origenId: null })).toEqual({ repuesto: A })
  })
})
