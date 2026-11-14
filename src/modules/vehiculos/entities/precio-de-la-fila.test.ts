import { describe, expect, it } from 'vitest'
import {
  columnaDePrecio,
  encabezadoDePrecio,
  precioDeLaFila,
  rotuloDeLaPuja,
} from './precio-de-la-fila'

const puja = { clave: 'puja', activo: true, claveApibara: 'pricing.current_bid_usd' }
const otro = { clave: 'color', activo: true, claveApibara: null }

describe('columnaDePrecio', () => {
  it('un origen que no es de subasta muestra el precio, aunque su layout traiga la puja', () => {
    expect(columnaDePrecio(false, [puja])).toEqual({ tipo: 'precio' })
  })

  it('un origen de subasta con la puja en su layout la muestra, con la clave de ese layout', () => {
    const columna = columnaDePrecio(true, [otro, puja])
    expect(columna).toEqual({ tipo: 'puja', clave: 'puja' })
    expect(encabezadoDePrecio(columna)).toBe('Puja actual')
  })

  it('sin el campo de la puja, o desactivado, queda el precio', () => {
    expect(columnaDePrecio(true, [otro])).toEqual({ tipo: 'precio' })
    expect(columnaDePrecio(true, [{ ...puja, activo: false }])).toEqual({ tipo: 'precio' })
    expect(encabezadoDePrecio({ tipo: 'precio' })).toBe('Precio')
  })
})

describe('precioDeLaFila', () => {
  const fila = { precio: 18000, atributos: { puja: 4250 }, estadoSubasta: 'abierta' as const }

  it('con la columna de precio, el precio (o nada)', () => {
    expect(precioDeLaFila(fila, { tipo: 'precio' })).toEqual({ tipo: 'precio', valor: 18000 })
    expect(precioDeLaFila({ ...fila, precio: null }, { tipo: 'precio' })).toBeNull()
  })

  it('con la de puja, la puja: «final» sólo si la subasta terminó o se vendió', () => {
    const columna = { tipo: 'puja', clave: 'puja' } as const
    expect(precioDeLaFila(fila, columna)).toEqual({ tipo: 'puja', valor: 4250, final: false })
    expect(precioDeLaFila({ ...fila, estadoSubasta: 'en_vivo' }, columna)).toMatchObject({
      final: false,
    })
    expect(precioDeLaFila({ ...fila, estadoSubasta: 'terminada' }, columna)).toMatchObject({
      final: true,
    })
    expect(precioDeLaFila({ ...fila, estadoSubasta: 'vendida' }, columna)).toMatchObject({
      final: true,
    })
    expect(precioDeLaFila({ ...fila, estadoSubasta: null }, columna)).toMatchObject({
      final: false,
    })
  })

  it('sin puja no pone el precio en su lugar; un número escrito como texto sí vale', () => {
    const columna = { tipo: 'puja', clave: 'puja' } as const
    expect(precioDeLaFila({ ...fila, atributos: {} }, columna)).toBeNull()
    expect(precioDeLaFila({ ...fila, atributos: { puja: 'mucho' } }, columna)).toBeNull()
    expect(precioDeLaFila({ ...fila, atributos: { puja: '3100.5' } }, columna)).toMatchObject({
      valor: 3100.5,
    })
  })

  it('el rótulo de la tarjeta', () => {
    expect(rotuloDeLaPuja(false)).toBe('Puja actual')
    expect(rotuloDeLaPuja(true)).toBe('Puja final')
  })
})
