import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { origenElegido, origenesParaCotizar, puedeCotizarEn } from './origenes-para-cotizar'

const ORIGENES = [
  { id: 'a', nombre: 'A', activo: true },
  { id: 'b', nombre: 'B', activo: true },
  { id: 'c', nombre: 'C', activo: false },
]
const concede = (origenId: string | null): Permisos => [
  { clave: 'cotizaciones.crear', origenId, alcance: 'todos' },
  { clave: 'cotizaciones.ver', origenId, alcance: 'todos' },
]

describe('origenesParaCotizar', () => {
  it('con el permiso en todos los orígenes, los activos (uno desactivado no se cotiza)', () => {
    expect(origenesParaCotizar(concede(null), ORIGENES).map((o) => o.id)).toEqual(['a', 'b'])
  })

  it('con el permiso en un origen, sólo ese; sin él, ninguno', () => {
    expect(origenesParaCotizar(concede('b'), ORIGENES).map((o) => o.id)).toEqual(['b'])
    expect(origenesParaCotizar([], ORIGENES)).toEqual([])
  })

  it('pide cotizaciones.crear Y cotizaciones.ver del origen: una sola no alcanza (4-32)', () => {
    const soloVer: Permisos = [{ clave: 'cotizaciones.ver', origenId: null, alcance: 'todos' }]
    const soloCrear: Permisos = [{ clave: 'cotizaciones.crear', origenId: null, alcance: 'todos' }]
    expect(origenesParaCotizar(soloVer, ORIGENES)).toEqual([])
    expect(origenesParaCotizar(soloCrear, ORIGENES)).toEqual([])
  })

  it('el origen tiene que estar en los dos: crear en a y b, ver en b y c, sólo b; ver «propios» alcanza', () => {
    const permisos: Permisos = [
      { clave: 'cotizaciones.crear', origenId: 'a', alcance: 'todos' },
      { clave: 'cotizaciones.crear', origenId: 'b', alcance: 'todos' },
      { clave: 'cotizaciones.ver', origenId: 'b', alcance: 'propios' },
      { clave: 'cotizaciones.ver', origenId: 'c', alcance: 'todos' },
    ]
    expect(origenesParaCotizar(permisos, ORIGENES).map((o) => o.id)).toEqual(['b'])
    const verEnTodos: Permisos = [
      { clave: 'cotizaciones.crear', origenId: 'a', alcance: 'todos' },
      { clave: 'cotizaciones.ver', origenId: null, alcance: 'propios' },
    ]
    expect(origenesParaCotizar(verEnTodos, ORIGENES).map((o) => o.id)).toEqual(['a'])
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

describe('puedeCotizarEn', () => {
  it('con crear y ver del origen, sí; «todos» vale para cualquiera', () => {
    expect(puedeCotizarEn(concede('a'), 'a')).toBe(true)
    expect(puedeCotizarEn(concede(null), 'b')).toBe(true)
    expect(puedeCotizarEn(concede('a'), 'b')).toBe(false)
  })

  it('sin crear, o sin ver, no (4-32)', () => {
    const soloVer: Permisos = [{ clave: 'cotizaciones.ver', origenId: 'a', alcance: 'todos' }]
    const soloCrear: Permisos = [{ clave: 'cotizaciones.crear', origenId: 'a', alcance: 'todos' }]
    expect(puedeCotizarEn(soloVer, 'a')).toBe(false)
    expect(puedeCotizarEn(soloCrear, 'a')).toBe(false)
  })
})
