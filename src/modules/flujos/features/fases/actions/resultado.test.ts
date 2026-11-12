import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { MOTIVO_SIN_PERMISO_DE_FASES, comoResultado, motivoSinPermisoDeFases } from './resultado'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const OTRO = '33333333-3333-4333-8333-333333333333'
const tiene = (...concesiones: [string, string | null][]) =>
  concesiones.map(([clave, origenId]) => ({ clave, origenId })) as unknown as Permisos

describe('motivoSinPermisoDeFases', () => {
  it('un flujo de origen, con flujos.configurar en ese origen (o en todos)', () => {
    expect(motivoSinPermisoDeFases(tiene(['flujos.configurar', ORIGEN]), ORIGEN)).toBeNull()
    expect(motivoSinPermisoDeFases(tiene(['flujos.configurar', null]), ORIGEN)).toBeNull()
    expect(motivoSinPermisoDeFases(tiene(['flujos.configurar', OTRO]), ORIGEN)).toBe(
      MOTIVO_SIN_PERMISO_DE_FASES,
    )
  })

  it('el de repuestos, con repuestos.configurar y no con flujos.configurar', () => {
    expect(motivoSinPermisoDeFases(tiene(['repuestos.configurar', null]), null)).toBeNull()
    expect(motivoSinPermisoDeFases(tiene(['flujos.configurar', null]), null)).toBe(
      MOTIVO_SIN_PERMISO_DE_FASES,
    )
    expect(motivoSinPermisoDeFases(tiene(), null)).toBe(MOTIVO_SIN_PERMISO_DE_FASES)
  })

  it('repuestos.configurar no abre un flujo de origen', () => {
    expect(motivoSinPermisoDeFases(tiene(['repuestos.configurar', null]), ORIGEN)).toBe(
      MOTIVO_SIN_PERMISO_DE_FASES,
    )
  })
})

describe('comoResultado', () => {
  it('pone el motivo junto a su campo', () => {
    const error = { codigo: 'duplicado' as const, mensaje: 'Ya hay una fase «A» en este flujo.' }
    expect(comoResultado({ ok: false, error, campo: 'nombre' })).toEqual({
      ok: false,
      error,
      porCampo: { nombre: error.mensaje },
    })
    expect(comoResultado({ ok: false, error })).toEqual({ ok: false, error })
    expect(comoResultado({ ok: true, data: 1 })).toEqual({ ok: true, data: 1 })
  })
})
