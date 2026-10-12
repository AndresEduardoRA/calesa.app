import { describe, expect, it } from 'vitest'
import { conRed, errorDeAccion, errorDeCampo, valoresDe } from './formularios'

describe('valoresDe', () => {
  it('lee los campos pedidos por nombre', () => {
    const formulario = document.createElement('form')
    formulario.innerHTML =
      '<input name="email" value="ana@ejemplo.com"><input name="otro" value="x">'
    expect(valoresDe(formulario, ['email'])).toEqual({ email: 'ana@ejemplo.com' })
  })

  it('un campo ausente queda vacío', () => {
    const formulario = document.createElement('form')
    expect(valoresDe(formulario, ['nombre'])).toEqual({ nombre: '' })
  })
})

describe('errorDeAccion', () => {
  const error = { codigo: 'regla', mensaje: 'No se puede.' } as const

  it('toma el error que cortó la action antes de ejecutar', () => {
    expect(errorDeAccion({ serverError: error })).toBe(error)
  })

  it('toma el error del Resultado que devolvió la action', () => {
    expect(errorDeAccion({ data: { ok: false, error } })).toBe(error)
  })

  it('sin error devuelve null', () => {
    expect(errorDeAccion({})).toBeNull()
    expect(errorDeAccion({ data: { ok: true, data: 1 } })).toBeNull()
  })
})

describe('errorDeCampo', () => {
  it('da el primer mensaje del campo', () => {
    expect(errorDeCampo({ email: ['Falta el correo.', 'Otro'] }, 'email')).toBe('Falta el correo.')
  })

  it('sin errores o sin ese campo devuelve undefined', () => {
    expect(errorDeCampo(undefined, 'email')).toBeUndefined()
    expect(errorDeCampo<'email' | 'nombre'>({ nombre: ['x'] }, 'email')).toBeUndefined()
  })
})

describe('conRed', () => {
  it('deja pasar la respuesta de la action', async () => {
    const respuesta = { data: { ok: true as const, data: 1 } }
    expect(await conRed(Promise.resolve(respuesta))).toBe(respuesta)
  })

  it('si la action no llega al servidor, lo devuelve como un error que conserva el formulario', async () => {
    const resultado = await conRed(Promise.reject(new TypeError('Failed to fetch')))
    const error = errorDeAccion(resultado)
    expect(error?.codigo).toBe('inesperado')
    expect(error?.mensaje).toContain('Lo que escribiste sigue acá')
  })

  it('una respuesta vacía también es un error', async () => {
    expect(errorDeAccion(await conRed(Promise.resolve(undefined)))).not.toBeNull()
  })
})
