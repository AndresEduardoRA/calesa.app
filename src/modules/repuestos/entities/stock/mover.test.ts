import { describe, expect, it } from 'vitest'
import type { FilaDeItem } from '../nucleo/item'
import { filaTrasMover, respuestaDeMoverDesde } from './mover'

const ID = '7f9c1d2e-3a4b-4c5d-8e6f-0123456789ab'
const fila: FilaDeItem = {
  id: ID,
  proyectoId: ID,
  descripcion: 'Filtro',
  tipoPiezaId: null,
  condicionId: null,
  paisOrigenId: null,
  modoTransporteId: null,
  cantidad: 3,
  stockCantidad: 0,
  precioCliente: null,
  moneda: null,
  tracking: null,
  notas: 'nota',
  fase: null,
  enStock: false,
  actualizadoEn: '2026-11-12T10:00:00+00:00',
}
const respuesta = (stock: number, desde: string | null) =>
  respuestaDeMoverDesde({
    item_id: ID,
    stock_cantidad: stock,
    en_stock_desde: desde,
    actualizado_en: '2026-11-12T10:05:00.123456+00:00',
    movimiento_id: 7,
  })

describe('la fila tras mover el stock', () => {
  it('con stock queda en stock y con la versión nueva', () => {
    const r = respuesta(2, '2026-11-12T10:05:00+00:00')
    expect(r).not.toBeNull()
    expect(filaTrasMover(fila, r!)).toEqual({
      ...fila,
      stockCantidad: 2,
      enStock: true,
      actualizadoEn: '2026-11-12T10:05:00.123456+00:00',
    })
  })

  it('en 0 deja de estar en stock', () => {
    const r = respuesta(0, null)
    expect(filaTrasMover({ ...fila, stockCantidad: 1, enStock: true }, r!)).toMatchObject({
      stockCantidad: 0,
      enStock: false,
    })
  })

  it('una respuesta con otra forma no se lee', () => {
    expect(respuestaDeMoverDesde({ item_id: 'no', stock_cantidad: 1 })).toBeNull()
    expect(respuestaDeMoverDesde(null)).toBeNull()
  })
})
