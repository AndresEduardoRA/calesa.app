import { describe, expect, it } from 'vitest'
import { NAVEGADOR_DESCONOCIDO, nombreDelNavegador } from './navegador'

describe('nombreDelNavegador', () => {
  it.each([
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      'Chrome en Windows',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Edg/126.0',
      'Edge en Windows',
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      'Safari en iPhone',
    ],
    ['Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0', 'Firefox en Linux'],
    [
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
      'Chrome en Android',
    ],
  ])('%s → %s', (agente, esperado) => {
    expect(nombreDelNavegador(agente)).toBe(esperado)
  })

  it('sin user_agent o desconocido, un nombre genérico', () => {
    expect(nombreDelNavegador(null)).toBe(NAVEGADOR_DESCONOCIDO)
    expect(nombreDelNavegador('')).toBe(NAVEGADOR_DESCONOCIDO)
    expect(nombreDelNavegador('curl/8.0')).toBe(NAVEGADOR_DESCONOCIDO)
  })
})
