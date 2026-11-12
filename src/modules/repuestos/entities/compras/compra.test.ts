import { describe, expect, it } from 'vitest'
import { filasDeCompraDesde } from './compra'

const ID = '0b7f2c1e-4a8d-4f6b-9c3e-2d1a5b6c7d8e'
const ITEM = '5e4d3c2b-1a09-4f8e-8d7c-6b5a49382716'

const fila = (cambios: Record<string, unknown> = {}) => ({
  id: ID,
  item_id: ITEM,
  proveedor: 'Repuestos Andinos',
  moneda: 'BOB',
  monto: 696,
  monto_base: 100,
  fecha: '2026-11-12',
  comprobante_ruta: null,
  notas: null,
  actualizado_en: '2026-11-12T16:00:00+00:00',
  item: { descripcion: 'Faro delantero' },
  ...cambios,
})

describe('una compra leída de la base', () => {
  it('lee `monto_base` tal cual llega: el equivalente lo pone la base y acá no se recalcula', () => {
    const filas = filasDeCompraDesde([fila()])
    expect(filas).toEqual([
      {
        id: ID,
        itemId: ITEM,
        itemDescripcion: 'Faro delantero',
        proveedor: 'Repuestos Andinos',
        moneda: 'BOB',
        monto: 696,
        montoBase: 100,
        fecha: '2026-11-12',
        comprobanteRuta: null,
        notas: null,
        actualizadoEn: '2026-11-12T16:00:00+00:00',
      },
    ])
  })

  it('sin ítem (o un ítem que no se ve) da descripción nula', () => {
    expect(filasDeCompraDesde([fila({ item_id: null, item: null })])?.[0]?.itemDescripcion).toBe(
      null,
    )
  })

  it('una fila de antes de 8.11-1 sin `monto_base` se lee con nulo, no tumba la lista', () => {
    expect(filasDeCompraDesde([fila({ monto_base: null })])?.[0]?.montoBase).toBe(null)
  })

  it('una fila con otra forma da nulo', () => {
    expect(filasDeCompraDesde([fila({ id: 'no-es-un-guid' })])).toBe(null)
    expect(filasDeCompraDesde([fila({ monto: '696' })])).toBe(null)
  })
})
