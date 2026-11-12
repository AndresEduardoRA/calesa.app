import { describe, expect, it } from 'vitest'
import type { FlujoParaConfigurar } from '../flujo'
import { quienMueve, textoDeQuienMueve } from './quien-mueve'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const T = '33333333-3333-4333-8333-333333333333'
const ROL_1 = '44444444-4444-4444-8444-444444444444'
const ROL_2 = '55555555-5555-4555-8555-555555555555'

function flujo(parcial: Partial<FlujoParaConfigurar>): FlujoParaConfigurar {
  return {
    transiciones: [],
    rolesPorFase: [],
    rolesPorTransicion: [],
    ...parcial,
  } as FlujoParaConfigurar
}

const salida = { id: T, deFaseId: A, aFaseId: B, accion: null, notaObligatoria: false }

// Los mismos casos que `supabase/tests/areas/flujos/transiciones.sql` T4–T5 y `_puede_mover`.
describe('quienMueve', () => {
  it('sin listas, cualquiera con el permiso', () => {
    expect(quienMueve(flujo({ transiciones: [salida] }), A, B)).toEqual({
      origen: 'cualquiera',
      rolIds: [],
    })
  })

  it('sólo la lista de la fase destino: manda la de la fase', () => {
    const f = flujo({
      transiciones: [salida],
      rolesPorFase: [{ faseId: B, rolId: ROL_1 }],
    })
    expect(quienMueve(f, A, B)).toEqual({ origen: 'fase', rolIds: [ROL_1] })
  })

  it('con lista de la salida y de la fase, manda la de la salida', () => {
    const f = flujo({
      transiciones: [salida],
      rolesPorFase: [{ faseId: B, rolId: ROL_1 }],
      rolesPorTransicion: [{ transicionId: T, rolId: ROL_2 }],
    })
    expect(quienMueve(f, A, B)).toEqual({ origen: 'salida', rolIds: [ROL_2] })
  })

  it('una salida sin lista cae a la de la fase', () => {
    const f = flujo({
      transiciones: [salida],
      rolesPorFase: [{ faseId: B, rolId: ROL_1 }],
    })
    expect(quienMueve(f, A, B).origen).toBe('fase')
  })

  it('sin fase de origen se ignora la lista de la salida', () => {
    const f = flujo({
      transiciones: [salida],
      rolesPorFase: [{ faseId: B, rolId: ROL_1 }],
      rolesPorTransicion: [{ transicionId: T, rolId: ROL_2 }],
    })
    expect(quienMueve(f, null, B)).toEqual({ origen: 'fase', rolIds: [ROL_1] })
  })

  it('una salida en sentido contrario no cuenta', () => {
    const f = flujo({
      transiciones: [salida],
      rolesPorTransicion: [{ transicionId: T, rolId: ROL_2 }],
    })
    expect(quienMueve(f, B, A)).toEqual({ origen: 'cualquiera', rolIds: [] })
  })
})

describe('textoDeQuienMueve', () => {
  const roles = [
    { id: ROL_1, nombre: 'Logística' },
    { id: ROL_2, nombre: 'Dueño' },
  ]

  it('cualquiera', () => {
    expect(textoDeQuienMueve({ origen: 'cualquiera', rolIds: [] }, roles)).toBe(
      'Cualquiera con el permiso de mover',
    )
  })

  it('nombra los roles en orden y dice de dónde sale la lista', () => {
    expect(textoDeQuienMueve({ origen: 'salida', rolIds: [ROL_1, ROL_2] }, roles)).toBe(
      'Hoy pueden mover: Dueño, Logística (lista de esta salida)',
    )
    expect(textoDeQuienMueve({ origen: 'fase', rolIds: [ROL_1] }, roles)).toBe(
      'Hoy pueden mover: Logística (los de la fase)',
    )
  })

  it('sin sufijo, sólo los nombres', () => {
    expect(textoDeQuienMueve({ origen: 'fase', rolIds: [ROL_2] }, roles, false)).toBe(
      'Hoy pueden mover: Dueño',
    )
  })

  it('un rol que no está en la lista leída es «otro rol»', () => {
    expect(textoDeQuienMueve({ origen: 'fase', rolIds: [A] }, roles, false)).toBe(
      'Hoy pueden mover: otro rol',
    )
  })
})
