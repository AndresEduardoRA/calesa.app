import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CLAVES_PERMISO,
  alcanceDe,
  concesionesDe,
  esClavePermiso,
  origenesCon,
  puede,
  type Permisos,
} from './permisos'

const USA = '11111111-1111-1111-1111-111111111111'
const COREA = '22222222-2222-2222-2222-222222222222'

const asesora: Permisos = [
  { clave: 'leads.ver', origenId: null, alcance: 'propios' },
  { clave: 'vehiculos.ver', origenId: USA, alcance: 'propios' },
  { clave: 'vehiculos.ver', origenId: COREA, alcance: 'todos' },
  { clave: 'flujos.mover', origenId: USA, alcance: 'todos' },
]

describe('catálogo', () => {
  it('coincide exactamente con las claves que siembra supabase/seed.sql', () => {
    const seed = readFileSync(path.join(process.cwd(), 'supabase/seed.sql'), 'utf8')
    const inicio = seed.indexOf('insert into public.permisos')
    const fin = seed.indexOf('on conflict (clave)', inicio)
    expect(inicio).toBeGreaterThan(-1)
    expect(fin).toBeGreaterThan(inicio)

    const delSeed = [
      ...seed.slice(inicio, fin).matchAll(/^\s*\('([a-z]+(?:\.[a-z_]+){1,3})'/gm),
    ].map((m) => m[1])
    expect(delSeed.length).toBeGreaterThan(0)
    expect([...CLAVES_PERMISO].sort()).toEqual([...delSeed].sort())
  })

  it('no repite claves', () => {
    expect(new Set(CLAVES_PERMISO).size).toBe(CLAVES_PERMISO.length)
  })

  it('reconoce una clave válida y rechaza una inventada', () => {
    expect(esClavePermiso('leads.ver')).toBe(true)
    expect(esClavePermiso('leads.volar')).toBe(false)
  })
})

describe('concesionesDe', () => {
  it('convierte las filas de mis_permisos() a concesiones', () => {
    const filas = [
      { clave: 'leads.ver', origen_id: null, alcance: 'propios' },
      { clave: 'flujos.mover', origen_id: USA, alcance: 'todos' },
    ]
    expect(concesionesDe(filas)).toEqual([
      { clave: 'leads.ver', origenId: null, alcance: 'propios' },
      { clave: 'flujos.mover', origenId: USA, alcance: 'todos' },
    ])
  })

  it('descarta una clave que el catálogo no conoce', () => {
    const filas = [{ clave: 'leads.volar', origen_id: null, alcance: 'todos' }]
    expect(concesionesDe(filas)).toEqual([])
  })

  it('rechaza una respuesta con otra forma', () => {
    expect(() => concesionesDe([{ clave: 'leads.ver', alcance: 'algunos' }])).toThrow()
    expect(() => concesionesDe(null)).toThrow()
  })
})

describe('puede', () => {
  it('sin permisos no puede nada', () => {
    expect(puede([], 'leads.ver')).toBe(false)
  })

  it('una concesión sin origen vale para cualquier origen', () => {
    expect(puede(asesora, 'leads.ver')).toBe(true)
    expect(puede(asesora, 'leads.ver', USA)).toBe(true)
  })

  it('una concesión acotada sólo vale en su origen', () => {
    expect(puede(asesora, 'flujos.mover', USA)).toBe(true)
    expect(puede(asesora, 'flujos.mover', COREA)).toBe(false)
  })

  it('sin origen pedido alcanza con tenerlo en alguno (para armar menús)', () => {
    expect(puede(asesora, 'flujos.mover')).toBe(true)
    expect(puede(asesora, 'flujos.mover', null)).toBe(true)
  })

  it('no confunde una clave con otra', () => {
    expect(puede(asesora, 'leads.editar')).toBe(false)
  })
})

describe('alcanceDe', () => {
  it('es null si no tiene el permiso', () => {
    expect(alcanceDe(asesora, 'leads.editar')).toBeNull()
    expect(alcanceDe(asesora, 'flujos.mover', COREA)).toBeNull()
  })

  it('devuelve el alcance de la concesión que cubre el origen', () => {
    expect(alcanceDe(asesora, 'vehiculos.ver', USA)).toBe('propios')
    expect(alcanceDe(asesora, 'vehiculos.ver', COREA)).toBe('todos')
  })

  it('gana «todos» cuando varias concesiones aplican', () => {
    expect(alcanceDe(asesora, 'vehiculos.ver')).toBe('todos')
    const dosRoles: Permisos = [
      { clave: 'leads.ver', origenId: null, alcance: 'propios' },
      { clave: 'leads.ver', origenId: null, alcance: 'todos' },
    ]
    expect(alcanceDe(dosRoles, 'leads.ver')).toBe('todos')
  })
})

describe('origenesCon', () => {
  it('es «todos» si alguna concesión no está acotada', () => {
    expect(origenesCon(asesora, 'leads.ver')).toBe('todos')
  })

  it('lista los orígenes sin repetir', () => {
    const repetida: Permisos = [
      ...asesora,
      { clave: 'vehiculos.ver', origenId: USA, alcance: 'todos' },
    ]
    expect(origenesCon(repetida, 'vehiculos.ver')).toEqual([USA, COREA])
  })

  it('es vacío si no tiene el permiso', () => {
    expect(origenesCon(asesora, 'leads.editar')).toEqual([])
  })
})
