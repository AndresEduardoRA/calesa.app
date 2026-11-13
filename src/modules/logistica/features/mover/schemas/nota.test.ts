import { describe, expect, it } from 'vitest'
import { esquemaCrearNota, esquemaEditarNota } from './nota'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

describe('crear una nota', () => {
  it('de un vehículo, con su origen', () => {
    expect(esquemaCrearNota.safeParse({ vehiculo: A, origenId: B, cuerpo: 'hola' }).success).toBe(
      true,
    )
  })

  it('de un repuesto, sin origen', () => {
    expect(esquemaCrearNota.safeParse({ repuesto: A, cuerpo: 'hola' }).success).toBe(true)
  })

  it('no vale de las dos unidades ni de ninguna', () => {
    expect(
      esquemaCrearNota.safeParse({ vehiculo: A, repuesto: B, origenId: B, cuerpo: 'hola' }).success,
    ).toBe(false)
    expect(esquemaCrearNota.safeParse({ cuerpo: 'hola' }).success).toBe(false)
  })

  it('un vehículo sin origen falla', () => {
    expect(esquemaCrearNota.safeParse({ vehiculo: A, cuerpo: 'hola' }).success).toBe(false)
  })
})

describe('editar una nota', () => {
  it('un ítem no tiene origen', () => {
    expect(
      esquemaEditarNota.safeParse({ id: A, origenId: null, tipo: 'repuesto', cuerpo: 'x' }).success,
    ).toBe(true)
  })

  it('sin tipo es de un vehículo y pide su origen', () => {
    expect(esquemaEditarNota.safeParse({ id: A, origenId: B, cuerpo: 'x' }).success).toBe(true)
    expect(esquemaEditarNota.safeParse({ id: A, origenId: null, cuerpo: 'x' }).success).toBe(false)
  })
})
