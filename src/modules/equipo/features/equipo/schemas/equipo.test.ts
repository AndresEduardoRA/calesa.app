import { describe, expect, it } from 'vitest'
import { esquemaBloquear, esquemaInvitar, esquemaRolDePersona } from './equipo'

const ID = '00000000-0000-0000-0000-000000000002'

describe('esquemaInvitar', () => {
  it('normaliza el correo y acepta el nombre vacío', () => {
    expect(esquemaInvitar.parse({ email: 'Ana@Ejemplo.com', nombre: ' ', rolId: ID })).toEqual({
      email: 'ana@ejemplo.com',
      nombre: '',
      rolId: ID,
    })
  })

  it('exige un correo válido y un rol', () => {
    expect(esquemaInvitar.safeParse({ email: 'ana', nombre: '', rolId: ID }).success).toBe(false)
    expect(esquemaInvitar.safeParse({ email: 'a@b.co', nombre: '', rolId: '' }).success).toBe(false)
  })
})

describe('esquemaRolDePersona y esquemaBloquear', () => {
  it('piden ids de la base', () => {
    expect(esquemaRolDePersona.safeParse({ personaId: ID, rolId: ID }).success).toBe(true)
    expect(esquemaRolDePersona.safeParse({ personaId: 'sofia', rolId: ID }).success).toBe(false)
    expect(esquemaBloquear.safeParse({ personaId: ID, bloquear: true }).success).toBe(true)
    expect(esquemaBloquear.safeParse({ personaId: ID }).success).toBe(false)
  })
})
