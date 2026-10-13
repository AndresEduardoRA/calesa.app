import { describe, expect, it } from 'vitest'
import { SIN_SERVIDOR, respuestaDe } from './envio'

describe('respuestaDe', () => {
  it('devuelve el resultado de la action', async () => {
    const resultado = await respuestaDe(Promise.resolve({ data: { ok: true as const, data: 7 } }))
    expect(resultado).toEqual({ ok: true, data: 7 })
  })

  it('un error del servidor es el error', async () => {
    const error = { codigo: 'no_autenticado' as const, mensaje: 'Tu sesión venció.' }
    expect(await respuestaDe(Promise.resolve({ serverError: error }))).toEqual({ ok: false, error })
  })

  it('una action que no llegó al servidor es un error legible, no una excepción', async () => {
    const caida = await respuestaDe(Promise.reject(new TypeError('Failed to fetch')))
    expect(caida).toEqual({ ok: false, error: { codigo: 'inesperado', mensaje: SIN_SERVIDOR } })
    expect(await respuestaDe(Promise.resolve(undefined))).toEqual(caida)
  })
})
