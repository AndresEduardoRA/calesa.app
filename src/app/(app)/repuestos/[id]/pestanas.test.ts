import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { PESTANAS, pestanaDe, pestanasLlenas } from './pestanas'

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const }))

describe('pestañas del proyecto', () => {
  it('sin `repuestos.costos.ver` sólo «Ítems», y la URL de compras o de pagos abre «Ítems»', () => {
    const llenas = pestanasLlenas(con('repuestos.ver'))
    expect(llenas.map((p) => p.clave)).toEqual(['items'])
    expect(pestanaDe('compras', llenas)).toBe('items')
    expect(pestanaDe('pagos', llenas)).toBe('items')
  })

  it('con `repuestos.costos.ver` aparecen «Compras» y «Pagos» y se pueden abrir', () => {
    const llenas = pestanasLlenas(con('repuestos.ver', 'repuestos.costos.ver'))
    expect(llenas.map((p) => p.clave)).toEqual(['items', 'compras', 'pagos'])
    expect(pestanaDe('compras', llenas)).toBe('compras')
    expect(pestanaDe('pagos', llenas)).toBe('pagos')
  })

  it('con `repuestos.cotizar` aparece «Cotizaciones» y se puede abrir', () => {
    const llenas = pestanasLlenas(con('repuestos.ver', 'repuestos.cotizar'))
    expect(llenas.map((p) => p.clave)).toEqual(['items', 'cotizaciones'])
    expect(pestanaDe('cotizaciones', llenas)).toBe('cotizaciones')
  })

  it('con las dos claves, las cuatro en su orden', () => {
    const llenas = pestanasLlenas(con('repuestos.ver', 'repuestos.costos.ver', 'repuestos.cotizar'))
    expect(llenas.map((p) => p.clave)).toEqual(['items', 'compras', 'pagos', 'cotizaciones'])
  })

  it('sin `repuestos.cotizar` (aun con `repuestos.costos.ver`) la URL de cotizaciones abre «Ítems»', () => {
    expect(PESTANAS.map((p) => p.clave)).toEqual(['items', 'compras', 'pagos', 'cotizaciones'])
    for (const permisos of [con(), con('repuestos.costos.ver')]) {
      const llenas = pestanasLlenas(permisos)
      expect(pestanaDe('cotizaciones', llenas)).toBe('items')
      expect(pestanaDe('nada', llenas)).toBe('items')
      expect(pestanaDe(undefined, llenas)).toBe('items')
    }
  })
})
