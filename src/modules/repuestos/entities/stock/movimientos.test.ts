import { describe, expect, it } from 'vitest'
import {
  cantidadConSigno,
  movimientosDesde,
  paginaDeMovimientos,
  textoDelMovimiento,
  type MovimientoDeStock,
} from './movimientos'

const fila = (id: number) => ({
  id,
  cantidad: 2,
  motivo: 'sobrante',
  nota: null,
  creado_en: '2026-11-12T10:00:00+00:00',
  quien: { nombre: 'Ana' },
})
const leidas = (n: number): MovimientoDeStock[] =>
  movimientosDesde(Array.from({ length: n }, (_, i) => fila(100 - i))) ?? []

describe('el historial de stock de un ítem', () => {
  it('con una de más corta en el tamaño y el cursor es el id de la última', () => {
    const pagina = paginaDeMovimientos(leidas(21), 20)
    expect(pagina.movimientos).toHaveLength(20)
    expect(pagina.siguiente).toBe(81)
  })

  it('sin una de más no hay siguiente', () => {
    const pagina = paginaDeMovimientos(leidas(20), 20)
    expect(pagina.movimientos).toHaveLength(20)
    expect(pagina.siguiente).toBeNull()
  })

  it('lee quién movió, o nadie', () => {
    expect(movimientosDesde([fila(1), { ...fila(2), quien: null }])).toEqual([
      {
        id: 1,
        cantidad: 2,
        motivo: 'sobrante',
        nota: null,
        creadoEn: '2026-11-12T10:00:00+00:00',
        quien: 'Ana',
      },
      {
        id: 2,
        cantidad: 2,
        motivo: 'sobrante',
        nota: null,
        creadoEn: '2026-11-12T10:00:00+00:00',
        quien: null,
      },
    ])
  })

  it('una fila con otra forma invalida la lectura', () => {
    expect(movimientosDesde([{ ...fila(1), id: 'uno' }])).toBeNull()
    expect(movimientosDesde(null)).toBeNull()
  })

  it('un motivo que no está en la lista se muestra tal cual', () => {
    expect(textoDelMovimiento('sobrante')).toBe('Pasar a stock')
    expect(textoDelMovimiento('vendido')).toBe('Vender suelto')
    expect(textoDelMovimiento('merma vieja')).toBe('merma vieja')
  })

  it('la cantidad lleva su signo', () => {
    expect(cantidadConSigno(2)).toBe('+2')
    expect(cantidadConSigno(-1)).toBe('−1')
  })
})
