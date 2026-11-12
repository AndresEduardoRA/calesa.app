import { describe, expect, it } from 'vitest'
import {
  MENSAJE_DE_CANTIDAD,
  MENSAJE_DE_DESCRIPCION,
  MENSAJE_DE_PRECIO,
  cambioDeCelda,
} from './celda'

const GUID = '7f9c1d2e-3a4b-4c5d-8e6f-0123456789ab'

describe('cambioDeCelda', () => {
  it('cada columna da la fila de update de su columna', () => {
    expect(cambioDeCelda('descripcion', '  Faro  ')).toEqual({
      ok: true,
      fila: { descripcion: 'Faro' },
    })
    expect(cambioDeCelda('tipo_pieza_id', GUID)).toEqual({
      ok: true,
      fila: { tipo_pieza_id: GUID },
    })
    expect(cambioDeCelda('modo_transporte_id', null)).toEqual({
      ok: true,
      fila: { modo_transporte_id: null },
    })
    expect(cambioDeCelda('cantidad', 3)).toEqual({ ok: true, fila: { cantidad: 3 } })
    expect(cambioDeCelda('moneda', 'USD')).toEqual({ ok: true, fila: { moneda: 'USD' } })
    expect(cambioDeCelda('tracking', ' 1Z999 ')).toEqual({ ok: true, fila: { tracking: '1Z999' } })
  })

  it('la descripción no queda vacía ni pasa de 500', () => {
    expect(cambioDeCelda('descripcion', '   ')).toEqual({
      ok: false,
      error: MENSAJE_DE_DESCRIPCION,
    })
    expect(cambioDeCelda('descripcion', null)).toEqual({ ok: false, error: MENSAJE_DE_DESCRIPCION })
    expect(cambioDeCelda('descripcion', 'x'.repeat(501)).ok).toBe(false)
    expect(cambioDeCelda('descripcion', 'x'.repeat(500)).ok).toBe(true)
  })

  it('la cantidad es un entero desde 1', () => {
    for (const mala of [0, -1, 1.5, null, '2']) {
      expect(cambioDeCelda('cantidad', mala)).toEqual({ ok: false, error: MENSAJE_DE_CANTIDAD })
    }
  })

  it('el precio no es negativo y tiene hasta 2 decimales: lo que se manda es lo que entró', () => {
    expect(cambioDeCelda('precio_cliente', -1)).toEqual({ ok: false, error: MENSAJE_DE_PRECIO })
    expect(cambioDeCelda('precio_cliente', 10.555)).toEqual({ ok: false, error: MENSAJE_DE_PRECIO })
    expect(cambioDeCelda('precio_cliente', 1e15)).toEqual({ ok: false, error: MENSAJE_DE_PRECIO })
    expect(cambioDeCelda('precio_cliente', 0)).toEqual({ ok: true, fila: { precio_cliente: 0 } })
    expect(cambioDeCelda('precio_cliente', 10.55)).toEqual({
      ok: true,
      fila: { precio_cliente: 10.55 },
    })
  })

  it('un precio en un ítem sin moneda lleva la que se da, en el mismo update', () => {
    expect(cambioDeCelda('precio_cliente', 25, 'USD')).toEqual({
      ok: true,
      fila: { precio_cliente: 25, moneda: 'USD' },
    })
    expect(cambioDeCelda('precio_cliente', 25, null)).toEqual({
      ok: true,
      fila: { precio_cliente: 25 },
    })
  })

  it('vaciar el precio no toca la moneda, ni siquiera con una moneda de respaldo', () => {
    expect(cambioDeCelda('precio_cliente', null, 'USD')).toEqual({
      ok: true,
      fila: { precio_cliente: null },
    })
  })

  it('vacío en tracking y notas es nulo; un catálogo o una moneda de otra forma se rechaza', () => {
    expect(cambioDeCelda('notas', '  ')).toEqual({ ok: true, fila: { notas: null } })
    expect(cambioDeCelda('tracking', 'x'.repeat(201)).ok).toBe(false)
    expect(cambioDeCelda('condicion_id', 'no-es-guid').ok).toBe(false)
    expect(cambioDeCelda('moneda', 'usd').ok).toBe(false)
  })

  it('las columnas que no se editan se rechazan', () => {
    for (const c of [
      'fase_id',
      'stock_cantidad',
      'en_stock_desde',
      'eliminado_en',
      'proyecto_id',
    ]) {
      expect(cambioDeCelda(c, GUID).ok).toBe(false)
    }
  })
})
