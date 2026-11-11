import { describe, expect, it } from 'vitest'

import { TOPE_DE_FASES, TOPE_DE_REGLAS } from '../flujo'
import { flujoDeOrigenDesde, reglaActiva } from './flujo-de-origen'

const guid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const fase = (n: number, extra: Record<string, unknown> = {}) => ({
  id: guid(n),
  activa: true,
  es_logistica: true,
  nota_obligatoria: false,
  permite_contenedor: false,
  permite_aduana: false,
  demora_dias: null,
  ...extra,
})
const fila = (extra: Record<string, unknown> = {}) => ({
  id: guid(1),
  flujos_reglas: [
    { regla: 'transporte', activa: true },
    { regla: 'aduana', activa: false },
  ],
  fases: [fase(10), fase(11, { nota_obligatoria: true, demora_dias: 5, permite_aduana: true })],
  ...extra,
})

describe('flujoDeOrigenDesde', () => {
  it('una fila válida sale en camelCase, con las reglas activas y las fases en su orden', () => {
    const r = flujoDeOrigenDesde(fila())
    expect(r).toEqual({
      ok: true,
      data: {
        flujoId: guid(1),
        reglasActivas: ['transporte'],
        fases: [
          {
            id: guid(10),
            activa: true,
            esLogistica: true,
            notaObligatoria: false,
            permiteContenedor: false,
            permiteAduana: false,
            demoraDias: null,
          },
          {
            id: guid(11),
            activa: true,
            esLogistica: true,
            notaObligatoria: true,
            permiteContenedor: false,
            permiteAduana: true,
            demoraDias: 5,
          },
        ],
      },
    })
  })

  it('sin fila (el origen no tiene flujo de vehículos) es ok con null', () => {
    expect(flujoDeOrigenDesde(null)).toEqual({ ok: true, data: null })
  })

  it('un id que no es guid es un error, no una lista cortada', () => {
    const r = flujoDeOrigenDesde(fila({ fases: [fase(10, { id: 'no-es-guid' })] }))
    expect(r.ok).toBe(false)
    expect(flujoDeOrigenDesde(fila({ id: 'tampoco' })).ok).toBe(false)
  })

  it('una columna con otro tipo es un error', () => {
    expect(flujoDeOrigenDesde(fila({ fases: [fase(10, { demora_dias: 'cinco' })] })).ok).toBe(false)
  })

  it('al llegar al tope de fases o de reglas es un error visible', () => {
    const fases = Array.from({ length: TOPE_DE_FASES + 1 }, (_, i) => fase(1000 + i))
    expect(flujoDeOrigenDesde(fila({ fases })).ok).toBe(false)
    const reglas = Array.from({ length: TOPE_DE_REGLAS + 1 }, (_, i) => ({
      regla: `r${String(i)}`,
      activa: true,
    }))
    expect(flujoDeOrigenDesde(fila({ flujos_reglas: reglas })).ok).toBe(false)
    const justo = Array.from({ length: TOPE_DE_FASES }, (_, i) => fase(1000 + i))
    expect(flujoDeOrigenDesde(fila({ fases: justo })).ok).toBe(true)
  })
})

describe('reglaActiva', () => {
  const flujo = { flujoId: guid(1), reglasActivas: ['transporte'], fases: [] }
  it('es verdadera sólo si la regla está en la lista', () => {
    expect(reglaActiva(flujo, 'transporte')).toBe(true)
    expect(reglaActiva(flujo, 'aduana')).toBe(false)
    expect(reglaActiva(flujo, '')).toBe(false)
  })
})
