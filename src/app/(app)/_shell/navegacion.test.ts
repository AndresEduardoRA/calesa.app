import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLAVES_PERMISO, type Concesion, type Permisos } from '@/shared/lib/permisos'
import { NAVEGACION, entradasVisibles, estaEn } from './navegacion'

const CARPETA_APP = path.join(process.cwd(), 'src/app/(app)')

function concesiones(...claves: Concesion['clave'][]): Permisos {
  return claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' }))
}

describe('NAVEGACION', () => {
  it.each(NAVEGACION.map((entrada) => [entrada.ruta, entrada.disponible] as const))(
    '%s: «disponible» dice la verdad sobre si la pantalla existe',
    (ruta, disponible) => {
      const pagina = path.join(CARPETA_APP, ruta, 'page.tsx')
      expect(existsSync(pagina)).toBe(disponible)
    },
  )

  it('no repite claves ni rutas', () => {
    expect(new Set(NAVEGACION.map((entrada) => entrada.clave)).size).toBe(NAVEGACION.length)
    expect(new Set(NAVEGACION.map((entrada) => entrada.ruta)).size).toBe(NAVEGACION.length)
  })

  it('la barra lateral no pasa de 8 entradas (7 más Repuestos)', () => {
    expect(NAVEGACION.filter((entrada) => entrada.zona === 'principal').length).toBeLessThanOrEqual(
      8,
    )
  })
})

describe('entradasVisibles', () => {
  it('sin ningún permiso se ve Inicio y nada roto', () => {
    expect(entradasVisibles([], 'principal').map((entrada) => entrada.clave)).toEqual(['inicio'])
    expect(entradasVisibles([], 'usuario').map((entrada) => entrada.clave)).toEqual(['perfil'])
  })

  it('nunca muestra una entrada sin pantalla, ni con todos los permisos', () => {
    const todo = concesiones(...CLAVES_PERMISO)
    const visibles = [...entradasVisibles(todo, 'principal'), ...entradasVisibles(todo, 'usuario')]
    expect(visibles.every((entrada) => entrada.disponible)).toBe(true)
    expect(visibles.length).toBe(NAVEGACION.filter((entrada) => entrada.disponible).length)
  })

  it('una entrada con permisos pide alguno de ellos', () => {
    const leads = NAVEGACION.find((entrada) => entrada.clave === 'leads')
    expect(leads?.permisos).toEqual(['leads.ver'])
  })
})

describe('estaEn', () => {
  it('el inicio sólo es el inicio', () => {
    expect(estaEn('/', '/')).toBe(true)
    expect(estaEn('/perfil', '/')).toBe(false)
  })

  it('una ruta hija pertenece a su entrada, una parecida no', () => {
    expect(estaEn('/leads/123', '/leads')).toBe(true)
    expect(estaEn('/leads', '/leads')).toBe(true)
    expect(estaEn('/leads-viejos', '/leads')).toBe(false)
  })
})
