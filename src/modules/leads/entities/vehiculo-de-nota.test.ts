import { describe, expect, it } from 'vitest'
import {
  SIN_VEHICULO,
  VALOR_OCULTO,
  cambioDeVehiculo,
  nombreDelVehiculoDeNota,
  opcionesDeVehiculo,
  valorDeVehiculo,
  vehiculoAlCrear,
  vehiculoDeNotaDesde,
} from './vehiculo-de-nota'

const A = { id: '11111111-1111-4111-8111-111111111111', titulo: 'Toyota Corolla', numero: 12 }
const B = { id: '22222222-2222-4222-8222-222222222222', titulo: 'Kia Rio', numero: 13 }

describe('vehiculoDeNotaDesde', () => {
  it('lee la forma de la RPC y la de la vista', () => {
    expect(vehiculoDeNotaDesde({ vehiculo: A, vehiculo_oculto: false })).toEqual({
      vehiculo: A,
      vehiculoOculto: false,
    })
    expect(
      vehiculoDeNotaDesde({
        vehiculo_id: A.id,
        vehiculo_titulo: A.titulo,
        vehiculo_numero: 12,
        vehiculo_oculto: false,
      }),
    ).toEqual({ vehiculo: A, vehiculoOculto: false })
    expect(vehiculoDeNotaDesde({ vehiculo_id: null, vehiculo_oculto: true })).toEqual({
      vehiculo: null,
      vehiculoOculto: true,
    })
  })
  it('lo que falta es «sin vehículo»', () => {
    expect(vehiculoDeNotaDesde({})).toEqual(SIN_VEHICULO)
    expect(vehiculoDeNotaDesde(null)).toEqual(SIN_VEHICULO)
  })
})

describe('el selector', () => {
  it('arranca con el que tiene, «oculto» si ya no lo ve, o vacío', () => {
    expect(valorDeVehiculo(null)).toBe('')
    expect(valorDeVehiculo({ vehiculo: A, vehiculoOculto: false })).toBe(A.id)
    expect(valorDeVehiculo({ vehiculo: null, vehiculoOculto: true })).toBe(VALOR_OCULTO)
  })

  it('ofrece «Ninguno», los del lead y el que ya tiene aunque no esté entre ellos', () => {
    expect(opcionesDeVehiculo([A], null).map((o) => o.rotulo)).toEqual([
      'Ninguno',
      'Toyota Corolla · #12',
    ])
    expect(
      opcionesDeVehiculo([A], { vehiculo: B, vehiculoOculto: false }).map((o) => o.valor),
    ).toEqual(['', B.id, A.id])
    expect(
      opcionesDeVehiculo([A], { vehiculo: null, vehiculoOculto: true }).map((o) => o.rotulo),
    ).toEqual(['Ninguno', 'Un vehículo que ya no ves', 'Toyota Corolla · #12'])
  })

  it('al anotar manda el id o nulo; al editar, sólo si cambió («oculto» es no tocarlo)', () => {
    expect(vehiculoAlCrear('')).toBeNull()
    expect(vehiculoAlCrear(A.id)).toBe(A.id)
    const oculto = { vehiculo: null, vehiculoOculto: true }
    expect(cambioDeVehiculo(VALOR_OCULTO, oculto)).toEqual({ cambia: false })
    expect(cambioDeVehiculo('', oculto)).toEqual({ cambia: true, vehiculoId: null })
    expect(cambioDeVehiculo(A.id, { vehiculo: A, vehiculoOculto: false })).toEqual({
      cambia: false,
    })
    expect(cambioDeVehiculo(B.id, { vehiculo: A, vehiculoOculto: false })).toEqual({
      cambia: true,
      vehiculoId: B.id,
    })
  })
})

describe('nombreDelVehiculoDeNota', () => {
  it('lo nombra si se ve; si no, sólo dice que había uno', () => {
    expect(nombreDelVehiculoDeNota({ vehiculo: A, vehiculoOculto: false })).toBe(
      'Toyota Corolla · #12',
    )
    expect(nombreDelVehiculoDeNota({ vehiculo: null, vehiculoOculto: true })).toBe(
      'un vehículo que ya no ves',
    )
    expect(nombreDelVehiculoDeNota(SIN_VEHICULO)).toBeNull()
  })
})
