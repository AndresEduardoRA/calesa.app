import { describe, expect, it } from 'vitest'
import { CLAVES_PERMISO, type Concesion, type Permisos } from '@/shared/lib/permisos'
import { BLOQUES_BANDEJA, bloquesVisibles } from './bandeja'

function concesiones(...claves: Concesion['clave'][]): Permisos {
  return claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' }))
}

describe('bloquesVisibles', () => {
  it('sin permisos no hay bloques', () => {
    expect(bloquesVisibles([])).toEqual([])
  })

  it('quien vende ve lo suyo y nada de logística', () => {
    const claves = bloquesVisibles(concesiones('leads.ver', 'leads.crear')).map((b) => b.clave)
    expect(claves).toEqual(['recordatorios', 'leads-sin-seguimiento', 'turnos-web'])
  })

  it('quien mueve vehículos ve lo suyo y nada de leads', () => {
    const claves = bloquesVisibles(
      concesiones('logistica.ver', 'logistica.documentos.aprobar'),
    ).map((b) => b.clave)
    expect(claves).toEqual(['vehiculos-trabados', 'documentos-por-aprobar', 'alertas-demora'])
  })

  it('un permiso acotado a un origen alcanza para ver el bloque', () => {
    const permisos: Permisos = [{ clave: 'logistica.ver', origenId: 'origen-1', alcance: 'todos' }]
    expect(bloquesVisibles(permisos).map((b) => b.clave)).toContain('vehiculos-trabados')
  })

  it('con todos los permisos se ven todos', () => {
    expect(bloquesVisibles(concesiones(...CLAVES_PERMISO))).toHaveLength(BLOQUES_BANDEJA.length)
  })
})

describe('BLOQUES_BANDEJA', () => {
  it('no repite claves y todo bloque exige al menos un permiso', () => {
    const claves = BLOQUES_BANDEJA.map((bloque) => bloque.clave)
    expect(new Set(claves).size).toBe(claves.length)
    for (const bloque of BLOQUES_BANDEJA) {
      expect(bloque.permisos.length).toBeGreaterThan(0)
    }
  })
})
