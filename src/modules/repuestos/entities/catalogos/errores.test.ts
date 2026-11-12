import { describe, expect, it } from 'vitest'

import { rechazoDeValor, sinFilas, SIN_PERMISO_PARA_LOS_CATALOGOS } from './errores'

// Lo que llega a la persona cuando la base rechaza escribir un valor de catálogo (8.08-2, C6).
describe('errores al escribir un valor de catálogo', () => {
  it('E1 · 23505 es «duplicado», junto al campo del nombre', () => {
    const r = rechazoDeValor({
      code: '23505',
      message: 'duplicate key value violates unique constraint',
    })
    expect(r).toEqual({
      ok: false,
      error: { codigo: 'duplicado', mensaje: 'Ya hay uno con ese nombre.' },
      porCampo: { nombre: 'Ya hay uno con ese nombre.' },
    })
  })

  it('E2 · 23514 con hint en_uso pasa el texto de la base tal cual', () => {
    const message = '“Usado” está en uso: desactívalo para que no se elija más.'
    expect(rechazoDeValor({ code: '23514', message, hint: 'en_uso' })).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: message },
    })
  })

  it('E3 · 23514 sin ese hint no deja pasar el texto técnico', () => {
    const r = rechazoDeValor({
      code: '23514',
      message: 'new row violates check constraint "x"',
      hint: null,
    })
    expect(r).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'El dato no cumple una regla del sistema.' },
    })
  })

  it('E4 · 42501 dice que no tiene permiso para los catálogos', () => {
    expect(rechazoDeValor({ code: '42501', message: 'permission denied' })).toEqual({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: SIN_PERMISO_PARA_LOS_CATALOGOS },
    })
  })

  it('E5 · cero filas: sin permiso si sigue, conflicto si ya no existe', () => {
    expect(sinFilas(true)).toEqual({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: SIN_PERMISO_PARA_LOS_CATALOGOS },
    })
    expect(sinFilas(false)).toEqual({
      ok: false,
      error: {
        codigo: 'conflicto',
        mensaje: 'Este valor ya no existe. Recarga para ver lo nuevo.',
      },
    })
  })
})
