import { describe, expect, it } from 'vitest'
import { PESTANAS, pestanaDe, pestanasLlenas } from './pestanas'

describe('pestañas del proyecto', () => {
  it('hoy sólo «Ítems»: las de compras y cotizaciones son huecos que no se dibujan', () => {
    expect(pestanasLlenas().map((p) => p.clave)).toEqual(['items'])
    expect(PESTANAS.map((p) => p.clave)).toEqual(['items', 'compras', 'cotizaciones'])
  })

  it('una clave desconocida o de un hueco cae en «Ítems»', () => {
    expect(pestanaDe('nada')).toBe('items')
    expect(pestanaDe('compras')).toBe('items')
    expect(pestanaDe(undefined)).toBe('items')
  })

  it('cuando su paso la llena, aparece y se puede abrir', () => {
    const llenas = PESTANAS.map((p) => (p.clave === 'compras' ? { ...p, lleno: true } : p))
    expect(pestanasLlenas(llenas).map((p) => p.clave)).toEqual(['items', 'compras'])
    expect(pestanaDe('compras', llenas)).toBe('compras')
  })
})
