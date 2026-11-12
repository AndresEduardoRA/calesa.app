import { describe, expect, it } from 'vitest'
import {
  esquemaCrearRequisitoDeDato,
  esquemaEliminarRequisito,
  esquemaLeerOpciones,
  esquemaMoverRequisito,
} from './requisitos'

const ID = '11111111-1111-4111-8111-111111111111'
const OTRO = '22222222-2222-4222-8222-222222222222'
const base = {
  id: ID,
  ambito: 'vehiculos',
  faseId: OTRO,
  actualizadoEnEsperado: '2026-11-11T10:00:00Z',
}

describe('esquemas de requisitos', () => {
  it('crear exige ids guid, un ámbito conocido y la clave', () => {
    expect(
      esquemaCrearRequisitoDeDato.safeParse({ ...base, datos: { clave_dato: 'vehiculo.vin' } })
        .success,
    ).toBe(true)
    expect(
      esquemaCrearRequisitoDeDato.safeParse({ ...base, id: 'no', datos: { clave_dato: 'x' } })
        .success,
    ).toBe(false)
    expect(
      esquemaCrearRequisitoDeDato.safeParse({ ...base, ambito: 'otro', datos: { clave_dato: 'x' } })
        .success,
    ).toBe(false)
    expect(esquemaCrearRequisitoDeDato.safeParse({ ...base, datos: {} }).success).toBe(false)
  })

  it('el porcentaje es un número, no un texto, y no se admiten claves de más', () => {
    const con = (config: unknown) => ({
      ...base,
      datos: { clave_dato: 'pagos.umbral_pct', config },
    })
    expect(esquemaCrearRequisitoDeDato.safeParse(con({ pct: 50 })).success).toBe(true)
    expect(esquemaCrearRequisitoDeDato.safeParse(con({ pct: '50' })).success).toBe(false)
    expect(
      esquemaCrearRequisitoDeDato.safeParse({
        ...base,
        datos: { clave_dato: 'x', bloqueante: true },
      }).success,
    ).toBe(false)
  })

  it('mover acepta «primero» (nulo) y rechaza un id que no es guid', () => {
    const mover = { id: ID, ambito: 'repuestos', actualizadoEnEsperado: 'v' }
    expect(esquemaMoverRequisito.safeParse({ ...mover, despuesDe: null }).success).toBe(true)
    expect(esquemaMoverRequisito.safeParse({ ...mover, despuesDe: OTRO }).success).toBe(true)
    expect(esquemaMoverRequisito.safeParse({ ...mover, despuesDe: 'x' }).success).toBe(false)
  })

  it('eliminar y leer opciones piden ids guid', () => {
    expect(
      esquemaEliminarRequisito.safeParse({
        id: ID,
        ambito: 'vehiculos',
        actualizadoEnEsperado: 'v',
      }).success,
    ).toBe(true)
    expect(
      esquemaEliminarRequisito.safeParse({
        id: 'x',
        ambito: 'vehiculos',
        actualizadoEnEsperado: 'v',
      }).success,
    ).toBe(false)
    expect(esquemaLeerOpciones.safeParse({ flujoId: 'x', ambito: 'vehiculos' }).success).toBe(false)
    expect(esquemaLeerOpciones.safeParse({ flujoId: ID }).success).toBe(false)
    expect(esquemaLeerOpciones.safeParse({ flujoId: ID, ambito: 'repuestos' }).success).toBe(true)
  })
})
