import { describe, expect, it } from 'vitest'
import {
  motivoParaNoAbrirPago,
  MENSAJE_PAGO_YA_NO_ESTA,
  PANEL_ANULAR_PAGO,
  PANEL_CONFIRMAR_PAGO,
  PANEL_ELIMINAR_PAGO,
  PANEL_PAGO,
  pagoDeLaUrl,
} from './paneles-de-pago'

const todo = { puedeEditar: true, puedeConfirmar: true }
const sinConfirmar = { confirmado: false }
const confirmado = { confirmado: true }

const abre = (
  panel: Parameters<typeof motivoParaNoAbrirPago>[0]['panel'],
  encontrado: { confirmado: boolean } | null,
  permisos = todo,
  valor = 'x',
) => motivoParaNoAbrirPago({ panel, valor, encontrado, permisos })

describe('motivoParaNoAbrirPago: el estado', () => {
  it('no abre confirmar, editar ni eliminar sobre un confirmado', () => {
    for (const panel of [PANEL_CONFIRMAR_PAGO, PANEL_PAGO, PANEL_ELIMINAR_PAGO] as const) {
      expect(abre(panel, confirmado), panel).toBe(MENSAJE_PAGO_YA_NO_ESTA)
    }
  })

  it('no abre anular sobre uno sin confirmar', () => {
    expect(abre(PANEL_ANULAR_PAGO, sinConfirmar)).toBe(MENSAJE_PAGO_YA_NO_ESTA)
  })

  it('un id ausente se niega', () => {
    expect(abre(PANEL_CONFIRMAR_PAGO, null)).toBe(MENSAJE_PAGO_YA_NO_ESTA)
  })
})

describe('motivoParaNoAbrirPago: el permiso', () => {
  const soloEditar = { puedeEditar: true, puedeConfirmar: false }
  const soloConfirmar = { puedeEditar: false, puedeConfirmar: true }

  it('`nuevo` pide poder editar', () => {
    expect(abre(PANEL_PAGO, null, soloConfirmar, 'nuevo')).toBe(MENSAJE_PAGO_YA_NO_ESTA)
  })

  it('confirmar y anular piden la clave de confirmar; editar y eliminar, la de editar', () => {
    expect(abre(PANEL_CONFIRMAR_PAGO, sinConfirmar, soloEditar)).not.toBeNull()
    expect(abre(PANEL_ANULAR_PAGO, confirmado, soloEditar)).not.toBeNull()
    expect(abre(PANEL_ELIMINAR_PAGO, sinConfirmar, soloConfirmar)).not.toBeNull()
    expect(abre(PANEL_PAGO, sinConfirmar, soloConfirmar)).not.toBeNull()
  })

  it('con puedeAnular en falso, anular no abre aunque se pueda confirmar (pago de proyecto, 8.13-5)', () => {
    const proyecto = { ...todo, puedeAnular: false }
    expect(abre(PANEL_ANULAR_PAGO, confirmado, proyecto)).toBe(MENSAJE_PAGO_YA_NO_ESTA)
    expect(abre(PANEL_CONFIRMAR_PAGO, sinConfirmar, proyecto)).toBeNull()
  })
})

describe('motivoParaNoAbrirPago: lo que abre', () => {
  it('los casos válidos abren', () => {
    expect(abre(PANEL_PAGO, null, todo, 'nuevo')).toBeNull()
    expect(abre(PANEL_PAGO, sinConfirmar)).toBeNull()
    expect(abre(PANEL_CONFIRMAR_PAGO, sinConfirmar)).toBeNull()
    expect(abre(PANEL_ELIMINAR_PAGO, sinConfirmar)).toBeNull()
    expect(abre(PANEL_ANULAR_PAGO, confirmado)).toBeNull()
  })
})

describe('pagoDeLaUrl', () => {
  it('encuentra el id; `nuevo`, vacío y ausente dan nulo', () => {
    const pagos = [{ id: 'a' }, { id: 'b' }]
    expect(pagoDeLaUrl(pagos, 'b')).toEqual({ id: 'b' })
    expect(pagoDeLaUrl(pagos, 'nuevo')).toBeNull()
    expect(pagoDeLaUrl(pagos, null)).toBeNull()
    expect(pagoDeLaUrl(null, 'a')).toBeNull()
  })
})
