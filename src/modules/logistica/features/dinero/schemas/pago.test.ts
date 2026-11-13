import { describe, expect, it } from 'vitest'
import { esquemaRegistrarPago } from './pago'

// Un pago es de un vehículo o de un proyecto de repuestos (8.13-5), nunca de los dos ni de ninguno.
const datos = {
  id: '00000000-0000-4000-8000-000000000001',
  concepto: 'Anticipo',
  moneda: 'USD',
  monto: 10,
  tipoCambioId: null,
  metodo: null,
  fecha: '2026-11-12',
  notas: null,
  comprobanteRuta: null,
}
const uno = '00000000-0000-4000-8000-000000000002'

describe('esquemaRegistrarPago', () => {
  it('admite un pago de vehículo o de proyecto', () => {
    expect(esquemaRegistrarPago.safeParse({ ...datos, vehiculoId: uno }).success).toBe(true)
    expect(esquemaRegistrarPago.safeParse({ ...datos, proyectoId: uno }).success).toBe(true)
  })

  it('rechaza los dos a la vez o ninguno', () => {
    expect(
      esquemaRegistrarPago.safeParse({ ...datos, vehiculoId: uno, proyectoId: uno }).success,
    ).toBe(false)
    expect(esquemaRegistrarPago.safeParse(datos).success).toBe(false)
  })
})
