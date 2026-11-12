import { describe, expect, it } from 'vitest'
import {
  esquemaCrearRequisito,
  esquemaEliminarRequisito,
  esquemaGuardarRequisito,
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
  const dato = (datos: unknown, extra: Record<string, unknown> = {}) => ({
    ...base,
    tipo: 'dato',
    datos,
    ...extra,
  })

  it('crear exige ids guid, un ámbito y un tipo conocidos y la clave', () => {
    expect(esquemaCrearRequisito.safeParse(dato({ clave_dato: 'vehiculo.vin' })).success).toBe(true)
    expect(esquemaCrearRequisito.safeParse(dato({ clave_dato: 'x' }, { id: 'no' })).success).toBe(
      false,
    )
    expect(
      esquemaCrearRequisito.safeParse(dato({ clave_dato: 'x' }, { ambito: 'otro' })).success,
    ).toBe(false)
    expect(
      esquemaCrearRequisito.safeParse(dato({ clave_dato: 'x' }, { tipo: 'otro' })).success,
    ).toBe(false)
    expect(esquemaCrearRequisito.safeParse(dato({})).success).toBe(false)
  })

  it('el porcentaje es un número, no un texto, y no se admiten claves de más', () => {
    const con = (config: unknown) => dato({ clave_dato: 'pagos.umbral_pct', config })
    expect(esquemaCrearRequisito.safeParse(con({ pct: 50 })).success).toBe(true)
    expect(esquemaCrearRequisito.safeParse(con({ pct: '50' })).success).toBe(false)
    expect(
      esquemaCrearRequisito.safeParse(dato({ clave_dato: 'x', bloqueante: true })).success,
    ).toBe(false)
  })
})

describe('esquemas de requisitos: documento, espera y guardar', () => {
  it('un documento pide un tipo guid y admite sólo sus claves', () => {
    const documento = (datos: unknown) => ({ ...base, tipo: 'documento', datos })
    expect(
      esquemaCrearRequisito.safeParse(
        documento({
          tipo_documento_id: OTRO,
          min_archivos: 1,
          max_archivos: 3,
          formatos: ['application/pdf'],
          notas: 'x',
        }),
      ).success,
    ).toBe(true)
    expect(esquemaCrearRequisito.safeParse(documento({ tipo_documento_id: 'x' })).success).toBe(
      false,
    )
    expect(
      esquemaCrearRequisito.safeParse(documento({ tipo_documento_id: OTRO, min_archivos: 1.5 }))
        .success,
    ).toBe(false)
    expect(
      esquemaCrearRequisito.safeParse(documento({ tipo_documento_id: OTRO, formatos: [] })).success,
    ).toBe(false)
    // Las claves de otro tipo no pasan.
    expect(
      esquemaCrearRequisito.safeParse(documento({ tipo_documento_id: OTRO, clave_dato: 'x' }))
        .success,
    ).toBe(false)
    expect(
      esquemaCrearRequisito.safeParse(documento({ tipo_documento_id: OTRO, bloqueante: true }))
        .success,
    ).toBe(false)
  })

  it('una espera pide una fase guid y admite sólo sus claves', () => {
    const espera = (datos: unknown) => ({ ...base, tipo: 'espera', datos })
    expect(
      esquemaCrearRequisito.safeParse(espera({ espera_fase_id: OTRO, notas: 'x' })).success,
    ).toBe(true)
    expect(esquemaCrearRequisito.safeParse(espera({ espera_fase_id: 'x' })).success).toBe(false)
    expect(
      esquemaCrearRequisito.safeParse(espera({ espera_fase_id: OTRO, espera_ambito: 'padre' }))
        .success,
    ).toBe(false)
  })

  it('guardar acepta null para vaciar y rechaza claves de más (incluido «bloqueante»)', () => {
    const guardar = (cambios: unknown) => ({
      id: ID,
      ambito: 'vehiculos',
      actualizadoEnEsperado: 'v',
      cambios,
    })
    expect(
      esquemaGuardarRequisito.safeParse(
        guardar({
          min_archivos: null,
          max_archivos: 2,
          formatos: null,
          notas: null,
          config: { pct: 60 },
        }),
      ).success,
    ).toBe(true)
    expect(esquemaGuardarRequisito.safeParse(guardar({})).success).toBe(true)
    expect(esquemaGuardarRequisito.safeParse(guardar({ bloqueante: true })).success).toBe(false)
    expect(esquemaGuardarRequisito.safeParse(guardar({ tipo: 'dato' })).success).toBe(false)
    expect(esquemaGuardarRequisito.safeParse({ ...guardar({}), id: 'x' }).success).toBe(false)
    expect(esquemaGuardarRequisito.safeParse(guardar({ config: { pct: '5' } })).success).toBe(false)
  })
})

describe('esquemas de requisitos: mover, eliminar y leer opciones', () => {
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
