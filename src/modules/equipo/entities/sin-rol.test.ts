import { describe, expect, it } from 'vitest'
import { personasSinRolDesde, rutaDeLaPersona } from './sin-rol'

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'

describe('personasSinRolDesde', () => {
  it('el nombre vacío cae al correo', () => {
    expect(
      personasSinRolDesde([
        { id: ID, nombre: '  ', email: 'a@x.com' },
        { id: '5a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11', nombre: 'Ana', email: 'ana@x.com' },
      ]),
    ).toEqual([
      { id: ID, nombre: 'a@x.com' },
      { id: '5a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11', nombre: 'Ana' },
    ])
  })

  it('una fila sin id (o con un id que no es uuid) se descarta', () => {
    expect(
      personasSinRolDesde([
        { nombre: 'Sin id', email: 'a@x.com' },
        { id: 'no-es-uuid', nombre: 'Mal', email: 'b@x.com' },
      ]),
    ).toEqual([])
  })

  it('lo que no es una lista vuelve vacío', () => {
    expect(personasSinRolDesde(null)).toEqual([])
  })
})

describe('rutaDeLaPersona', () => {
  it('abre Equipo con la persona', () => {
    expect(rutaDeLaPersona(ID)).toBe(`/configuracion/equipo?persona=${ID}`)
  })
})
