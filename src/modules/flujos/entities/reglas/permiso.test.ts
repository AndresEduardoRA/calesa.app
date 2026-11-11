import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { MOTIVO_SIN_PERMISO_DE_REGLAS, motivoSinPermisoDeReglas } from './permiso'

const tiene = (...claves: string[]) =>
  claves.map((clave) => ({ clave, origenId: null })) as unknown as Permisos

describe('motivoSinPermisoDeReglas', () => {
  it('un flujo de vehículos pide flujos.configurar; el de repuestos, repuestos.configurar', () => {
    expect(motivoSinPermisoDeReglas(tiene('flujos.configurar'), 'vehiculos', null)).toBeNull()
    expect(motivoSinPermisoDeReglas(tiene('repuestos.configurar'), 'vehiculos', null)).toBe(
      MOTIVO_SIN_PERMISO_DE_REGLAS,
    )
    expect(motivoSinPermisoDeReglas(tiene('repuestos.configurar'), 'repuestos', null)).toBeNull()
    expect(motivoSinPermisoDeReglas(tiene('flujos.configurar'), 'repuestos', null)).toBe(
      MOTIVO_SIN_PERMISO_DE_REGLAS,
    )
  })

  it('sin saber el flujo, cualquiera de las dos; sin ninguna, el motivo', () => {
    expect(motivoSinPermisoDeReglas(tiene('repuestos.configurar'), null, null)).toBeNull()
    expect(motivoSinPermisoDeReglas(tiene('logistica.catalogos.gestionar'), null, null)).toBe(
      MOTIVO_SIN_PERMISO_DE_REGLAS,
    )
  })
})
