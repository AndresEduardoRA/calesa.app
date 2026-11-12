import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  MOTIVO_SIN_PERMISO_DE_REQUISITOS,
  comoResultado,
  motivoSinPermisoDeRequisitos,
} from './resultado'

const tiene = (...claves: string[]) =>
  claves.map((clave) => ({ clave, origenId: null })) as unknown as Permisos

describe('motivoSinPermisoDeRequisitos', () => {
  it('el flujo de vehículos pide flujos.configurar; el de repuestos, repuestos.configurar', () => {
    expect(motivoSinPermisoDeRequisitos(tiene('flujos.configurar'), 'vehiculos')).toBeNull()
    expect(motivoSinPermisoDeRequisitos(tiene('repuestos.configurar'), 'repuestos')).toBeNull()
    expect(motivoSinPermisoDeRequisitos(tiene('repuestos.configurar'), 'vehiculos')).toBe(
      MOTIVO_SIN_PERMISO_DE_REQUISITOS,
    )
    expect(motivoSinPermisoDeRequisitos(tiene('flujos.configurar'), 'repuestos')).toBe(
      MOTIVO_SIN_PERMISO_DE_REQUISITOS,
    )
  })

  it('sin ninguna de las dos no hay permiso, en ningún ámbito', () => {
    expect(motivoSinPermisoDeRequisitos(tiene(), 'vehiculos')).toBe(
      MOTIVO_SIN_PERMISO_DE_REQUISITOS,
    )
    expect(motivoSinPermisoDeRequisitos(tiene('logistica.catalogos.gestionar'), 'repuestos')).toBe(
      MOTIVO_SIN_PERMISO_DE_REQUISITOS,
    )
  })
})

describe('comoResultado', () => {
  it('pone el motivo junto a su campo', () => {
    const error = { codigo: 'regla' as const, mensaje: 'Las notas tienen hasta 500 caracteres.' }
    expect(comoResultado({ ok: false, error, campo: 'notas' })).toEqual({
      ok: false,
      error,
      porCampo: { notas: error.mensaje },
    })
    expect(comoResultado({ ok: false, error })).toEqual({ ok: false, error })
    expect(comoResultado({ ok: true, data: 1 })).toEqual({ ok: true, data: 1 })
  })
})
