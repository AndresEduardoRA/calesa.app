import { describe, expect, it } from 'vitest'
import {
  ANCHO_DEL_CELULAR,
  ANCHO_DE_ESCRITORIO,
  CORTES_DE_ANCHO,
  anchoDeLaPeticion,
  cookieDeAncho,
} from './ancho'

const PIXEL_7 =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const TABLETA =
  'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const ESCRITORIO =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

describe('anchoDeLaPeticion', () => {
  it('la cookie manda cuando es un ancho creíble', () => {
    expect(anchoDeLaPeticion({ cookie: '915', agente: PIXEL_7 })).toBe(915)
    expect(anchoDeLaPeticion({ cookie: '412', agente: ESCRITORIO })).toBe(412)
  })

  it('sin cookie, un celular es angosto y lo demás es escritorio', () => {
    expect(anchoDeLaPeticion({ cookie: undefined, agente: PIXEL_7 })).toBe(ANCHO_DEL_CELULAR)
    expect(anchoDeLaPeticion({ cookie: undefined, agente: IPHONE })).toBe(ANCHO_DEL_CELULAR)
    expect(anchoDeLaPeticion({ cookie: undefined, agente: TABLETA })).toBe(ANCHO_DE_ESCRITORIO)
    expect(anchoDeLaPeticion({ cookie: undefined, agente: ESCRITORIO })).toBe(ANCHO_DE_ESCRITORIO)
    expect(anchoDeLaPeticion({ cookie: undefined, agente: null })).toBe(ANCHO_DE_ESCRITORIO)
  })

  it('una cookie que no es un ancho se ignora', () => {
    for (const cookie of ['', 'abc', '-400', '400.5', '12', '99999', '0400x', '150']) {
      expect(anchoDeLaPeticion({ cookie, agente: PIXEL_7 })).toBe(ANCHO_DEL_CELULAR)
    }
  })

  it('los cortes van en orden y el del celular y el de escritorio caen a cada lado de todos', () => {
    expect([...CORTES_DE_ANCHO].sort((a, b) => a - b)).toEqual([...CORTES_DE_ANCHO])
    expect(CORTES_DE_ANCHO.every((corte) => ANCHO_DEL_CELULAR < corte)).toBe(true)
    expect(CORTES_DE_ANCHO.every((corte) => ANCHO_DE_ESCRITORIO >= corte)).toBe(true)
  })
})

describe('cookieDeAncho', () => {
  it('redondea y dura un año en todo el sitio', () => {
    expect(cookieDeAncho(412.4)).toBe('ancho=412; Path=/; Max-Age=31536000; SameSite=Lax')
  })
})
