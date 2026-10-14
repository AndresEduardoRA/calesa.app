import { describe, expect, it } from 'vitest'
import { esquemaFichaDeApibara, esquemaRefrescarSubasta } from './ficha'

const ID = '00000000-0000-0000-0000-00000000000a'

describe('esquemaFichaDeApibara', () => {
  it('acepta un objeto y rechaza lo que no lo es o pasa del tope', () => {
    expect(esquemaFichaDeApibara.safeParse({ lot_number: '1' }).success).toBe(true)
    expect(esquemaFichaDeApibara.safeParse([1]).success).toBe(false)
    expect(esquemaFichaDeApibara.safeParse('texto').success).toBe(false)
    expect(esquemaFichaDeApibara.safeParse({ relleno: 'x'.repeat(600_000) }).success).toBe(false)
  })
})

describe('esquemaRefrescarSubasta', () => {
  it('pide el vehículo, la versión que se tenía y la respuesta', () => {
    const valido = { vehiculoId: ID, actualizadoEnEsperado: '2026-10-14T12:00:00Z', ficha: {} }
    expect(esquemaRefrescarSubasta.safeParse(valido).success).toBe(true)
    expect(
      esquemaRefrescarSubasta.safeParse({ ...valido, actualizadoEnEsperado: '' }).success,
    ).toBe(false)
    expect(esquemaRefrescarSubasta.safeParse({ ...valido, vehiculoId: 'x' }).success).toBe(false)
    expect(esquemaRefrescarSubasta.safeParse({ ...valido, ficha: undefined }).success).toBe(false)
  })
})
