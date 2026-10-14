import { describe, expect, it } from 'vitest'
import { esquemaRefrescarSubasta } from './ficha'

const ID = '00000000-0000-0000-0000-00000000000a'
const CONSULTA = '00000000-0000-0000-0000-00000000000b'

describe('esquemaRefrescarSubasta', () => {
  it('pide el vehículo, la versión que se tenía y la consulta', () => {
    const valido = {
      vehiculoId: ID,
      actualizadoEnEsperado: '2026-10-14T12:00:00Z',
      consulta: CONSULTA,
    }
    expect(esquemaRefrescarSubasta.safeParse(valido).success).toBe(true)
    expect(
      esquemaRefrescarSubasta.safeParse({ ...valido, actualizadoEnEsperado: '' }).success,
    ).toBe(false)
    expect(esquemaRefrescarSubasta.safeParse({ ...valido, vehiculoId: 'x' }).success).toBe(false)
    expect(esquemaRefrescarSubasta.safeParse({ ...valido, consulta: undefined }).success).toBe(
      false,
    )
  })

  it('no acepta el bruto en lugar de la referencia: fecha y estado no salen del navegador', () => {
    const conBruto = {
      vehiculoId: ID,
      actualizadoEnEsperado: '2026-10-14T12:00:00Z',
      consulta: { auction: {} },
    }
    expect(esquemaRefrescarSubasta.safeParse(conBruto).success).toBe(false)
  })
})
