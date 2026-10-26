import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { origenElegido, origenesParaCotizar } from './origenes-para-cotizar'

const ORIGENES = [
  { id: 'a', nombre: 'A', activo: true },
  { id: 'b', nombre: 'B', activo: true },
  { id: 'c', nombre: 'C', activo: false },
]
const concede = (origenId: string | null): Permisos => [
  { clave: 'cotizaciones.crear', origenId, alcance: 'todos' },
]

describe('origenesParaCotizar', () => {
  it('con el permiso en todos los orígenes, los activos (uno desactivado no se cotiza)', () => {
    expect(origenesParaCotizar(concede(null), ORIGENES).map((o) => o.id)).toEqual(['a', 'b'])
  })

  it('con el permiso en un origen, sólo ese; sin él, ninguno', () => {
    expect(origenesParaCotizar(concede('b'), ORIGENES).map((o) => o.id)).toEqual(['b'])
    expect(origenesParaCotizar([], ORIGENES)).toEqual([])
  })

  it('sólo cuenta cotizaciones.crear: ver o editar no alcanza', () => {
    const solo: Permisos = [{ clave: 'cotizaciones.ver', origenId: null, alcance: 'todos' }]
    expect(origenesParaCotizar(solo, ORIGENES)).toEqual([])
  })
})

describe('origenElegido', () => {
  it('la pestaña de la URL si es una de las suyas; si no, la primera; sin ninguna, nulo', () => {
    expect(origenElegido(ORIGENES, 'b')?.id).toBe('b')
    expect(origenElegido(ORIGENES, 'zzz')?.id).toBe('a')
    expect(origenElegido(ORIGENES, undefined)?.id).toBe('a')
    expect(origenElegido([], 'a')).toBeNull()
  })
})
