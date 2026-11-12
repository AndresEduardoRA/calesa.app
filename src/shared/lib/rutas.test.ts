import { describe, expect, it } from 'vitest'
import {
  PANEL_NUEVO_DE_VEHICULOS,
  RUTAS,
  decidirAcceso,
  destinoTrasIngresar,
  esRutaPublica,
  returnToSeguro,
  rutaDeIngreso,
  unParametro,
  unidadDeLogistica,
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

  it('deja pasar lo de /api/portal/, que valida su propia cookie, y nada más', () => {
    expect(esRutaPublica('/api/portal/estado')).toBe(true)
    expect(esRutaPublica('/api/portal/documentos/0b6f8f8e-6f6a-4c1e-9d3e-0a6e2c5b7f10')).toBe(true)
    expect(esRutaPublica('/api/portal')).toBe(false)
    expect(esRutaPublica('/api/portalx')).toBe(false)
    expect(esRutaPublica('/api/portal-x/a')).toBe(false)
  })

  it('sin sesión, una ruta del portal sigue sin ir al ingreso', () => {
    expect(
      decidirAcceso({
        ruta: '/api/portal/estado',
        busqueda: '',
        haySesion: false,
        esAccion: false,
      }),
    ).toEqual({ tipo: 'seguir' })
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

describe('unidadDeLogistica', () => {
  it('es la ruta del panel de una unidad, la que abre la notificación de demora', () => {
    expect(unidadDeLogistica('6f1b7c1e-2f0a-4e0f-9c52-1d7c1a2b3c4d')).toBe(
      '/logistica/vehiculo/6f1b7c1e-2f0a-4e0f-9c52-1d7c1a2b3c4d',
    )
  })

  it('un id con caracteres de ruta no sale de ella', () => {
    expect(unidadDeLogistica('../x?y#z')).toBe('/logistica/vehiculo/..%2Fx%3Fy%23z')
  })
})

describe('rutas de crear', () => {
  it('«Nuevo vehículo» abre el panel con el valor compartido', () => {
    expect(RUTAS.nuevoVehiculo).toBe(`/vehiculos?panel=${PANEL_NUEVO_DE_VEHICULOS}`)
  })

  it('la hoja de cotizar y el listado cuelgan de /cotizaciones', () => {
    expect(RUTAS.nuevaCotizacion).toBe(`${RUTAS.cotizaciones}/nuevo`)
  })
})
