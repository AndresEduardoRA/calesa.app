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

  it('quien sólo configura la fórmula de un origen, la fórmula y el diseño', () => {
    expect(claves(pestanasVisibles(permisos({ 'cotizaciones.configurar': [O1] })))).toEqual([
      'formula',
      'diseno',
    ])
  })

  it('con las dos, en su orden: niveles primero', () => {
    expect(
      claves(
        pestanasVisibles(
          permisos({ 'equipo.roles.gestionar': 'global', 'cotizaciones.configurar': 'global' }),
        ),
      ),
    ).toEqual(['niveles', 'formula', 'diseno'])
  })

  it('sin ninguna, ninguna', () => {
    expect(pestanasVisibles(permisos({ 'cotizaciones.ver': 'global' }))).toEqual([])
  })
})

describe('pestanaDe', () => {
  const soloFormula = alMenosUna([{ clave: 'formula' as const }])
  const las2 = alMenosUna([{ clave: 'niveles' as const }, { clave: 'formula' as const }])
  if (!soloFormula || !las2) {
    throw new Error('las listas no están vacías')
  }

  it('abre la que dice la URL si es una de las suyas', () => {
    expect(pestanaDe('formula', las2)).toBe('formula')
    expect(pestanaDe('niveles', las2)).toBe('niveles')
  })

  it('una que no es suya abre la primera de las suyas', () => {
    expect(pestanaDe('niveles', soloFormula)).toBe('formula')
    expect(pestanaDe('diseno', soloFormula)).toBe('formula')
  })

  it('«diseno» abre el diseño cuando es una de las suyas', () => {
    const conDiseno = alMenosUna([{ clave: 'formula' as const }, { clave: 'diseno' as const }])
    expect(pestanaDe('diseno', conDiseno ?? soloFormula)).toBe('diseno')
  })

  it('lo que no es una pestaña abre la primera', () => {
    expect(pestanaDe(undefined, las2)).toBe('niveles')
    expect(pestanaDe('<script>', las2)).toBe('niveles')
    expect(pestanaDe('', soloFormula)).toBe('formula')
  })
})
