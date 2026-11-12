import { describe, expect, it } from 'vitest'
import {
  esquemaCrearFase,
  esquemaGuardarFase,
  esquemaLeerImpactoDeFase,
  esquemaMoverFase,
} from './fases'

const ID = '11111111-1111-4111-8111-111111111111'
const FLUJO = '22222222-2222-4222-8222-222222222222'
const VERSION = '2026-11-11T19:52:59.123456+00:00'

describe('esquemaCrearFase', () => {
  const base = { id: ID, flujoId: FLUJO, origenId: null, actualizadoEnEsperado: VERSION }

  it('acepta el origen nulo (repuestos) y sólo las claves de la lista', () => {
    expect(
      esquemaCrearFase.safeParse({ ...base, datos: { nombre: 'A', color: '#465fff' } }).success,
    ).toBe(true)
    expect(esquemaCrearFase.safeParse({ ...base, datos: {} }).success).toBe(true)
  })

  it.each(['activa', 'orden', 'flujo_id', 'id'])('rechaza la clave «%s»', (clave) => {
    expect(
      esquemaCrearFase.safeParse({ ...base, datos: { nombre: 'A', [clave]: true } }).success,
    ).toBe(false)
  })

  it('los ids son guid y la versión no es vacía', () => {
    expect(esquemaCrearFase.safeParse({ ...base, flujoId: 'x', datos: {} }).success).toBe(false)
    expect(
      esquemaCrearFase.safeParse({ ...base, actualizadoEnEsperado: '', datos: {} }).success,
    ).toBe(false)
    expect(esquemaCrearFase.safeParse({ ...base, origenId: 'x', datos: {} }).success).toBe(false)
  })
})

describe('esquemaGuardarFase', () => {
  const base = { id: ID, origenId: FLUJO, actualizadoEnEsperado: VERSION }

  it('pide al menos un cambio', () => {
    expect(esquemaGuardarFase.safeParse({ ...base, cambios: {} }).success).toBe(false)
    expect(esquemaGuardarFase.safeParse({ ...base, cambios: { es_final: true } }).success).toBe(
      true,
    )
  })

  it('lleva nulos en lo opcional y números enteros en la demora', () => {
    expect(
      esquemaGuardarFase.safeParse({ ...base, cambios: { descripcion: null, demora_dias: null } })
        .success,
    ).toBe(true)
    expect(esquemaGuardarFase.safeParse({ ...base, cambios: { demora_dias: 1.5 } }).success).toBe(
      false,
    )
    expect(esquemaGuardarFase.safeParse({ ...base, cambios: { nombre: null } }).success).toBe(false)
  })

  it('rechaza activa y orden: se cambian por jubilar, reactivar y mover', () => {
    expect(esquemaGuardarFase.safeParse({ ...base, cambios: { activa: false } }).success).toBe(
      false,
    )
    expect(esquemaGuardarFase.safeParse({ ...base, cambios: { orden: 10 } }).success).toBe(false)
  })
})

describe('esquemaMoverFase y esquemaLeerImpactoDeFase', () => {
  it('«después de» puede ser nulo (primera) pero no un texto cualquiera', () => {
    const base = { id: ID, origenId: null, actualizadoEnEsperado: VERSION }
    expect(esquemaMoverFase.safeParse({ ...base, despuesDe: null }).success).toBe(true)
    expect(esquemaMoverFase.safeParse({ ...base, despuesDe: FLUJO }).success).toBe(true)
    expect(esquemaMoverFase.safeParse({ ...base, despuesDe: 'x' }).success).toBe(false)
    expect(esquemaMoverFase.safeParse(base).success).toBe(false)
  })

  it('leer el impacto pide la fase y el origen', () => {
    expect(esquemaLeerImpactoDeFase.safeParse({ id: ID, origenId: null }).success).toBe(true)
    expect(esquemaLeerImpactoDeFase.safeParse({ id: ID }).success).toBe(false)
  })
})
