import { describe, expect, it } from 'vitest'
import {
  esquemaAsignarCanal,
  esquemaGuardarDeclaracion,
  esquemaPonerVehiculos,
} from './declaracion'

const ID = '6a1f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f70'
const OTRO = '7b2e6e4f-9d3c-4b8f-8a21-3c4d5e6f7081'
const VERSION = '2026-11-01T10:00:00.123456+00:00'

describe('esquemaGuardarDeclaracion', () => {
  it('crea con id y versión nulos y el número', () => {
    expect(
      esquemaGuardarDeclaracion.safeParse({
        id: null,
        actualizadoEnEsperado: null,
        datos: { numero: 'DUI-1', despachante: null },
      }).success,
    ).toBe(true)
  })

  it('crear sin número no pasa', () => {
    expect(
      esquemaGuardarDeclaracion.safeParse({ id: null, actualizadoEnEsperado: null, datos: {} })
        .success,
    ).toBe(false)
  })

  it('el id y la versión van juntos', () => {
    expect(
      esquemaGuardarDeclaracion.safeParse({ id: ID, actualizadoEnEsperado: null, datos: {} })
        .success,
    ).toBe(false)
    expect(
      esquemaGuardarDeclaracion.safeParse({ id: null, actualizadoEnEsperado: VERSION, datos: {} })
        .success,
    ).toBe(false)
  })

  it('editar admite una clave sola, vaciar con null y rechaza claves de más y fechas mal escritas', () => {
    const base = { id: ID, actualizadoEnEsperado: VERSION }
    expect(esquemaGuardarDeclaracion.safeParse({ ...base, datos: { notas: null } }).success).toBe(
      true,
    )
    expect(esquemaGuardarDeclaracion.safeParse({ ...base, datos: { canal: 'rojo' } }).success).toBe(
      false,
    )
    expect(
      esquemaGuardarDeclaracion.safeParse({ ...base, datos: { aceptada_el: '1/2/2026' } }).success,
    ).toBe(false)
  })
})

describe('esquemaPonerVehiculos', () => {
  const base = { declaracionId: ID, actualizadoEnEsperado: VERSION }

  it('admite agregar y quitar', () => {
    expect(
      esquemaPonerVehiculos.safeParse({ ...base, agregar: [ID], quitar: [OTRO] }).success,
    ).toBe(true)
  })

  it('el mismo vehículo en las dos listas, o repetido, no pasa', () => {
    expect(esquemaPonerVehiculos.safeParse({ ...base, agregar: [ID], quitar: [ID] }).success).toBe(
      false,
    )
    expect(
      esquemaPonerVehiculos.safeParse({ ...base, agregar: [ID, ID], quitar: [] }).success,
    ).toBe(false)
  })

  it('hasta 200 entre las dos listas', () => {
    const ids = (n: number) =>
      Array.from({ length: n }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
    expect(
      esquemaPonerVehiculos.safeParse({ ...base, agregar: ids(200), quitar: [] }).success,
    ).toBe(true)
    expect(
      esquemaPonerVehiculos.safeParse({ ...base, agregar: ids(201), quitar: [] }).success,
    ).toBe(false)
  })
})

describe('esquemaAsignarCanal', () => {
  it('sólo los canales de la base y nunca vacío', () => {
    const base = { declaracionId: ID, actualizadoEnEsperado: VERSION }
    expect(esquemaAsignarCanal.safeParse({ ...base, canal: 'verde' }).success).toBe(true)
    expect(esquemaAsignarCanal.safeParse({ ...base, canal: 'azul' }).success).toBe(false)
    expect(esquemaAsignarCanal.safeParse({ ...base, canal: null }).success).toBe(false)
  })
})
