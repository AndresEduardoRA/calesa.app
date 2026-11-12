import { describe, expect, it } from 'vitest'
import { filaDeItemDesde, filasDeItemDesde, pendientesDe } from './item'

const ID = '7f9c1d2e-3a4b-4c5d-8e6f-0123456789ab'
const base = {
  id: ID,
  proyecto_id: ID,
  descripcion: 'Faro izquierdo',
  tipo_pieza_id: null,
  condicion_id: null,
  pais_origen_id: null,
  modo_transporte_id: null,
  cantidad: 2,
  precio_cliente: 150.5,
  moneda: 'USD',
  tracking: null,
  notas: null,
  en_stock_desde: null,
  actualizado_en: '2026-11-12T10:00:00+00:00',
  fase: null,
}

describe('filasDeItemDesde', () => {
  it('arma la fila con su fase', () => {
    const fila = filaDeItemDesde({
      ...base,
      fase: { id: ID, nombre: 'En camino', color: '#123456', es_final: false },
    })
    expect(fila).toMatchObject({
      descripcion: 'Faro izquierdo',
      cantidad: 2,
      precioCliente: 150.5,
      moneda: 'USD',
      fase: { nombre: 'En camino', color: '#123456', esFinal: false },
      enStock: false,
    })
  })

  it('una fila con otra forma invalida toda la lectura', () => {
    expect(filasDeItemDesde([base, { ...base, cantidad: 'dos' }])).toBeNull()
    expect(filasDeItemDesde([{ ...base, id: 'no-es-guid' }])).toBeNull()
    expect(filasDeItemDesde(null)).toBeNull()
  })

  it('lee una lista vacía', () => {
    expect(filasDeItemDesde([])).toEqual([])
  })
})

describe('pendientesDe', () => {
  const con = (fase: unknown, enStock = false) =>
    filaDeItemDesde({ ...base, fase, en_stock_desde: enStock ? '2026-11-01T00:00:00Z' : null })!
  it('cuenta los sin fase y los de una fase que no es final; no los de fase final ni los de stock', () => {
    const final = { id: ID, nombre: 'Entregado', color: '#000000', es_final: true }
    const medio = { id: ID, nombre: 'En camino', color: '#000000', es_final: false }
    expect(pendientesDe([con(null), con(medio), con(final), con(medio, true)])).toBe(2)
  })
})
