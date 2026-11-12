import { describe, expect, it } from 'vitest'
import { filaDeItemDesde, type FilaDeItem } from '../nucleo/item'
import { armarHoja, cuentasDeLaHoja, hojaLlena, nombreDelValor } from './hoja'

const ID = '7f9c1d2e-3a4b-4c5d-8e6f-0123456789ab'
const fila = (): FilaDeItem =>
  filaDeItemDesde({
    id: ID,
    proyecto_id: ID,
    descripcion: 'x',
    tipo_pieza_id: null,
    condicion_id: null,
    pais_origen_id: null,
    modo_transporte_id: null,
    cantidad: 1,
    precio_cliente: null,
    moneda: null,
    tracking: null,
    notas: null,
    en_stock_desde: null,
    actualizado_en: '2026-11-12T10:00:00Z',
    fase: null,
  })!
const filas = (n: number) => Array.from({ length: n }, fila)

describe('la hoja', () => {
  it('con 201 leídas muestra 200 y dice que hay más', () => {
    const hoja = armarHoja(filas(201))
    expect(hoja.filas).toHaveLength(200)
    expect(hoja.hayMas).toBe(true)
  })
  it('con 200 justas no hay más pero ya no cabe otra', () => {
    const hoja = armarHoja(filas(200))
    expect(hoja.hayMas).toBe(false)
    expect(hojaLlena(hoja.filas, hoja.hayMas)).toBe(true)
    expect(hojaLlena(filas(199), false)).toBe(false)
  })
  it('las cuentas salen de lo leído', () => {
    expect(cuentasDeLaHoja(filas(3))).toEqual({ items: 3, pendientes: 3 })
  })
})

describe('nombreDelValor', () => {
  const catalogos = {
    tipo_pieza: { valores: [{ id: 'a', nombre: 'Faro', activo: false }] },
    condicion: { valores: [] },
    pais_origen: { valores: [] },
    modo_transporte: { valores: [] },
  }
  it('da el nombre aunque el valor esté desactivado', () => {
    expect(nombreDelValor(catalogos, 'tipo_pieza', 'a')).toBe('Faro')
  })
  it('sin id o con un id que ya no está, nulo', () => {
    expect(nombreDelValor(catalogos, 'tipo_pieza', null)).toBeNull()
    expect(nombreDelValor(catalogos, 'condicion', 'a')).toBeNull()
  })
})
