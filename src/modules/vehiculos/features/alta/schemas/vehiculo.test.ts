import { describe, expect, it } from 'vitest'
import { esquemaCrearVehiculo, esquemaGuardarVehiculo } from './vehiculo'

const ID = '00000000-0000-0000-0000-00000000000a'

describe('sobre de un guardado', () => {
  it('acepta el estado del formulario: texto, sí o no, nada y listas', () => {
    const pedido = {
      id: ID,
      origenId: ID,
      valores: { titulo: 'RAV4', placado: true, aceptaPermuta: null, 'a.extras': ['techo'] },
    }
    expect(esquemaCrearVehiculo.safeParse(pedido).success).toBe(true)
  })

  it('pide el id y el origen, y acota lo que viaja', () => {
    const valores = { titulo: 'RAV4' }
    expect(esquemaCrearVehiculo.safeParse({ id: 'x', origenId: ID, valores }).success).toBe(false)
    expect(esquemaCrearVehiculo.safeParse({ id: ID, valores }).success).toBe(false)
    expect(
      esquemaCrearVehiculo.safeParse({ id: ID, origenId: ID, valores: { titulo: 4 } }).success,
    ).toBe(false)
    expect(
      esquemaCrearVehiculo.safeParse({ id: ID, origenId: ID, valores: { nota: 'x'.repeat(6001) } })
        .success,
    ).toBe(false)
  })

  it('editar pide la versión que se tenía en pantalla', () => {
    const base = { id: ID, valores: { titulo: 'RAV4' } }
    expect(esquemaGuardarVehiculo.safeParse(base).success).toBe(false)
    expect(esquemaGuardarVehiculo.safeParse({ ...base, actualizadoEnEsperado: '' }).success).toBe(
      false,
    )
    expect(
      esquemaGuardarVehiculo.safeParse({
        ...base,
        actualizadoEnEsperado: '2026-10-13T12:00:00+00:00',
      }).success,
    ).toBe(true)
  })
})
