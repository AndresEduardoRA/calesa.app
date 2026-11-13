import { describe, expect, it } from 'vitest'
import { esquemaCambiarFase, esquemaLeerParaMover, esquemaPrevisualizarCambio } from './mover'

const V = '11111111-1111-4111-8111-111111111111'
const R = '22222222-2222-4222-8222-222222222222'
const O = '33333333-3333-4333-8333-333333333333'
const F = '44444444-4444-4444-8444-444444444444'

describe('esquemaLeerParaMover', () => {
  it('un vehículo con su origen vale y queda como unidad de vehículo', () => {
    const leido = esquemaLeerParaMover.safeParse({ vehiculo: V, origenId: O })
    expect(leido.success && leido.data).toEqual({
      unidad: { tipo: 'vehiculo', vehiculoId: V },
      origenId: O,
    })
  })

  it('un repuesto vale sin origen', () => {
    const leido = esquemaLeerParaMover.safeParse({ repuesto: R })
    expect(leido.success && leido.data).toEqual({
      unidad: { tipo: 'repuesto', repuestoId: R },
      origenId: null,
    })
  })

  it('los dos o ninguno fallan; un vehículo sin origen falla; un guid malo falla', () => {
    expect(esquemaLeerParaMover.safeParse({ vehiculo: V, repuesto: R, origenId: O }).success).toBe(
      false,
    )
    expect(esquemaLeerParaMover.safeParse({ origenId: O }).success).toBe(false)
    expect(esquemaLeerParaMover.safeParse({ vehiculo: V }).success).toBe(false)
    expect(esquemaLeerParaMover.safeParse({ vehiculo: 'x', origenId: O }).success).toBe(false)
    expect(esquemaLeerParaMover.safeParse({ repuesto: 'x' }).success).toBe(false)
  })
})

describe('esquemaPrevisualizarCambio', () => {
  it('vehículo solo vale (sin origen, como hasta hoy), repuesto solo vale, ambos o ninguno fallan', () => {
    expect(esquemaPrevisualizarCambio.safeParse({ vehiculo: V, faseDestino: F }).success).toBe(true)
    expect(esquemaPrevisualizarCambio.safeParse({ repuesto: R, faseDestino: F }).success).toBe(true)
    expect(
      esquemaPrevisualizarCambio.safeParse({ vehiculo: V, repuesto: R, faseDestino: F }).success,
    ).toBe(false)
    expect(esquemaPrevisualizarCambio.safeParse({ faseDestino: F }).success).toBe(false)
    expect(esquemaPrevisualizarCambio.safeParse({ repuesto: R, faseDestino: 'x' }).success).toBe(
      false,
    )
  })
})

describe('esquemaCambiarFase', () => {
  it('un vehículo con origen y un repuesto sin origen valen; la nota vacía queda nula', () => {
    const v = esquemaCambiarFase.safeParse({
      vehiculo: V,
      origenId: O,
      faseDestino: F,
      faseEsperada: null,
      nota: '  ',
    })
    expect(v.success && v.data).toEqual({
      unidad: { tipo: 'vehiculo', vehiculoId: V },
      origenId: O,
      faseDestino: F,
      faseEsperada: null,
      nota: null,
    })
    const r = esquemaCambiarFase.safeParse({
      repuesto: R,
      faseDestino: F,
      faseEsperada: F,
      nota: 'llegó',
    })
    expect(r.success && r.data).toEqual({
      unidad: { tipo: 'repuesto', repuestoId: R },
      origenId: null,
      faseDestino: F,
      faseEsperada: F,
      nota: 'llegó',
    })
  })

  it('un vehículo sin origen, o los dos a la vez, fallan', () => {
    expect(
      esquemaCambiarFase.safeParse({ vehiculo: V, faseDestino: F, faseEsperada: null }).success,
    ).toBe(false)
    expect(
      esquemaCambiarFase.safeParse({
        vehiculo: V,
        repuesto: R,
        origenId: O,
        faseDestino: F,
        faseEsperada: null,
      }).success,
    ).toBe(false)
  })
})
