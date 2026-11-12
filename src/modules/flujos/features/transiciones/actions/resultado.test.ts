import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  MOTIVO_SIN_PERMISO_DE_TRANSICIONES,
  comoResultado,
  motivoSinPermisoDeTransiciones,
} from './resultado'

const tiene = (...claves: string[]) =>
  claves.map((clave) => ({ clave, origenId: null })) as unknown as Permisos

describe('motivoSinPermisoDeTransiciones', () => {
  it('el flujo de vehículos pide flujos.configurar; el de repuestos, repuestos.configurar', () => {
    expect(motivoSinPermisoDeTransiciones(tiene('flujos.configurar'), 'vehiculos')).toBeNull()
    expect(motivoSinPermisoDeTransiciones(tiene('repuestos.configurar'), 'repuestos')).toBeNull()
    expect(motivoSinPermisoDeTransiciones(tiene('repuestos.configurar'), 'vehiculos')).toBe(
      MOTIVO_SIN_PERMISO_DE_TRANSICIONES,
    )
    expect(motivoSinPermisoDeTransiciones(tiene('flujos.configurar'), 'repuestos')).toBe(
      MOTIVO_SIN_PERMISO_DE_TRANSICIONES,
    )
    expect(motivoSinPermisoDeTransiciones(tiene(), 'vehiculos')).toBe(
      MOTIVO_SIN_PERMISO_DE_TRANSICIONES,
    )
  })
})

describe('comoResultado', () => {
  it('pone el motivo junto a su campo', () => {
    const error = { codigo: 'regla' as const, mensaje: 'La acción tiene hasta 40 caracteres.' }
    expect(comoResultado({ ok: false, error, campo: 'accion' })).toEqual({
      ok: false,
      error,
      porCampo: { accion: error.mensaje },
    })
    expect(comoResultado({ ok: false, error })).toEqual({ ok: false, error })
    expect(comoResultado({ ok: true, data: 1 })).toEqual({ ok: true, data: 1 })
  })
})
