import { describe, expect, it } from 'vitest'
import {
  MENSAJE_CREDENCIALES,
  MENSAJE_ENLACE_VENCIDO,
  MENSAJE_REGISTRO_CERRADO,
  errorDeAuth,
  esRechazoDeRegistro,
} from './errores-acceso'

describe('errorDeAuth', () => {
  it('credenciales malas dan el mismo mensaje exista o no el correo', () => {
    const error = errorDeAuth({ code: 'invalid_credentials', message: 'Invalid login credentials' })
    expect(error).toEqual({ codigo: 'validacion', mensaje: MENSAJE_CREDENCIALES })
    expect(error.mensaje).not.toMatch(/existe|registrad/i)
  })

  it('el rechazo del trigger de registro se lee como registro cerrado', () => {
    expect(
      errorDeAuth({ code: 'unexpected_failure', message: 'Database error saving new user' }),
    ).toEqual({ codigo: 'regla', mensaje: MENSAJE_REGISTRO_CERRADO })
  })

  it('un enlace vencido o usado lo dice', () => {
    expect(errorDeAuth({ code: 'otp_expired', message: 'Email link is invalid' }).mensaje).toBe(
      MENSAJE_ENLACE_VENCIDO,
    )
  })

  it('una sesión que ya no existe pide volver a ingresar', () => {
    expect(errorDeAuth({ code: 'session_not_found', message: 'x' }).codigo).toBe('no_autenticado')
  })

  it('lo desconocido no muestra el texto crudo de Auth', () => {
    const error = errorDeAuth({ code: 'algo_nuevo', message: 'User with this email not found' })
    expect(error.codigo).toBe('inesperado')
    expect(error.mensaje).not.toContain('email')
  })

  it('sin código también cae en inesperado', () => {
    expect(errorDeAuth({ message: 'fetch failed' }).codigo).toBe('inesperado')
  })
})

describe('esRechazoDeRegistro', () => {
  it('reconoce el texto que Auth pone en lugar del mensaje del trigger', () => {
    expect(esRechazoDeRegistro('Database error saving new user')).toBe(true)
    expect(esRechazoDeRegistro('access_denied')).toBe(false)
    expect(esRechazoDeRegistro(null)).toBe(false)
  })
})
