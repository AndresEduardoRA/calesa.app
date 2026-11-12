import { describe, expect, it } from 'vitest'
import { leerMontoDeDinero } from './monto-tipeado'

describe('leerMontoDeDinero', () => {
  it('lee un monto con coma decimal', () => {
    expect(leerMontoDeDinero('1.500,25', 'es-BO', { positivo: false })).toEqual({ monto: 1500.25 })
  })

  it('el cero vale en un gasto y no en un pago', () => {
    expect(leerMontoDeDinero('0', 'es-BO', { positivo: false })).toEqual({ monto: 0 })
    expect(leerMontoDeDinero('0', 'es-BO', { positivo: true }).error).toBe(
      'El monto de un pago es mayor que cero.',
    )
  })

  it('rechaza vacío, negativo y tres decimales', () => {
    expect(leerMontoDeDinero('', 'es-BO', { positivo: false }).error).toBe('Escribe el monto.')
    expect(leerMontoDeDinero('-1', 'es-BO', { positivo: false }).error).toBe(
      'El monto no puede ser negativo.',
    )
    expect(leerMontoDeDinero('1,005', 'es-BO', { positivo: false }).error).toBe(
      'El monto lleva como mucho dos decimales.',
    )
  })
})
