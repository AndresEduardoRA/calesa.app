import { describe, expect, it, vi } from 'vitest'
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import { BLOQUES_BANDEJA } from '../../../entities/bandeja'

vi.mock('server-only', () => ({}))

const { REGISTRO_DE_BLOQUES, bloquesParaMontar } = await import('./registro')

// Una sesión con exactamente estas claves, sobre todos los orígenes.
function permisosCon(claves: readonly ClavePermiso[]): Permisos {
  return claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' }))
}

describe('registro de bloques de la bandeja', () => {
  it('cada clave del catálogo tiene su entrada en el registro y al revés', () => {
    const delCatalogo = BLOQUES_BANDEJA.map((bloque) => bloque.clave).sort()
    expect(Object.keys(REGISTRO_DE_BLOQUES).sort()).toEqual(delCatalogo)
  })

  it('sin permisos no se monta ningún bloque', () => {
    expect(bloquesParaMontar(permisosCon([]))).toEqual([])
  })

  it('un bloque sin su permiso no se monta', () => {
    const claves = bloquesParaMontar(permisosCon(['logistica.ver'])).map((m) => m.bloque.clave)
    expect(claves).toEqual(['vehiculos-trabados', 'alertas-demora'])
    expect(claves).not.toContain('recordatorios')
    expect(claves).not.toContain('equipo-sin-rol')
  })

  it('con todos los permisos se montan los diez, cada uno con su cuerpo', () => {
    const todas = BLOQUES_BANDEJA.flatMap((bloque) => [...bloque.permisos])
    const permisos = permisosCon(todas)
    expect(todas.every((clave) => puede(permisos, clave))).toBe(true)
    const montados = bloquesParaMontar(permisos)
    expect(montados).toHaveLength(BLOQUES_BANDEJA.length)
    for (const { bloque, cuerpo } of montados) {
      expect(cuerpo).toBe(REGISTRO_DE_BLOQUES[bloque.clave])
    }
  })
})
