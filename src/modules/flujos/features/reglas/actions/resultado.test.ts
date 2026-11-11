import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { MOTIVO_SIN_PERMISO_DE_REGLAS } from '../../../entities/reglas/permiso'
import { comoResultado, motivoSinPermisoDeReglas, sinPermisoDeReglas } from './resultado'

const tiene = (...claves: string[]) =>
  claves.map((clave) => ({ clave, origenId: null })) as unknown as Permisos

describe('la primera llave de las actions de reglas', () => {
  it('sin flujos.configurar ni repuestos.configurar, el motivo; con una, nada', () => {
    expect(motivoSinPermisoDeReglas(tiene(), null, null)).toBe(MOTIVO_SIN_PERMISO_DE_REGLAS)
    expect(motivoSinPermisoDeReglas(tiene('flujos.configurar'), null, null)).toBeNull()
    expect(sinPermisoDeReglas(MOTIVO_SIN_PERMISO_DE_REGLAS)).toEqual({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: MOTIVO_SIN_PERMISO_DE_REGLAS },
    })
  })
})

describe('comoResultado', () => {
  it('pone el motivo junto a su campo', () => {
    const error = { codigo: 'regla' as const, mensaje: 'No se puede apagar esta regla.' }
    expect(comoResultado({ ok: false, error, campo: 'regla' })).toEqual({
      ok: false,
      error,
      porCampo: { regla: 'No se puede apagar esta regla.' },
    })
    expect(comoResultado({ ok: true, data: 'v' })).toEqual({ ok: true, data: 'v' })
  })
})
