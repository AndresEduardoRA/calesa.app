import { describe, expect, it } from 'vitest'
import { respuestaDeReasignarDesde } from './reasignar'

const NUEVO = '7f9c1d2e-3a4b-4c5d-8e6f-0123456789ab'
const DESTINO = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
const FASE = '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e'
const ORIGEN = '3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f'
const dato = {
  id: NUEVO,
  proyecto_id: DESTINO,
  fase_id: FASE,
  origen: {
    item_id: ORIGEN,
    stock_cantidad: 1,
    en_stock_desde: '2026-11-12T10:00:00+00:00',
    actualizado_en: '2026-11-12T10:05:00.123456+00:00',
  },
}

describe('la respuesta de reasignar', () => {
  it('trae el ítem nuevo y el origen tras descontar', () => {
    expect(respuestaDeReasignarDesde(dato)).toEqual({
      id: NUEVO,
      proyectoId: DESTINO,
      faseId: FASE,
      origen: {
        itemId: ORIGEN,
        stockCantidad: 1,
        enStockDesde: '2026-11-12T10:00:00+00:00',
        actualizadoEn: '2026-11-12T10:05:00.123456+00:00',
      },
    })
  })

  it('sin fase de entrada y con el origen vaciado es válida', () => {
    const r = respuestaDeReasignarDesde({
      ...dato,
      fase_id: null,
      origen: { ...dato.origen, stock_cantidad: 0, en_stock_desde: null },
    })
    expect(r?.faseId).toBeNull()
    expect(r?.origen).toMatchObject({ stockCantidad: 0, enStockDesde: null })
  })

  it('otra forma es nula', () => {
    expect(respuestaDeReasignarDesde({ ...dato, id: 'no' })).toBeNull()
    const { origen: _sinOrigen, ...sinOrigen } = dato
    expect(respuestaDeReasignarDesde(sinOrigen)).toBeNull()
    expect(
      respuestaDeReasignarDesde({ ...dato, origen: { ...dato.origen, stock_cantidad: -1 } }),
    ).toBeNull()
    expect(respuestaDeReasignarDesde(null)).toBeNull()
  })
})
