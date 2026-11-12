import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { PESTANAS, pestanaDe, pestanasLlenas } from './pestanas'

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const }))

describe('pestañas del proyecto', () => {
  it('sin `repuestos.costos.ver` sólo «Ítems», y la URL de compras abre «Ítems»', () => {
    const llenas = pestanasLlenas(con('repuestos.ver'))
    expect(llenas.map((p) => p.clave)).toEqual(['items'])
    expect(pestanaDe('compras', llenas)).toBe('items')
  })

  it('con `repuestos.costos.ver` aparece «Compras» y se puede abrir', () => {
    const llenas = pestanasLlenas(con('repuestos.ver', 'repuestos.costos.ver'))
    expect(llenas.map((p) => p.clave)).toEqual(['items', 'compras'])
    expect(pestanaDe('compras', llenas)).toBe('compras')
  })

  it('un hueco o una clave desconocida caen en «Ítems», con o sin permiso', () => {
    expect(PESTANAS.map((p) => p.clave)).toEqual(['items', 'compras', 'cotizaciones'])
    for (const permisos of [con(), con('repuestos.costos.ver')]) {
      const llenas = pestanasLlenas(permisos)
      expect(pestanaDe('cotizaciones', llenas)).toBe('items')
      expect(pestanaDe('nada', llenas)).toBe('items')
      expect(pestanaDe(undefined, llenas)).toBe('items')
    }
  })
})
