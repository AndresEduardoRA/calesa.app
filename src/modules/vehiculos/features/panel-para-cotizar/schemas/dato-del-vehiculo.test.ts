import { describe, expect, it } from 'vitest'
import { esquemaGuardarDatoDelVehiculo } from './dato-del-vehiculo'

const BUENO = {
  id: '00000000-0000-4000-8000-000000000001',
  actualizadoEnEsperado: '2026-10-30T10:00:00.000001Z',
  campo: 'tipo_vehiculo',
  valor: 'autos',
}

describe('esquemaGuardarDatoDelVehiculo: el sobre de elegir un dato del vehículo en el panel', () => {
  it('acepta un id, la versión, el campo y su valor', () => {
    expect(esquemaGuardarDatoDelVehiculo.parse(BUENO)).toEqual(BUENO)
  })

  it.each([
    ['un id que no es guid', { id: 'x' }],
    ['la versión vacía', { actualizadoEnEsperado: '' }],
    ['el campo vacío', { campo: '' }],
    ['un campo de más de 60', { campo: 'a'.repeat(61) }],
    ['el valor vacío', { valor: '' }],
    ['un valor de más de 6.000', { valor: 'a'.repeat(6001) }],
    ['un valor que no es texto', { valor: 3 }],
    ['una clave de más', { atributos: { otro: 'x' } }],
  ])('rechaza %s', (_caso, cambio) => {
    expect(esquemaGuardarDatoDelVehiculo.safeParse({ ...BUENO, ...cambio }).success).toBe(false)
  })
})
