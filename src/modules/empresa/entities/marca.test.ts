import { describe, expect, it } from 'vitest'
import {
  RUTA_DE_LOGO,
  avisoDeLogoChico,
  extensionDeLogo,
  medidasDeSvg,
  motivoDeLogoInvalido,
  motivoDeLogoPesado,
  motivoDeSvgInvalido,
  svgConMedidas,
  validarColorDeMarca,
} from './marca'

describe('validarColorDeMarca', () => {
  it('acepta un color que da contraste y lo deja en minúsculas', () => {
    expect(validarColorDeMarca(' #0B7285 ')).toEqual({ ok: true, color: '#0b7285' })
    expect(validarColorDeMarca('#000000').ok).toBe(true)
    expect(validarColorDeMarca('#ffd43b').ok).toBe(true)
  })

  it('rechaza lo que no es un hex de seis dígitos', () => {
    const resultado = validarColorDeMarca('azul')
    expect(resultado.ok).toBe(false)
    expect(!resultado.ok && resultado.motivo).toContain('#rrggbb')
  })

  it('rechaza un color sin contraste diciendo cuánto da y cuál sí sirve', () => {
    const resultado = validarColorDeMarca('#ff0000')
    expect(resultado.ok).toBe(false)
    if (resultado.ok) {
      return
    }
    expect(resultado.motivo).toContain('4:1 en blanco')
    expect(resultado.motivo).toContain('hace falta 4,5:1')
    const sugerido = /sirve: (#[0-9a-f]{6})\./.exec(resultado.motivo)?.[1] ?? ''
    expect(validarColorDeMarca(sugerido).ok).toBe(true)
  })
})

describe('el archivo del logo', () => {
  it('reconoce los cuatro formatos', () => {
    expect(extensionDeLogo('image/svg+xml')).toBe('svg')
    expect(extensionDeLogo('image/jpeg')).toBe('jpg')
    expect(extensionDeLogo('image/gif')).toBeNull()
    expect(extensionDeLogo('application/pdf')).toBeNull()
  })

  it('rechaza por formato o por peso con el motivo', () => {
    expect(motivoDeLogoInvalido({ tipo: 'image/png', peso: 300_000 })).toBeNull()
    expect(motivoDeLogoInvalido({ tipo: 'image/gif', peso: 10 })).toContain('SVG, PNG, WebP o JPEG')
    expect(motivoDeLogoInvalido({ tipo: 'image/svg+xml', peso: 300_000 })).toContain('200 KB')
    expect(motivoDeLogoInvalido({ tipo: 'image/png', peso: 11 * 1024 * 1024 })).toContain('10 MB')
  })

  it('lo que se sube no pasa de 1 MB', () => {
    expect(motivoDeLogoPesado(1024 * 1024)).toBeNull()
    expect(motivoDeLogoPesado(1024 * 1024 + 1)).toContain('1 MB')
  })

  it('la ruta guardada es un objeto de la carpeta de logos nombrado por su hash', () => {
    expect(RUTA_DE_LOGO.test(`logos/${'a'.repeat(64)}.svg`)).toBe(true)
    expect(RUTA_DE_LOGO.test(`iconos/${'a'.repeat(64)}.png`)).toBe(false)
    expect(RUTA_DE_LOGO.test('logos/../otro.png')).toBe(false)
  })
})

describe('motivoDeSvgInvalido', () => {
  it('acepta un SVG simple con viewBox o con ancho y alto', () => {
    expect(motivoDeSvgInvalido('<svg viewBox="0 0 10 10"><rect/></svg>')).toBeNull()
    expect(motivoDeSvgInvalido('<?xml version="1.0"?><svg width="10" height="10"/>')).toBeNull()
  })

  it('rechaza el que trae código o contenido incrustado', () => {
    expect(motivoDeSvgInvalido('<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>')).toContain(
      'código',
    )
    expect(motivoDeSvgInvalido('<svg viewBox="0 0 1 1" onload="x()"/>')).toContain('código')
    expect(motivoDeSvgInvalido('<svg/onload=x() viewBox="0 0 1 1"/>')).toContain('código')
    expect(motivoDeSvgInvalido('<svg viewBox="0 0 1 1"><foreignObject/></svg>')).toContain('código')
  })

  it('rechaza el que no dice cuánto mide y lo que no es un SVG', () => {
    expect(motivoDeSvgInvalido('<svg><rect/></svg>')).toContain('viewBox')
    expect(motivoDeSvgInvalido('<html></html>')).toBe('El archivo no es un SVG.')
  })
})

describe('avisoDeLogoChico', () => {
  it('avisa de un raster de menos de 512 px, no de un SVG', () => {
    expect(avisoDeLogoChico('image/png', { ancho: 200, alto: 80 })).toContain('200 × 80')
    expect(avisoDeLogoChico('image/png', { ancho: 512, alto: 200 })).toBeNull()
    expect(avisoDeLogoChico('image/svg+xml', { ancho: 24, alto: 24 })).toBeNull()
  })
})

describe('medidasDeSvg y svgConMedidas', () => {
  it('lee el ancho y el alto, o el viewBox si no los trae', () => {
    expect(medidasDeSvg('<svg width="120" height="40px" viewBox="0 0 12 4"/>')).toEqual({
      ancho: 120,
      alto: 40,
    })
    expect(medidasDeSvg('<svg viewBox="0 0 300 100"><rect width="5" height="5"/></svg>')).toEqual({
      ancho: 300,
      alto: 100,
    })
    expect(medidasDeSvg('<svg viewBox="0,0,24,24"/>')).toEqual({ ancho: 24, alto: 24 })
  })

  it('un ancho en porcentaje no sirve: vale el viewBox', () => {
    expect(medidasDeSvg('<svg width="100%" height="100%" viewBox="0 0 64 32"/>')).toEqual({
      ancho: 64,
      alto: 32,
    })
  })

  it('sin medidas devuelve null', () => {
    expect(medidasDeSvg('<svg><rect/></svg>')).toBeNull()
    expect(medidasDeSvg('no es un svg')).toBeNull()
  })

  it('deja las medidas explícitas en la raíz, sin tocar lo de adentro', () => {
    const con = svgConMedidas(
      '<svg width="100%" viewBox="0 0 64 32"><rect width="5" height="5"/></svg>',
      { ancho: 64, alto: 32 },
    )
    expect(con).toBe(
      '<svg viewBox="0 0 64 32" width="64" height="32"><rect width="5" height="5"/></svg>',
    )
    expect(medidasDeSvg(con)).toEqual({ ancho: 64, alto: 32 })
  })
})
