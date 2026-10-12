import { describe, expect, it } from 'vitest'
import { COLOR_FONDO_CLARO, COLOR_SUPERFICIE_OSCURA, COLOR_TEMA } from '@/shared/config/app'
import {
  CONTRASTE_AA,
  contraste,
  cssDeMarca,
  esHex,
  luminancia,
  mezclar,
  tokensDeMarca,
} from './color'

describe('esHex', () => {
  it('acepta sólo un hex de seis dígitos', () => {
    expect(esHex('#3b5bdb')).toBe(true)
    expect(esHex('#3B5BDB')).toBe(true)
    expect(esHex('#fff')).toBe(false)
    expect(esHex('3b5bdb')).toBe(false)
    expect(esHex('red;}body{display:none')).toBe(false)
  })
})

describe('luminancia y contraste', () => {
  it('negro sobre blanco da 21 y un color consigo mismo da 1', () => {
    expect(luminancia('#000000')).toBe(0)
    expect(luminancia('#ffffff')).toBeCloseTo(1, 5)
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contraste('#3b5bdb', '#3b5bdb')).toBe(1)
  })

  it('no depende del orden', () => {
    expect(contraste('#ffffff', '#3b5bdb')).toBe(contraste('#3b5bdb', '#ffffff'))
  })
})

describe('mezclar', () => {
  it('va de un color al otro según el peso', () => {
    expect(mezclar('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mezclar('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(mezclar('#000000', '#ffffff', 0.5)).toBe('#808080')
  })
})

describe('tokensDeMarca', () => {
  it('el color neutro del producto pasa, con texto blanco encima', () => {
    const marca = tokensDeMarca(COLOR_TEMA)
    expect(marca.ok && marca.tokens.sobrePrimario).toBe('#ffffff')
  })

  it('un color claro lleva la tinta oscura encima', () => {
    const marca = tokensDeMarca('#ffd43b')
    expect(marca.ok && marca.tokens.sobrePrimario).toBe('#1b2130')
  })

  it('negro y azul marino se aceptan', () => {
    expect(tokensDeMarca('#000000').ok).toBe(true)
    expect(tokensDeMarca('#0b1f4b').ok).toBe(true)
  })

  it('un tono intermedio que no se lee con ningún texto se rechaza y propone uno cercano', () => {
    const rojo = tokensDeMarca('#ff0000')
    expect(rojo.ok).toBe(false)
    if (rojo.ok) {
      return
    }
    expect(rojo.conBlanco).toBeLessThan(CONTRASTE_AA)
    expect(rojo.conTinta).toBeLessThan(CONTRASTE_AA)
    expect(tokensDeMarca(rojo.sugerido).ok).toBe(true)
  })

  it('el texto derivado siempre llega a AA sobre la superficie de su tema', () => {
    for (const color of ['#3b5bdb', '#ffd43b', '#000000', '#0b7285', '#f8f9fa', '#e8590c']) {
      const marca = tokensDeMarca(color)
      if (!marca.ok) {
        continue
      }
      const { tokens } = marca
      expect(contraste(tokens.claro.ink, COLOR_FONDO_CLARO)).toBeGreaterThanOrEqual(CONTRASTE_AA)
      expect(contraste(tokens.oscuro.ink, COLOR_SUPERFICIE_OSCURA)).toBeGreaterThanOrEqual(
        CONTRASTE_AA,
      )
      expect(contraste(tokens.primario, tokens.sobrePrimario)).toBeGreaterThanOrEqual(CONTRASTE_AA)
      // Al pasar el cursor el relleno se aleja del texto: no pierde contraste.
      expect(contraste(tokens.primarioOscuro, tokens.sobrePrimario)).toBeGreaterThanOrEqual(
        contraste(tokens.primario, tokens.sobrePrimario),
      )
    }
  })

  it('guarda el color en minúsculas', () => {
    const marca = tokensDeMarca('#0B7285')
    expect(marca.ok && marca.tokens.primario).toBe('#0b7285')
  })
})

describe('cssDeMarca', () => {
  it('pisa las variables de marca en claro y las dos que cambian en oscuro', () => {
    const marca = tokensDeMarca('#0b7285')
    if (!marca.ok) {
      throw new Error('el color de prueba debía pasar')
    }
    const css = cssDeMarca(marca.tokens)
    expect(css).toContain(':root{--color-primario:#0b7285;')
    expect(css).toContain('--color-sobre-primario:#ffffff;')
    expect(css).toMatch(/\.dark\{--color-primario-ink:#[0-9a-f]{6};--color-primario-soft:rgba\(/)
  })
})
