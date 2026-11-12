import { describe, expect, it } from 'vitest'
import { esIos, estaInstalada, ofrecerInstalacion } from './instalacion'

describe('ofrecerInstalacion', () => {
  it('ya instalada: nada, aunque haya evento o sea iOS', () => {
    expect(ofrecerInstalacion({ instalada: true, ios: false, hayEvento: true })).toBe('ninguna')
    expect(ofrecerInstalacion({ instalada: true, ios: true, hayEvento: false })).toBe('ninguna')
  })

  it('con el evento del navegador: el aviso nativo', () => {
    expect(ofrecerInstalacion({ instalada: false, ios: false, hayEvento: true })).toBe('prompt')
  })

  it('iOS sin evento: las instrucciones', () => {
    expect(ofrecerInstalacion({ instalada: false, ios: true, hayEvento: false })).toBe(
      'instrucciones',
    )
  })

  it('ni evento ni iOS: el navegador no instala', () => {
    expect(ofrecerInstalacion({ instalada: false, ios: false, hayEvento: false })).toBe('ninguna')
  })

  it('evento e iOS a la vez: gana el aviso nativo', () => {
    expect(ofrecerInstalacion({ instalada: false, ios: true, hayEvento: true })).toBe('prompt')
  })
})

describe('esIos', () => {
  it('reconoce iPhone y iPad por el user agent', () => {
    expect(esIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'iPhone', 5)).toBe(true)
    expect(esIos('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)', 'iPad', 5)).toBe(true)
  })

  it('el iPad que se presenta como Mac se delata por lo táctil', () => {
    expect(esIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5)).toBe(true)
  })

  it('un Mac de escritorio y Android no son iOS', () => {
    expect(esIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0)).toBe(false)
    expect(esIos('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 'Linux armv81', 5)).toBe(false)
  })
})

describe('estaInstalada', () => {
  it('standalone por media query o por navigator.standalone', () => {
    expect(estaInstalada(true, false)).toBe(true)
    expect(estaInstalada(false, true)).toBe(true)
    expect(estaInstalada(false, false)).toBe(false)
  })
})
