import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { alcanceOtorgable, concesionDominada, rolDominado } from './dominancia'

const OFICINA = '11111111-1111-1111-1111-111111111111'
const USA = '22222222-2222-2222-2222-222222222222'

// Gestiona roles, y ve vehículos sólo de Oficina y sólo los propios.
const gestora: Permisos = [
  { clave: 'equipo.roles.gestionar', origenId: null, alcance: 'todos' },
  { clave: 'vehiculos.ver', origenId: OFICINA, alcance: 'propios' },
]
const duena: Permisos = [
  { clave: 'equipo.roles.gestionar', origenId: null, alcance: 'todos' },
  { clave: 'vehiculos.ver', origenId: null, alcance: 'todos' },
  { clave: 'leads.crear', origenId: null, alcance: 'todos' },
]

describe('concesionDominada', () => {
  it('lo que tengo, lo puedo dar', () => {
    expect(
      concesionDominada(gestora, { clave: 'vehiculos.ver', origenId: OFICINA, alcance: 'propios' }),
    ).toBe(true)
  })

  it('un permiso que no tengo, no', () => {
    expect(
      concesionDominada(gestora, { clave: 'leads.crear', origenId: null, alcance: 'todos' }),
    ).toBe(false)
  })

  it('no puedo dar otro origen, ni todos los orígenes teniendo uno', () => {
    expect(
      concesionDominada(gestora, { clave: 'vehiculos.ver', origenId: USA, alcance: 'propios' }),
    ).toBe(false)
    expect(
      concesionDominada(gestora, { clave: 'vehiculos.ver', origenId: null, alcance: 'propios' }),
    ).toBe(false)
  })

  it('no puedo dar «todo» teniendo «lo propio»', () => {
    expect(
      concesionDominada(gestora, { clave: 'vehiculos.ver', origenId: OFICINA, alcance: 'todos' }),
    ).toBe(false)
  })

  it('quien lo tiene en todos los orígenes lo da en cualquiera', () => {
    expect(
      concesionDominada(duena, { clave: 'vehiculos.ver', origenId: USA, alcance: 'todos' }),
    ).toBe(true)
  })
})

describe('rolDominado', () => {
  it('domino un rol si domino todas sus concesiones', () => {
    expect(rolDominado(duena, gestora)).toBe(true)
    expect(rolDominado(gestora, duena)).toBe(false)
  })

  it('un rol sin concesiones lo domina cualquiera', () => {
    expect(rolDominado([], [])).toBe(true)
  })
})

describe('alcanceOtorgable', () => {
  it('dice el alcance más amplio que puedo dar, o que no puedo', () => {
    expect(alcanceOtorgable(duena, 'vehiculos.ver', USA)).toBe('todos')
    expect(alcanceOtorgable(gestora, 'vehiculos.ver', OFICINA)).toBe('propios')
    expect(alcanceOtorgable(gestora, 'vehiculos.ver', null)).toBeNull()
    expect(alcanceOtorgable(gestora, 'leads.crear', null)).toBeNull()
  })
})
