import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { alMenosUna } from '../empresa/pestanas'
import { pestanaDe, pestanasVisibles, type Pestana } from './pestanas'

const O1 = '11111111-1111-4111-8111-111111111111'

// Cada clave en todos los orígenes (`'global'`) o en los que dice.
const permisos = (claves: Partial<Record<ClavePermiso, string[] | 'global'>>): Permisos =>
  Object.entries(claves).flatMap(([clave, donde]) =>
    (donde === 'global' ? [null] : (donde ?? [])).map((origenId) => ({
      clave: clave as ClavePermiso,
      origenId,
      alcance: 'todos' as const,
    })),
  )

const claves = (lista: readonly { clave: Pestana }[]) => lista.map((pestana) => pestana.clave)

describe('pestanasVisibles', () => {
  it('quien ve los roles, los niveles', () => {
    expect(claves(pestanasVisibles(permisos({ 'equipo.roles.ver': 'global' })))).toEqual([
      'niveles',
    ])
  })

  it('quien configura un origen, la fórmula, las tablas y los ajustes (que lee sin cambiar), en ese orden', () => {
    expect(claves(pestanasVisibles(permisos({ 'cotizaciones.configurar': [O1] })))).toEqual([
      'formula',
      'tablas',
      'ajustes',
    ])
  })

  it('con las dos, en su orden: niveles primero y ajustes al final', () => {
    expect(
      claves(
        pestanasVisibles(
          permisos({ 'equipo.roles.gestionar': 'global', 'cotizaciones.configurar': 'global' }),
        ),
      ),
    ).toEqual(['niveles', 'formula', 'tablas', 'ajustes'])
  })

  it('sin ninguna, ninguna', () => {
    expect(pestanasVisibles(permisos({ 'cotizaciones.ver': 'global' }))).toEqual([])
  })
})

describe('pestanaDe', () => {
  const soloFormula = alMenosUna([{ clave: 'formula' as const }])
  const las2 = alMenosUna([{ clave: 'niveles' as const }, { clave: 'formula' as const }])
  const deUnOrigen = alMenosUna([{ clave: 'formula' as const }, { clave: 'ajustes' as const }])
  if (!soloFormula || !las2 || !deUnOrigen) {
    throw new Error('las listas no están vacías')
  }

  it('abre la que dice la URL si es una de las suyas', () => {
    expect(pestanaDe('formula', las2)).toBe('formula')
    expect(pestanaDe('niveles', las2)).toBe('niveles')
    expect(pestanaDe('ajustes', deUnOrigen)).toBe('ajustes')
  })

  it('una que no es suya abre la primera de las suyas', () => {
    expect(pestanaDe('niveles', soloFormula)).toBe('formula')
    expect(pestanaDe('ajustes', las2)).toBe('niveles')
  })

  it('sin configurar, «Tablas» no está y su URL abre la primera de las suyas', () => {
    const soloNiveles = alMenosUna(pestanasVisibles(permisos({ 'equipo.roles.ver': 'global' })))
    if (!soloNiveles) throw new Error('ve los niveles')
    expect(pestanaDe('tablas', soloNiveles)).toBe('niveles')
  })

  it('lo que no es una pestaña abre la primera', () => {
    expect(pestanaDe(undefined, las2)).toBe('niveles')
    expect(pestanaDe('<script>', las2)).toBe('niveles')
    expect(pestanaDe('', soloFormula)).toBe('formula')
  })
})
