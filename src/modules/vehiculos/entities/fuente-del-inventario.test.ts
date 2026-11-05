import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { fuenteDelInventario } from './fuente-del-inventario'

const COREA = '00000000-0000-4000-8000-0000000000c0'
const USA = '00000000-0000-4000-8000-0000000000a0'

const ve = (alcance: 'propios' | 'todos', origenId: string | null): Permisos => [
  { clave: 'vehiculos.ver', origenId, alcance },
]

describe('fuenteDelInventario', () => {
  it('«propios» en ese origen: por la función', () => {
    expect(fuenteDelInventario(ve('propios', COREA), COREA)).toBe('vehiculos_inventario')
  })

  it('«todos» en ese origen: por la tabla', () => {
    expect(fuenteDelInventario(ve('todos', COREA), COREA)).toBe('vehiculos')
  })

  it('«propios» en todos los orígenes y «todos» en este: gana «todos», por la tabla', () => {
    const permisos: Permisos = [...ve('propios', null), ...ve('todos', COREA)]
    expect(fuenteDelInventario(permisos, COREA)).toBe('vehiculos')
  })

  it('«propios» en todos los orígenes: por la función en cualquiera', () => {
    expect(fuenteDelInventario(ve('propios', null), USA)).toBe('vehiculos_inventario')
  })

  it('«propios» en otro origen o sin la clave: por la tabla (la RLS no devolverá nada)', () => {
    expect(fuenteDelInventario(ve('propios', USA), COREA)).toBe('vehiculos')
    expect(fuenteDelInventario([], COREA)).toBe('vehiculos')
    expect(
      fuenteDelInventario([{ clave: 'leads.ver', origenId: null, alcance: 'propios' }], COREA),
    ).toBe('vehiculos')
  })
})
