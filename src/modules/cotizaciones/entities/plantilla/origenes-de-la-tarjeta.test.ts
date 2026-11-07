import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { etiquetaDelOrigen, origenesDeLaTarjeta } from './origenes-de-la-tarjeta'

describe('origenesDeLaTarjeta', () => {
  it('por la clave del origen, inactivos incluidos y en el orden dado', () => {
    const origenes = [
      { id: 'a', nombre: 'A', activo: true },
      { id: 'b', nombre: 'B', activo: false },
      { id: 'c', nombre: 'C', activo: true },
    ]
    const permisos: Permisos = [
      { clave: 'cotizaciones.configurar', origenId: 'a', alcance: 'todos' },
      { clave: 'cotizaciones.configurar', origenId: 'b', alcance: 'todos' },
      { clave: 'cotizaciones.ver', origenId: 'c', alcance: 'todos' },
    ]
    expect(origenesDeLaTarjeta(permisos, origenes).map((o) => o.id)).toEqual(['a', 'b'])
  })
  it('la etiqueta dice «(inactivo)»', () => {
    expect(etiquetaDelOrigen({ nombre: 'B', activo: false })).toBe('B (inactivo)')
    expect(etiquetaDelOrigen({ nombre: 'A', activo: true })).toBe('A')
  })
})
