import { describe, expect, it } from 'vitest'
import { destinoDe } from './destino'

const DISPONIBLES = ['/leads', '/vehiculos', '/notificaciones']

describe('destinoDe', () => {
  it('sin ruta no hay a dónde ir', () => {
    expect(destinoDe(null, DISPONIBLES)).toEqual({ tipo: 'ninguno' })
    expect(destinoDe(undefined, DISPONIBLES)).toEqual({ tipo: 'ninguno' })
    expect(destinoDe('', DISPONIBLES)).toEqual({ tipo: 'ninguno' })
  })

  it('una ruta interna con pantalla es un enlace', () => {
    expect(destinoDe('/leads/8b0c6f64-0000-4000-8000-000000000001', DISPONIBLES)).toEqual({
      tipo: 'enlace',
      href: '/leads/8b0c6f64-0000-4000-8000-000000000001',
    })
    expect(destinoDe('/notificaciones', DISPONIBLES)).toEqual({
      tipo: 'enlace',
      href: '/notificaciones',
    })
  })

  it('con query o ancla, la pantalla se decide por el camino', () => {
    expect(destinoDe('/leads?abrir=1#x', DISPONIBLES)).toEqual({
      tipo: 'enlace',
      href: '/leads?abrir=1#x',
    })
    expect(destinoDe('/agenda?recordatorio=12', DISPONIBLES)).toEqual({ tipo: 'sin-pantalla' })
  })

  it('una ruta interna sin pantalla no es enlace', () => {
    expect(destinoDe('/logistica/vehiculo/abc', DISPONIBLES)).toEqual({ tipo: 'sin-pantalla' })
  })

  it('el prefijo no confunde un camino con otro', () => {
    expect(destinoDe('/leadsx', DISPONIBLES)).toEqual({ tipo: 'sin-pantalla' })
    expect(destinoDe('/leads', DISPONIBLES)).toEqual({ tipo: 'enlace', href: '/leads' })
  })

  it('Inicio (`/`) sólo es ella misma: no vuelve disponible todo lo que cuelga de la raíz', () => {
    const conInicio = ['/', '/leads']
    expect(destinoDe('/', conInicio)).toEqual({ tipo: 'enlace', href: '/' })
    expect(destinoDe('/agenda', conInicio)).toEqual({ tipo: 'sin-pantalla' })
  })

  it.each([
    '//otro.com',
    '//otro.com/leads',
    '/\\otro.com',
    '\\\\otro.com',
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'https://otro.com/leads',
    'http://otro.com',
    'data:text/html,hola',
    'leads/1',
    '/leads/1\n',
    '/leads/\t1',
    '/leads/\u0000',
    '  /leads',
  ])('nunca es enlace: %j', (ruta) => {
    expect(destinoDe(ruta, DISPONIBLES)).toEqual({ tipo: 'ninguno' })
  })
})
