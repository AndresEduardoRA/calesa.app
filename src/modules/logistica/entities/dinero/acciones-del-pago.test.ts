import { describe, expect, it } from 'vitest'
import { accionesDelPago } from './acciones-del-pago'
import type { Pago } from './pago'

const pago = (p: Partial<Pick<Pago, 'confirmado'>> = {}) => ({ confirmado: false, ...p })

const todo = { puedeEditar: true, puedeConfirmar: true }

describe('accionesDelPago', () => {
  it('un confirmado nunca ofrece editar ni eliminar, aunque tenga todos los permisos', () => {
    expect(accionesDelPago(pago({ confirmado: true }), todo)).toEqual({
      editar: false,
      eliminar: false,
      confirmar: false,
      anular: true,
    })
  })

  it('sin confirmar, con sólo confirmar, ofrece confirmar y no editar', () => {
    expect(accionesDelPago(pago(), { puedeEditar: false, puedeConfirmar: true })).toEqual({
      editar: false,
      eliminar: false,
      confirmar: true,
      anular: false,
    })
  })

  it('sin confirmar, con sólo editar, ofrece editar y eliminar y no confirmar', () => {
    expect(accionesDelPago(pago(), { puedeEditar: true, puedeConfirmar: false })).toEqual({
      editar: true,
      eliminar: true,
      confirmar: false,
      anular: false,
    })
  })

  it('anular es sólo de un confirmado y sólo con la clave de confirmar', () => {
    expect(accionesDelPago(pago(), todo).anular).toBe(false)
    expect(
      accionesDelPago(pago({ confirmado: true }), { puedeEditar: true, puedeConfirmar: false })
        .anular,
    ).toBe(false)
  })

  it('sin ninguna clave todo es falso', () => {
    const nada = { puedeEditar: false, puedeConfirmar: false }
    expect(Object.values(accionesDelPago(pago(), nada)).some(Boolean)).toBe(false)
    expect(Object.values(accionesDelPago(pago({ confirmado: true }), nada)).some(Boolean)).toBe(
      false,
    )
  })

  it('con puedeAnular en falso no ofrece anular aunque se pueda confirmar (pago de proyecto, 8.13-5)', () => {
    const proyecto = { ...todo, puedeAnular: false }
    expect(accionesDelPago(pago({ confirmado: true }), proyecto).anular).toBe(false)
    expect(accionesDelPago(pago(), proyecto)).toEqual({
      editar: true,
      eliminar: true,
      confirmar: true,
      anular: false,
    })
  })
})
