import { describe, expect, it } from 'vitest'
import type { FilaDeCompra } from './compra'
import { cambiosDeCompra, validarCompra, type BorradorDeCompra } from './formulario'

const LOCALE = 'es-BO'
const ITEM = '5e4d3c2b-1a09-4f8e-8d7c-6b5a49382716'

const borrador = (cambios: Partial<BorradorDeCompra> = {}): BorradorDeCompra => ({
  itemId: ITEM,
  proveedor: 'Repuestos Andinos',
  moneda: 'usd',
  monto: '15',
  fecha: '2026-11-12',
  notas: '',
  comprobanteRuta: '',
  ...cambios,
})

const fila: FilaDeCompra = {
  id: '0b7f2c1e-4a8d-4f6b-9c3e-2d1a5b6c7d8e',
  itemId: ITEM,
  itemDescripcion: 'Bomba de agua',
  proveedor: 'Repuestos Andinos',
  moneda: 'USD',
  monto: 15,
  montoBase: 15,
  fecha: '2026-11-12',
  comprobanteRuta: null,
  notas: null,
  actualizadoEn: '2026-11-12T16:00:00+00:00',
}

function datos(cambios: Partial<BorradorDeCompra> = {}) {
  const validado = validarCompra(borrador(cambios), { locale: LOCALE })
  if (!validado.ok) throw new Error(JSON.stringify(validado.errores))
  return validado.datos
}

describe('validar el formulario de una compra', () => {
  it('el monto vacío, negativo o con tres decimales da el texto de la base', () => {
    expect(validarCompra(borrador({ monto: '' }), { locale: LOCALE })).toEqual({
      ok: false,
      errores: { monto: 'Falta el monto.' },
    })
    expect(validarCompra(borrador({ monto: '-1' }), { locale: LOCALE })).toEqual({
      ok: false,
      errores: { monto: 'El monto no puede ser negativo.' },
    })
    expect(validarCompra(borrador({ monto: '1,005' }), { locale: LOCALE })).toEqual({
      ok: false,
      errores: { monto: 'El monto lleva como mucho dos decimales.' },
    })
  })

  it('0 es un monto (no es «falta»)', () => {
    expect(datos({ monto: '0' }).monto).toBe(0)
  })

  it('el proveedor de 201 letras cae; la moneda y la fecha vacías dan su texto', () => {
    const r = validarCompra(borrador({ proveedor: 'x'.repeat(201), moneda: '', fecha: '' }), {
      locale: LOCALE,
    })
    expect(r).toEqual({
      ok: false,
      errores: {
        proveedor: 'El proveedor va en 200 caracteres como mucho.',
        moneda: 'Elige la moneda de la compra.',
        fecha: 'Falta la fecha.',
      },
    })
  })

  it('los textos vacíos van nulos y la moneda en mayúsculas', () => {
    expect(datos({ itemId: '', proveedor: '  ' })).toEqual({
      itemId: null,
      proveedor: null,
      moneda: 'USD',
      monto: 15,
      fecha: '2026-11-12',
      notas: null,
      comprobanteRuta: null,
    })
  })
})

describe('los cambios de una compra que se edita', () => {
  it('sólo el monto cambiado viaja solo: ni la moneda ni `monto_base`', () => {
    expect(cambiosDeCompra(fila, datos({ monto: '20' }))).toEqual({ monto: 20 })
  })

  it('nada cambiado da nulo', () => {
    expect(cambiosDeCompra(fila, datos())).toBeNull()
  })

  it('quitar el ítem manda `item_id` nulo', () => {
    expect(cambiosDeCompra(fila, datos({ itemId: '' }))).toEqual({ item_id: null })
  })
})
