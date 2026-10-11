import { describe, expect, it } from 'vitest'
import {
  decidirAcceso,
  destinoTrasIngresar,
  esRutaPublica,
  returnToSeguro,
  rutaDeIngreso,
  unParametro,
} from './rutas'

describe('returnToSeguro', () => {
  it('acepta una ruta interna con su query', () => {
    expect(returnToSeguro('/leads?vista=embudo')).toBe('/leads?vista=embudo')
  })

  it.each([
    ['otro sitio con esquema', 'https://malo.com'],
    ['otro sitio sin esquema', '//malo.com/x'],
    ['barra invertida', '/\\malo.com'],
    ['salto de línea', '/leads\nSet-Cookie: x=1'],
    ['ruta relativa', 'leads'],
    ['vacío', ''],
  ])('rechaza %s', (_caso, valor) => {
    expect(returnToSeguro(valor)).toBeNull()
  })

  it('rechaza las pantallas de acceso: devolverían al punto de partida', () => {
    expect(returnToSeguro('/ingreso')).toBeNull()
    expect(returnToSeguro('/registro?x=1')).toBeNull()
    expect(returnToSeguro('/auth/nueva-contrasena')).toBeNull()
  })

  it('devuelve null sin valor', () => {
    expect(returnToSeguro(null)).toBeNull()
    expect(returnToSeguro(undefined)).toBeNull()
  })
})

describe('destinoTrasIngresar y rutaDeIngreso', () => {
  it('cae al inicio cuando el returnTo no sirve', () => {
    expect(destinoTrasIngresar('//malo.com')).toBe('/')
    expect(destinoTrasIngresar('/vehiculos')).toBe('/vehiculos')
  })

  it('no agrega returnTo cuando el destino es el inicio', () => {
    expect(rutaDeIngreso('/')).toBe('/ingreso')
    expect(rutaDeIngreso(null)).toBe('/ingreso')
  })

  it('codifica el returnTo completo', () => {
    expect(rutaDeIngreso('/leads?vista=embudo&id=3')).toBe(
      '/ingreso?returnTo=%2Fleads%3Fvista%3Dembudo%26id%3D3',
    )
  })
})

describe('esRutaPublica', () => {
  it('conoce las pantallas de acceso y todo /auth', () => {
    expect(esRutaPublica('/ingreso')).toBe(true)
    expect(esRutaPublica('/recuperar')).toBe(true)
    expect(esRutaPublica('/auth/callback')).toBe(true)
    expect(esRutaPublica('/')).toBe(false)
    expect(esRutaPublica('/ingresos')).toBe(false)
  })
})

describe('decidirAcceso', () => {
  const base = { busqueda: '', esAccion: false }

  it('sin sesión, una ruta protegida va al ingreso con returnTo', () => {
    expect(
      decidirAcceso({ ...base, ruta: '/leads', busqueda: '?vista=embudo', haySesion: false }),
    ).toEqual({ tipo: 'redirigir', destino: '/ingreso?returnTo=%2Fleads%3Fvista%3Dembudo' })
  })

  it('sin sesión, el inicio va al ingreso sin returnTo', () => {
    expect(decidirAcceso({ ...base, ruta: '/', haySesion: false })).toEqual({
      tipo: 'redirigir',
      destino: '/ingreso',
    })
  })

  it('sin sesión, las públicas siguen', () => {
    for (const ruta of ['/ingreso', '/registro', '/recuperar', '/auth/callback']) {
      expect(decidirAcceso({ ...base, ruta, haySesion: false })).toEqual({ tipo: 'seguir' })
    }
  })

  it('con sesión, ingreso y registro mandan al inicio o al returnTo', () => {
    expect(decidirAcceso({ ...base, ruta: '/ingreso', haySesion: true })).toEqual({
      tipo: 'redirigir',
      destino: '/',
    })
    expect(
      decidirAcceso({
        ...base,
        ruta: '/registro',
        busqueda: '?returnTo=%2Fvehiculos',
        haySesion: true,
      }),
    ).toEqual({ tipo: 'redirigir', destino: '/vehiculos' })
  })

  it('con sesión, un returnTo hacia afuera se ignora', () => {
    expect(
      decidirAcceso({
        ...base,
        ruta: '/ingreso',
        busqueda: '?returnTo=%2F%2Fmalo.com',
        haySesion: true,
      }),
    ).toEqual({ tipo: 'redirigir', destino: '/' })
  })

  it('con sesión, recuperar y /auth siguen: ahí se cambia la contraseña', () => {
    expect(decidirAcceso({ ...base, ruta: '/recuperar', haySesion: true })).toEqual({
      tipo: 'seguir',
    })
    expect(decidirAcceso({ ...base, ruta: '/auth/nueva-contrasena', haySesion: true })).toEqual({
      tipo: 'seguir',
    })
  })

  it('una Server Action nunca se redirige, ni sin sesión', () => {
    expect(
      decidirAcceso({ ruta: '/perfil', busqueda: '', haySesion: false, esAccion: true }),
    ).toEqual({ tipo: 'seguir' })
  })
})

describe('unParametro', () => {
  it('toma el valor o el primero si vino repetido', () => {
    expect(unParametro('a')).toBe('a')
    expect(unParametro(['a', 'b'])).toBe('a')
    expect(unParametro(undefined)).toBeUndefined()
    expect(unParametro([])).toBeUndefined()
  })
})
