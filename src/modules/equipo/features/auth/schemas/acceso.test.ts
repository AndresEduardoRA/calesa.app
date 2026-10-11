import { describe, expect, it } from 'vitest'
import { esquemaIngreso, esquemaNuevaContrasena, esquemaRegistro } from './acceso'

describe('esquemaIngreso', () => {
  it('normaliza el correo', () => {
    const leido = esquemaIngreso.parse({ email: '  Ana@Ejemplo.COM ', contrasena: 'x' })
    expect(leido.email).toBe('ana@ejemplo.com')
  })

  it('rechaza un correo mal escrito y una contraseña vacía', () => {
    expect(esquemaIngreso.safeParse({ email: 'ana@', contrasena: 'x' }).success).toBe(false)
    expect(esquemaIngreso.safeParse({ email: 'ana@ejemplo.com', contrasena: '' }).success).toBe(
      false,
    )
  })
})

describe('esquemaRegistro', () => {
  it('exige nombre y 8 caracteres de contraseña', () => {
    const base = { nombre: 'Ana Quispe', email: 'ana@ejemplo.com', contrasena: 'clave-segura' }
    expect(esquemaRegistro.safeParse(base).success).toBe(true)
    expect(esquemaRegistro.safeParse({ ...base, contrasena: 'corta' }).success).toBe(false)
    expect(esquemaRegistro.safeParse({ ...base, nombre: ' ' }).success).toBe(false)
  })
})

describe('esquemaNuevaContrasena', () => {
  it('marca el segundo campo cuando no coinciden', () => {
    const leido = esquemaNuevaContrasena.safeParse({
      contrasena: 'clave-segura',
      repetida: 'clave-distinta',
    })
    expect(leido.success).toBe(false)
    expect(leido.error?.issues[0]?.path).toEqual(['repetida'])
  })
})
