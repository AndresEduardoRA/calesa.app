import { describe, expect, it } from 'vitest'
import { esquemaGuardarLead } from './guardar'

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const VERSION = '2026-10-14T10:05:00.123456+00:00'

describe('esquemaGuardarLead', () => {
  it('acepta lo que cambió, con la versión que tenía quien edita', () => {
    const leido = esquemaGuardarLead.safeParse({
      id: ID,
      actualizadoEnEsperado: VERSION,
      cambios: { nombre: ' Ana ', tipo: 'cliente', atributos: { ciudad: 'La Paz', edad: null } },
    })
    expect(leido.success).toBe(true)
    if (leido.success) {
      expect(leido.data.cambios.nombre).toBe('Ana')
    }
  })

  it('sin cambios no hay nada que guardar', () => {
    expect(
      esquemaGuardarLead.safeParse({ id: ID, actualizadoEnEsperado: VERSION, cambios: {} }).success,
    ).toBe(false)
  })

  it('la versión es obligatoria', () => {
    expect(esquemaGuardarLead.safeParse({ id: ID, cambios: { nombre: 'Ana' } }).success).toBe(false)
    expect(
      esquemaGuardarLead.safeParse({
        id: ID,
        actualizadoEnEsperado: '',
        cambios: { nombre: 'Ana' },
      }).success,
    ).toBe(false)
  })

  it('un id que no es un guid, un tipo que no existe o un nombre largo no pasan', () => {
    const base = { actualizadoEnEsperado: VERSION }
    expect(
      esquemaGuardarLead.safeParse({ ...base, id: 'x', cambios: { nombre: 'Ana' } }).success,
    ).toBe(false)
    expect(
      esquemaGuardarLead.safeParse({ ...base, id: ID, cambios: { tipo: 'marciano' } }).success,
    ).toBe(false)
    expect(
      esquemaGuardarLead.safeParse({ ...base, id: ID, cambios: { nombre: 'x'.repeat(121) } })
        .success,
    ).toBe(false)
  })

  it('el teléfono no viaja por acá: una clave que no es de la ficha se descarta y no cuenta', () => {
    const leido = esquemaGuardarLead.safeParse({
      id: ID,
      actualizadoEnEsperado: VERSION,
      cambios: { telefono_principal: '70011002' },
    })
    expect(leido.success).toBe(false)
  })
})
