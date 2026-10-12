import { describe, expect, it } from 'vitest'
import {
  esquemaCrearMoneda,
  esquemaCrearTipoCambio,
  esquemaGuardarMoneda,
  esquemaGuardarTipoCambio,
} from './tipos-cambio'

const ID = '0b1f4b00-0000-0000-0000-000000000001'

describe('esquemaCrearTipoCambio', () => {
  it('acepta un tipo de cambio entre dos monedas distintas', () => {
    const nuevo = { nombre: ' Banco ', monedaDe: 'USD', monedaA: 'BOB', valor: 9.5 }
    expect(esquemaCrearTipoCambio.parse(nuevo).nombre).toBe('Banco')
  })

  it('rechaza la misma moneda de los dos lados y un valor que no es mayor que cero', () => {
    const base = { nombre: 'Banco', monedaDe: 'USD', monedaA: 'BOB', valor: 9.5 }
    expect(esquemaCrearTipoCambio.safeParse({ ...base, monedaA: 'USD' }).success).toBe(false)
    expect(esquemaCrearTipoCambio.safeParse({ ...base, valor: 0 }).success).toBe(false)
    expect(esquemaCrearTipoCambio.safeParse({ ...base, valor: Number.NaN }).success).toBe(false)
  })
})

describe('esquemaGuardarTipoCambio', () => {
  const edicion = { id: ID, actualizadoEnEsperado: '2026-10-12T14:00:00+00:00' }

  it('lo que no viaja no se toca', () => {
    expect(esquemaGuardarTipoCambio.parse({ ...edicion, valor: 6.97 })).toEqual({
      ...edicion,
      valor: 6.97,
    })
  })

  it('exige la versión que tenía en pantalla quien edita', () => {
    expect(esquemaGuardarTipoCambio.safeParse({ id: ID, valor: 7 }).success).toBe(false)
  })

  it('quitar el por defecto no se pide: se marca otro', () => {
    expect(esquemaGuardarTipoCambio.safeParse({ ...edicion, esDefault: false }).success).toBe(false)
    expect(esquemaGuardarTipoCambio.safeParse({ ...edicion, esDefault: true }).success).toBe(true)
  })
})

describe('las monedas', () => {
  it('el código tiene que ser el de una moneda, y queda en mayúsculas', () => {
    const nueva = { codigo: 'clp', nombre: 'Peso chileno', simbolo: '$', decimales: 0 }
    expect(esquemaCrearMoneda.parse(nueva).codigo).toBe('CLP')
    expect(esquemaCrearMoneda.safeParse({ ...nueva, codigo: 'PESO' }).success).toBe(false)
    expect(esquemaCrearMoneda.safeParse({ ...nueva, codigo: 'XQZ' }).success).toBe(false)
  })

  it('los decimales van de 0 a 4', () => {
    const edicion = { codigo: 'USD', actualizadoEnEsperado: 'v' }
    expect(esquemaGuardarMoneda.safeParse({ ...edicion, decimales: 5 }).success).toBe(false)
    expect(esquemaGuardarMoneda.safeParse({ ...edicion, decimales: 2.5 }).success).toBe(false)
    expect(esquemaGuardarMoneda.safeParse({ ...edicion, decimales: 0 }).success).toBe(true)
  })
})
