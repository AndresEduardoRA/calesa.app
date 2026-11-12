import { describe, expect, it } from 'vitest'
import { MENSAJE_INESPERADO } from '@/shared/lib/errores'
import { rechazoDeStock } from './errores'

describe('el rechazo de la base al mover stock', () => {
  it('la cantidad va junto a su campo con el texto de la base', () => {
    const r = rechazoDeStock({
      code: '23514',
      message: 'Sólo puedes pasar 1 más de este ítem a stock.',
      hint: 'cantidad',
    })
    expect(r).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'Sólo puedes pasar 1 más de este ítem a stock.' },
      porCampo: { cantidad: 'Sólo puedes pasar 1 más de este ítem a stock.' },
    })
  })

  it('la nota va junto a su campo', () => {
    const r = rechazoDeStock({
      code: '22023',
      message: 'La nota admite hasta 500 caracteres.',
      hint: 'nota',
    })
    expect(r.ok === false && r.porCampo).toEqual({ nota: 'La nota admite hasta 500 caracteres.' })
  })

  it('el stock que cambió es un conflicto, sin campo', () => {
    const r = rechazoDeStock({
      code: 'PT409',
      message: 'El stock de este ítem cambió. Recarga para ver cuánto hay.',
      hint: 'conflicto',
    })
    expect(r).toEqual({
      ok: false,
      error: {
        codigo: 'conflicto',
        mensaje: 'El stock de este ítem cambió. Recarga para ver cuánto hay.',
      },
    })
  })

  it('sin permiso es sin_permiso', () => {
    const r = rechazoDeStock({ code: '42501', message: 'No tienes permiso.' })
    expect(r.ok === false && r.error.codigo).toBe('sin_permiso')
  })

  it('lo desconocido no muestra el texto técnico', () => {
    const r = rechazoDeStock({
      code: 'XX000',
      message: 'relation "x" does not exist',
      hint: 'cantidad',
    })
    expect(r).toEqual({ ok: false, error: { codigo: 'inesperado', mensaje: MENSAJE_INESPERADO } })
  })
})
