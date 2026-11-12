import { describe, expect, it } from 'vitest'
import { etiquetaDeTipoDeCambio, opcionesDeTipoDeCambio, type TipoDeCambio } from './tipo-de-cambio'

const tipo = (id: string, p: Partial<TipoDeCambio>): TipoDeCambio => ({
  id,
  nombre: id,
  monedaDe: 'BOB',
  monedaA: 'USD',
  valor: 6.96,
  esDefault: false,
  activo: true,
  orden: 0,
  ...p,
})

describe('opcionesDeTipoDeCambio', () => {
  it('sirve el par con la base en los dos sentidos', () => {
    const tipos = [
      tipo('a', { monedaDe: 'BOB', monedaA: 'USD' }),
      tipo('b', { monedaDe: 'USD', monedaA: 'BOB' }),
    ]
    expect(opcionesDeTipoDeCambio(tipos, 'BOB', 'USD').map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('deja fuera los inactivos y los de otra moneda', () => {
    const tipos = [tipo('a', { activo: false }), tipo('b', { monedaDe: 'EUR' }), tipo('c', {})]
    expect(opcionesDeTipoDeCambio(tipos, 'BOB', 'USD').map((t) => t.id)).toEqual(['c'])
  })

  it('pone primero el predeterminado y luego por orden', () => {
    const tipos = [
      tipo('a', { orden: 1 }),
      tipo('b', { orden: 2, esDefault: true }),
      tipo('c', { orden: 0 }),
    ]
    expect(opcionesDeTipoDeCambio(tipos, 'BOB', 'USD').map((t) => t.id)).toEqual(['b', 'c', 'a'])
  })

  it('con la moneda base no ofrece ninguno', () => {
    expect(opcionesDeTipoDeCambio([tipo('a', {})], 'USD', 'USD')).toEqual([])
  })
})

describe('etiquetaDeTipoDeCambio', () => {
  it('nombra el par y el valor con hasta cuatro decimales', () => {
    expect(etiquetaDeTipoDeCambio(tipo('Oficial', { nombre: 'Oficial' }), 'es-BO')).toBe(
      'Oficial · BOB → USD · 6,96',
    )
  })
})
