import { describe, expect, it } from 'vitest'
import { validarItemNuevo } from './nuevo'

describe('validarItemNuevo', () => {
  it('la descripción sola', () => {
    expect(validarItemNuevo({ descripcion: '  Faro  ' })).toEqual({
      ok: true,
      datos: { descripcion: 'Faro' },
    })
  })
  it('con cantidad y precio, el precio lleva su moneda', () => {
    expect(
      validarItemNuevo({ descripcion: 'Faro', cantidad: 2, precioCliente: 15.5, moneda: 'USD' }),
    ).toEqual({
      ok: true,
      datos: { descripcion: 'Faro', cantidad: 2, precio_cliente: 15.5, moneda: 'USD' },
    })
  })
  it('lo que no pasa se dice junto a su columna', () => {
    expect(validarItemNuevo({ descripcion: ' ' })).toMatchObject({
      ok: false,
      columna: 'descripcion',
    })
    expect(validarItemNuevo({ descripcion: 'x', cantidad: 0 })).toMatchObject({
      ok: false,
      columna: 'cantidad',
    })
    expect(validarItemNuevo({ descripcion: 'x', precioCliente: -3 })).toMatchObject({
      ok: false,
      columna: 'precio_cliente',
    })
  })
})
