import { describe, expect, it } from 'vitest'
import { esquemaDeNotaDeTabla, resultadoDePublicar } from './publicacion'

const ORIGEN = '11111111-1111-4111-8111-111111111111'

describe('resultadoDePublicar', () => {
  it('entra: la versión nueva y la N+1 de cada fórmula', () => {
    expect(
      resultadoDePublicar({
        data: { version: 4, formulas: [{ origen_id: ORIGEN, version: 9 }] },
        error: null,
      }),
    ).toEqual({ ok: true, data: { version: 4, formulas: [{ origenId: ORIGEN, version: 9 }] } })
  })

  it('una respuesta con otra forma es inesperada', () => {
    expect(resultadoDePublicar({ data: { version: 'x' }, error: null })).toMatchObject({
      ok: false,
      error: { codigo: 'inesperado' },
    })
  })

  it('el PT409 es un conflicto con el mensaje tal cual', () => {
    const mensaje = 'Ana publicó la versión 3 de esta tabla hace 2 min.'
    expect(resultadoDePublicar({ data: null, error: { code: 'PT409', message: mensaje } })).toEqual(
      {
        ok: false,
        error: { codigo: 'conflicto', mensaje },
      },
    )
  })

  it('un 22023 con hint va a su campo con el mensaje tal cual, aunque diga «columna»', () => {
    const mensaje = 'La fila 1: la tabla no tiene la columna «otra».'
    expect(
      resultadoDePublicar({
        data: null,
        error: { code: '22023', message: mensaje, hint: 'filas.0.otra' },
      }),
    ).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje },
      porCampo: { 'filas.0.otra': mensaje },
    })
  })

  it('el 42501 y un 22023 sin hint pasan por errorDePostgrest', () => {
    expect(
      resultadoDePublicar({
        data: null,
        error: { code: '42501', message: 'No tienes el permiso.' },
      }),
    ).toEqual({ ok: false, error: { codigo: 'sin_permiso', mensaje: 'No tienes el permiso.' } })
    expect(
      resultadoDePublicar({ data: null, error: { code: '22023', message: 'violates x' } }),
    ).toEqual({ ok: false, error: { codigo: 'regla', mensaje: 'Hay un dato que no es válido.' } })
  })
})

describe('esquemaDeNotaDeTabla', () => {
  it('recorta y pide de 1 a 2.000', () => {
    expect(esquemaDeNotaDeTabla.parse('  octubre ')).toBe('octubre')
    expect(esquemaDeNotaDeTabla.safeParse('   ').success).toBe(false)
    expect(esquemaDeNotaDeTabla.safeParse('a'.repeat(2001)).success).toBe(false)
  })
})
