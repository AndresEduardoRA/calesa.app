import { describe, expect, it } from 'vitest'
import {
  esquemaCompletarRecordatorio,
  esquemaCrearRecordatorio,
  esquemaGuardarRecordatorio,
} from './recordatorios'

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const LEAD = '0b9c2f3e-1d4a-4c5b-8e6f-7a8b9c0d1e2f'

describe('los esquemas de los recordatorios', () => {
  it('crear: un instante con su zona y el título recortado', () => {
    const leido = esquemaCrearRecordatorio.safeParse({
      id: ID,
      leadId: LEAD,
      titulo: ' Llamar ',
      recordarEn: '2026-10-16T13:00:00.000Z',
      vehiculoId: null,
    })
    expect(leido.data?.titulo).toBe('Llamar')
    expect(
      esquemaCrearRecordatorio.safeParse({
        id: ID,
        leadId: LEAD,
        titulo: 'x',
        recordarEn: '2026-10-16T09:00',
      }).success,
    ).toBe(false)
    expect(
      esquemaCrearRecordatorio.safeParse({
        id: ID,
        leadId: LEAD,
        titulo: ' ',
        recordarEn: '2026-10-16T13:00:00Z',
      }).success,
    ).toBe(false)
  })
  it('guardar pide algo que guardar y la versión; completar es un sí o no', () => {
    expect(
      esquemaGuardarRecordatorio.safeParse({ id: ID, actualizadoEnEsperado: 'v', cambios: {} })
        .success,
    ).toBe(false)
    expect(
      esquemaGuardarRecordatorio.safeParse({
        id: ID,
        actualizadoEnEsperado: 'v',
        cambios: { titulo: 'x' },
      }).success,
    ).toBe(true)
    expect(
      esquemaCompletarRecordatorio.safeParse({
        id: ID,
        actualizadoEnEsperado: 'v',
        completado: 'si',
      }).success,
    ).toBe(false)
  })
})
