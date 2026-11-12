import { describe, expect, it } from 'vitest'

import { leerMargen, textoSinPrecio, TOPE_SIN_PRECIO } from './margen'

const XTS = { moneda: 'XTS', precios: 100, compras: 60, margen: 40 }

describe('leerMargen', () => {
  it('lee el margen por moneda en el orden de la base', () => {
    const r = leerMargen({
      sin_precio: 0,
      monedas: [XTS, { moneda: 'XTV', precios: 0, compras: 5, margen: -5 }],
    })
    expect(r).toEqual({
      ok: true,
      datos: {
        sinPrecio: { n: 0, hayMas: false },
        monedas: [XTS, { moneda: 'XTV', precios: 0, compras: 5, margen: -5 }],
      },
    })
  })

  it('nulo no es 0: un margen de 0 queda 0 y uno nulo queda nulo', () => {
    const cero = leerMargen({ sin_precio: 0, monedas: [{ ...XTS, compras: 100, margen: 0 }] })
    expect(cero.ok && cero.datos.monedas[0]?.margen).toBe(0)
    const nulo = leerMargen({ sin_precio: 1, monedas: [{ ...XTS, margen: null }] })
    expect(nulo.ok && nulo.datos.monedas[0]?.margen).toBeNull()
  })

  it('con ítems sin precio el margen es nulo aunque llegue un número', () => {
    const r = leerMargen({ sin_precio: 2, monedas: [XTS] })
    expect(r.ok && r.datos.monedas[0]).toEqual({ ...XTS, margen: null })
    expect(r.ok && r.datos.sinPrecio).toEqual({ n: 2, hayMas: false })
  })

  it('201 sin precio es «más de 200»', () => {
    const r = leerMargen({ sin_precio: TOPE_SIN_PRECIO + 1, monedas: [] })
    expect(r.ok && r.datos.sinPrecio).toEqual({ n: 200, hayMas: true })
  })

  it('una forma inválida es un error, no un margen', () => {
    expect(leerMargen(null).ok).toBe(false)
    expect(leerMargen({ sin_precio: 0 }).ok).toBe(false)
    expect(leerMargen({ sin_precio: 0, monedas: [{ ...XTS, margen: '40' }] }).ok).toBe(false)
    expect(leerMargen({ sin_precio: 202, monedas: [] }).ok).toBe(false)
  })
})

describe('textoSinPrecio', () => {
  it('dice cuántos ítems no tienen precio', () => {
    expect(textoSinPrecio({ n: 1, hayMas: false })).toBe('Sin precio en 1 ítem')
    expect(textoSinPrecio({ n: 3, hayMas: false })).toBe('Sin precio en 3 ítems')
    expect(textoSinPrecio({ n: 200, hayMas: true })).toBe('Sin precio en más de 200 ítems')
  })
})
