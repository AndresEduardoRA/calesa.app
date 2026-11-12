import { describe, expect, it } from 'vitest'
import { esquemaCierreDeProyecto } from './cierre'

const ID = '7f9c1d2e-3a4b-4c5d-8e6f-0123456789ab'

describe('esquemaCierreDeProyecto', () => {
  it('acepta un id y una versión', () => {
    expect(
      esquemaCierreDeProyecto.safeParse({ id: ID, actualizadoEn: '2026-11-12T10:00:00+00:00' })
        .success,
    ).toBe(true)
  })
  it('rechaza un id que no es guid o una versión vacía', () => {
    expect(esquemaCierreDeProyecto.safeParse({ id: '12', actualizadoEn: 'x' }).success).toBe(false)
    expect(esquemaCierreDeProyecto.safeParse({ id: ID, actualizadoEn: '' }).success).toBe(false)
  })
})
