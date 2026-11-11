import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  MOTIVO_SIN_PERMISO_TIPOS_DEL_FLUJO,
  MOTIVO_SIN_PERMISO_TIPOS_DE_EMPRESA,
  comoResultado,
  motivoSinPermisoDelGrupo,
} from './resultado'

const FLUJO = '11111111-1111-4111-8111-111111111111'
const tiene = (...claves: string[]) =>
  claves.map((clave) => ({ clave, origenId: null })) as unknown as Permisos

describe('motivoSinPermisoDelGrupo', () => {
  it('los de toda la empresa, sólo con los catálogos de logística', () => {
    expect(motivoSinPermisoDelGrupo(tiene('logistica.catalogos.gestionar'), null)).toBeNull()
    expect(motivoSinPermisoDelGrupo(tiene('flujos.configurar'), null)).toBe(
      MOTIVO_SIN_PERMISO_TIPOS_DE_EMPRESA,
    )
    expect(motivoSinPermisoDelGrupo(tiene(), null)).toBe(MOTIVO_SIN_PERMISO_TIPOS_DE_EMPRESA)
  })

  it('los de un flujo, con flujos o repuestos configurar, no con los catálogos', () => {
    expect(motivoSinPermisoDelGrupo(tiene('flujos.configurar'), FLUJO)).toBeNull()
    expect(motivoSinPermisoDelGrupo(tiene('repuestos.configurar'), FLUJO)).toBeNull()
    expect(motivoSinPermisoDelGrupo(tiene('logistica.catalogos.gestionar'), FLUJO)).toBe(
      MOTIVO_SIN_PERMISO_TIPOS_DEL_FLUJO,
    )
  })
})

describe('comoResultado', () => {
  it('pone el motivo junto a su campo', () => {
    const error = { codigo: 'regla' as const, mensaje: 'Elige al menos un formato.' }
    expect(comoResultado({ ok: false, error, campo: 'formatos' })).toEqual({
      ok: false,
      error,
      porCampo: { formatos: 'Elige al menos un formato.' },
    })
    expect(comoResultado({ ok: false, error })).toEqual({ ok: false, error })
    expect(comoResultado({ ok: true, data: 1 })).toEqual({ ok: true, data: 1 })
  })
})
