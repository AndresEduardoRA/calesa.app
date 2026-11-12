import { describe, expect, it } from 'vitest'
import { estadoDelPush, sePuedeMover, type HechosDelPush } from './estado-del-push'

const LISTO: HechosDelPush = {
  tienePermiso: true,
  integracionActiva: true,
  clavePublica: 'clave',
  soporte: true,
  permisoDelNavegador: 'default',
  suscrito: false,
}

describe('estadoDelPush', () => {
  it('sin el permiso gana a todo lo demás', () => {
    const lectura = estadoDelPush({
      ...LISTO,
      tienePermiso: false,
      integracionActiva: false,
      clavePublica: null,
      soporte: false,
      permisoDelNavegador: 'denied',
    })
    expect(lectura.estado).toBe('sin_permiso')
    expect(lectura.motivo).toBe('Tu rol no recibe avisos push.')
  })

  it('la integración apagada gana a la clave que falta', () => {
    const lectura = estadoDelPush({ ...LISTO, integracionActiva: false, clavePublica: null })
    expect(lectura.estado).toBe('integracion_apagada')
    expect(lectura.motivo).toBe('La empresa todavía no activó los avisos push.')
    expect(lectura.ayuda).toContain('Integraciones')
  })

  it.each([null, ''])('la clave %j deja «sin_clave»', (clavePublica) => {
    expect(estadoDelPush({ ...LISTO, clavePublica }).estado).toBe('sin_clave')
  })

  it('sin soporte del navegador', () => {
    expect(estadoDelPush({ ...LISTO, soporte: false }).estado).toBe('sin_soporte')
  })

  it('«negado» sólo si el navegador tiene soporte', () => {
    expect(estadoDelPush({ ...LISTO, permisoDelNavegador: 'denied' }).estado).toBe('negado')
    expect(estadoDelPush({ ...LISTO, soporte: false, permisoDelNavegador: 'denied' }).estado).toBe(
      'sin_soporte',
    )
  })

  it('«encendido» pide suscripción y permiso concedido', () => {
    expect(estadoDelPush({ ...LISTO, suscrito: true, permisoDelNavegador: 'granted' }).estado).toBe(
      'encendido',
    )
    expect(estadoDelPush({ ...LISTO, suscrito: true, permisoDelNavegador: 'default' }).estado).toBe(
      'apagado',
    )
    expect(
      estadoDelPush({ ...LISTO, suscrito: false, permisoDelNavegador: 'granted' }).estado,
    ).toBe('apagado')
  })

  it('sólo se mueve el interruptor en «encendido» y «apagado»', () => {
    expect(sePuedeMover('encendido')).toBe(true)
    expect(sePuedeMover('apagado')).toBe(true)
    for (const estado of [
      'sin_permiso',
      'integracion_apagada',
      'sin_clave',
      'sin_soporte',
      'negado',
    ] as const) {
      expect(sePuedeMover(estado)).toBe(false)
    }
  })
})
