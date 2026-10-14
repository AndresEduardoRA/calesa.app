import { describe, expect, it } from 'vitest'
import { esquemaConservar } from './conservar'

const ID = '00000000-0000-0000-0000-00000000000a'

describe('esquemaConservar', () => {
  it('pide el vehículo y el estado deseado', () => {
    expect(esquemaConservar.safeParse({ vehiculoId: ID, conservar: true }).success).toBe(true)
    expect(esquemaConservar.safeParse({ vehiculoId: ID, conservar: false }).success).toBe(true)
  })

  it('rechaza un id que no es uno y un estado ausente', () => {
    expect(esquemaConservar.safeParse({ vehiculoId: 'x', conservar: true }).success).toBe(false)
    expect(esquemaConservar.safeParse({ vehiculoId: ID }).success).toBe(false)
    expect(esquemaConservar.safeParse({ vehiculoId: ID, conservar: 'si' }).success).toBe(false)
  })
})
