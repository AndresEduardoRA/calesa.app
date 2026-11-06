import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import {
  alMenosUna,
  esPestanaDeUnArea,
  PERMISOS_DE_EMPRESA,
  pestanaDe,
  PESTANAS,
  PESTANAS_DE_LA_EMPRESA,
  pestanasVisibles,
  permisosDeLasPestanas,
  type PestanaDeEmpresa,
} from './pestanas'

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const }))

const claves = (pestanas: readonly { clave: string }[]) => pestanas.map((p) => p.clave)

// Una pestaña de un área de prueba: nunca se suma a la lista real. `cotizaciones.configurar` es una clave real de la
// entrada «Configuración» del menú.
const SERIE: PestanaDeEmpresa = {
  clave: 'serie',
  titulo: 'Serie',
  permisos: ['cotizaciones.configurar'],
}
const CON_SERIE = [...PESTANAS_DE_LA_EMPRESA, SERIE]

describe('las pestañas de la empresa (las tres fijas)', () => {
  it('Empresa, Monedas e Integraciones las ve quien tiene cualquiera de los dos permisos de hoy', () => {
    const todas = ['empresa', 'monedas', 'integraciones']
    expect(
      claves(pestanasVisibles(con('empresa.ajustes.gestionar'), PESTANAS_DE_LA_EMPRESA)),
    ).toEqual(todas)
    expect(
      claves(pestanasVisibles(con('empresa.tipos_cambio.gestionar'), PESTANAS_DE_LA_EMPRESA)),
    ).toEqual(todas)
    expect(
      claves(
        pestanasVisibles(
          con('empresa.ajustes.gestionar', 'empresa.tipos_cambio.gestionar'),
          PESTANAS_DE_LA_EMPRESA,
        ),
      ),
    ).toEqual(todas)
  })

  it('sin permisos, o con uno ajeno, no ve ninguna', () => {
    expect(pestanasVisibles([], PESTANAS_DE_LA_EMPRESA)).toEqual([])
    expect(pestanasVisibles(con('leads.ver'), PESTANAS_DE_LA_EMPRESA)).toEqual([])
  })
})

describe('una pestaña de un área (de prueba)', () => {
  it('quien sólo tiene su clave ve sólo esa pestaña', () => {
    expect(claves(pestanasVisibles(con('cotizaciones.configurar'), CON_SERIE))).toEqual(['serie'])
  })

  it('quien tiene también el permiso de Empresa ve las cuatro, la del área al final', () => {
    expect(
      claves(
        pestanasVisibles(con('empresa.ajustes.gestionar', 'cotizaciones.configurar'), CON_SERIE),
      ),
    ).toEqual(['empresa', 'monedas', 'integraciones', 'serie'])
  })

  it('los permisos de todas suman cada clave una sola vez', () => {
    const otra: PestanaDeEmpresa = {
      clave: 'otra',
      titulo: 'Otra',
      permisos: ['cotizaciones.configurar'],
    }
    expect(permisosDeLasPestanas([...CON_SERIE, otra])).toEqual([
      'empresa.ajustes.gestionar',
      'empresa.tipos_cambio.gestionar',
      'cotizaciones.configurar',
    ])
  })
})

describe('alMenosUna', () => {
  it('una lista vacía es null y una con algo es ella misma', () => {
    expect(alMenosUna([])).toBeNull()
    expect(alMenosUna([1])).toEqual([1])
    expect(alMenosUna([1, 2])).toEqual([1, 2])
  })
})

describe('pestanaDe', () => {
  it('reconoce la clave de una pestaña visible', () => {
    for (const pestana of PESTANAS_DE_LA_EMPRESA) {
      expect(pestanaDe(pestana.clave, PESTANAS_DE_LA_EMPRESA)).toBe(pestana.clave)
    }
  })

  it('sin parámetro, con uno que no existe o con una pestaña que no se ve, abre la primera visible', () => {
    expect(pestanaDe(undefined, PESTANAS_DE_LA_EMPRESA)).toBe('empresa')
    expect(pestanaDe('otra', PESTANAS_DE_LA_EMPRESA)).toBe('empresa')
    expect(pestanaDe('serie', PESTANAS_DE_LA_EMPRESA)).toBe('empresa')
    expect(pestanaDe('empresa', [SERIE])).toBe('serie')
  })
})

describe('la lista real', () => {
  it('empieza con las tres de hoy para quien entra con los permisos de hoy', () => {
    const visibles = claves(pestanasVisibles(con('empresa.ajustes.gestionar')))
    expect(visibles.slice(0, 3)).toEqual(['empresa', 'monedas', 'integraciones'])
  })

  it('sin permisos no ve ninguna', () => {
    expect(pestanasVisibles([])).toEqual([])
  })

  it('PERMISOS_DE_EMPRESA es la unión de los permisos de sus pestañas y trae los dos de hoy', () => {
    expect(PERMISOS_DE_EMPRESA).toEqual(permisosDeLasPestanas(PESTANAS))
    expect(PERMISOS_DE_EMPRESA).toContain('empresa.ajustes.gestionar')
    expect(PERMISOS_DE_EMPRESA).toContain('empresa.tipos_cambio.gestionar')
  })

  it('ninguna clave de pestaña se repite, y las tres de hoy no son de un área', () => {
    const todas = claves(PESTANAS)
    expect(new Set(todas).size).toBe(todas.length)
    expect(esPestanaDeUnArea('monedas')).toBe(false)
  })
})
