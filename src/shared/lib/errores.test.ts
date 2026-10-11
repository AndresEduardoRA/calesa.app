import { describe, expect, it } from 'vitest'
import {
  MENSAJE_CONFLICTO,
  MENSAJE_INESPERADO,
  conflicto,
  errorDePostgrest,
  fallo,
  ok,
} from './errores'

describe('ok / fallo', () => {
  it('envuelven el resultado como valor', () => {
    expect(ok(3)).toEqual({ ok: true, data: 3 })
    expect(fallo('regla', 'No se puede.')).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'No se puede.' },
    })
  })
})

describe('conflicto', () => {
  it('usa el mensaje de la RPC y cae al genérico si no hay', () => {
    expect(conflicto('Rosa lo movió hace 1 min.')).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Rosa lo movió hace 1 min.' },
    })
    expect(conflicto()).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje: MENSAJE_CONFLICTO },
    })
  })
})

describe('errorDePostgrest', () => {
  it('traduce PT409 a conflicto y conserva el mensaje de la RPC', () => {
    expect(errorDePostgrest({ code: 'PT409', message: 'Rosa lo movió hace 1 min.' })).toEqual({
      codigo: 'conflicto',
      mensaje: 'Rosa lo movió hace 1 min.',
    })
  })

  it('traduce 42501 a sin_permiso con el motivo que escribió la RPC', () => {
    const error = errorDePostgrest({ code: '42501', message: 'No podés bloquearte a vos mismo.' })
    expect(error).toEqual({ codigo: 'sin_permiso', mensaje: 'No podés bloquearte a vos mismo.' })
  })

  it('no muestra el texto técnico de una violación de constraint', () => {
    const error = errorDePostgrest({
      code: '23505',
      message: 'duplicate key value violates unique constraint "roles_clave_key"',
    })
    expect(error).toEqual({ codigo: 'duplicado', mensaje: 'Ya existe un registro con esos datos.' })
  })

  it('usa el mensaje de la RPC cuando un 23503 viene escrito para la persona', () => {
    const error = errorDePostgrest({
      code: '23503',
      message: 'El rol tiene 2 usuario(s): reasignalos antes.',
    })
    expect(error.codigo).toBe('regla')
    expect(error.mensaje).toBe('El rol tiene 2 usuario(s): reasignalos antes.')
  })

  it('cae al genérico si el mensaje llega vacío', () => {
    expect(errorDePostgrest({ code: 'PT409', message: '  ' }).mensaje).toBe(MENSAJE_CONFLICTO)
  })

  it('un código desconocido o ausente es inesperado y no filtra detalles', () => {
    expect(errorDePostgrest({ code: 'XX000', message: 'internal error at 0x1f' })).toEqual({
      codigo: 'inesperado',
      mensaje: MENSAJE_INESPERADO,
    })
    expect(errorDePostgrest({ message: 'fetch failed' }).codigo).toBe('inesperado')
  })
})
