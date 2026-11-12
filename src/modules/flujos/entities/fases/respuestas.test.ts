import { describe, expect, it } from 'vitest'
import {
  impactoDeFaseDeLaBase,
  respuestaDeEliminarFaseDesde,
  respuestaDeFaseDesde,
} from './respuestas'

const VERSION = '2026-11-11T19:52:59.123456+00:00'

describe('respuestaDeFaseDesde', () => {
  it('deja la versión como texto, con sus microsegundos', () => {
    expect(respuestaDeFaseDesde(VERSION)).toEqual({ version: VERSION })
  })
  it('lo que no es una versión, no se entiende', () => {
    expect(respuestaDeFaseDesde('')).toBeNull()
    expect(respuestaDeFaseDesde(null)).toBeNull()
    expect(respuestaDeFaseDesde({ version: VERSION })).toBeNull()
  })
})

describe('respuestaDeEliminarFaseDesde', () => {
  it('lee lo que la base hizo', () => {
    expect(respuestaDeEliminarFaseDesde({ accion: 'jubilada', version: VERSION })).toEqual({
      accion: 'jubilada',
      version: VERSION,
    })
    expect(respuestaDeEliminarFaseDesde({ accion: 'eliminada', version: VERSION })?.accion).toBe(
      'eliminada',
    )
  })
  it('rechaza lo que no entiende', () => {
    expect(respuestaDeEliminarFaseDesde({ accion: 'borrada', version: VERSION })).toBeNull()
    expect(respuestaDeEliminarFaseDesde({ accion: 'jubilada' })).toBeNull()
    expect(respuestaDeEliminarFaseDesde(null)).toBeNull()
  })
})

describe('impactoDeFaseDeLaBase', () => {
  const CRUDO = {
    accion: 'jubilar',
    motivo: 'paradas',
    paradas: 51,
    hay_historial: true,
    esperas: 0,
    unica_inicial: false,
  }
  it('lee el impacto y acota los conteos', () => {
    expect(impactoDeFaseDeLaBase(CRUDO)).toEqual({
      accion: 'jubilar',
      motivo: 'paradas',
      paradas: { n: 50, hayMas: true },
      hayHistorial: true,
      esperas: { n: 0, hayMas: false },
      unicaInicial: false,
    })
  })
  it('el motivo puede ser nulo (eliminar)', () => {
    expect(
      impactoDeFaseDeLaBase({ ...CRUDO, accion: 'eliminar', motivo: null, paradas: 0 })?.motivo,
    ).toBeNull()
  })
  it('lo que no entiende es nulo', () => {
    expect(impactoDeFaseDeLaBase({ ...CRUDO, accion: 'otra' })).toBeNull()
    expect(impactoDeFaseDeLaBase({ ...CRUDO, motivo: 'raro' })).toBeNull()
    expect(impactoDeFaseDeLaBase({ ...CRUDO, paradas: -1 })).toBeNull()
    expect(impactoDeFaseDeLaBase(null)).toBeNull()
  })
})
