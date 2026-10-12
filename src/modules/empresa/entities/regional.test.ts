import { describe, expect, it } from 'vitest'
import { codigoDeMoneda, localeCanonico, zonaHorariaValida, zonasHorarias } from './regional'

describe('localeCanonico', () => {
  it('devuelve la forma canónica de un locale que existe', () => {
    expect(localeCanonico('es-BO')).toBe('es-BO')
    expect(localeCanonico(' es-cl ')).toBe('es-CL')
  })

  it('rechaza lo que no es un locale', () => {
    expect(localeCanonico('')).toBeNull()
    expect(localeCanonico('boliviano')).toBeNull()
    expect(localeCanonico('es_BO')).toBeNull()
    expect(localeCanonico('zz-ZZ')).toBeNull()
  })
})

describe('zonaHorariaValida', () => {
  it('acepta las zonas de la base de zonas horarias', () => {
    expect(zonaHorariaValida('America/La_Paz')).toBe(true)
    expect(zonaHorariaValida('America/Santiago')).toBe(true)
    expect(zonaHorariaValida('UTC')).toBe(true)
  })

  it('rechaza una zona que no existe', () => {
    expect(zonaHorariaValida('Marte/Olympus')).toBe(false)
    expect(zonaHorariaValida('La Paz')).toBe(false)
    expect(zonaHorariaValida('')).toBe(false)
  })
})

describe('zonasHorarias', () => {
  it('trae las zonas que el entorno conoce', () => {
    expect(zonasHorarias()).toContain('America/La_Paz')
  })
})

describe('codigoDeMoneda', () => {
  it('acepta un código ISO y lo deja en mayúsculas', () => {
    expect(codigoDeMoneda('usd')).toBe('USD')
    expect(codigoDeMoneda(' BOB ')).toBe('BOB')
  })

  it('rechaza lo que no es una moneda', () => {
    expect(codigoDeMoneda('dolar')).toBeNull()
    expect(codigoDeMoneda('XQZ')).toBeNull()
    expect(codigoDeMoneda('')).toBeNull()
  })
})
