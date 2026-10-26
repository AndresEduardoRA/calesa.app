import { describe, expect, it } from 'vitest'
import {
  abreConSuCaracter,
  estadosDe,
  hayCambio,
  leerTipeado,
  normalizar,
  textoParaEditar,
} from './estado'

describe('estadosDe', () => {
  const base = { suggested: false, overridden: false, disabledReason: undefined }

  it('normal si el binding no dice otra cosa', () => {
    expect(estadosDe(base)).toBe('normal')
  })

  it('sugerido pinta el punto', () => {
    expect(estadosDe({ ...base, suggested: true })).toBe('sugerido')
  })

  it('modificado gana sobre sugerido: con un override ya no hay sugerido en uso', () => {
    expect(estadosDe({ ...base, suggested: true, overridden: true })).toBe('modificado')
  })

  it('deshabilitado se suma a los otros', () => {
    expect(estadosDe({ ...base, suggested: true, disabledReason: 'Está apagado' })).toBe(
      'sugerido deshabilitado',
    )
    expect(estadosDe({ ...base, disabledReason: 'Está apagado' })).toBe('deshabilitado')
  })

  it('un motivo vacío no deshabilita', () => {
    expect(estadosDe({ ...base, disabledReason: '' })).toBe('normal')
  })
})

describe('leerTipeado', () => {
  it('lee la coma y el punto decimal', () => {
    expect(leerTipeado('1,5', 'monto')).toEqual({ ok: true, valor: 1.5 })
    expect(leerTipeado('1.5', 'monto')).toEqual({ ok: true, valor: 1.5 })
  })

  it('vacío y blancos son null, no 0', () => {
    expect(leerTipeado('', 'monto')).toEqual({ ok: true, valor: null })
    expect(leerTipeado('  ', 'monto')).toEqual({ ok: true, valor: null })
    expect(leerTipeado(' \t ', 'porcentaje')).toEqual({ ok: true, valor: null })
  })

  it('quita los blancos de los lados', () => {
    expect(leerTipeado('  12,5 ', 'numero')).toEqual({ ok: true, valor: 12.5 })
  })

  it.each(['Infinity', '-Infinity', '1e999', '1,2,3', 'abc', '12abc', '1..2'])(
    'no lee «%s»',
    (texto) => {
      expect(leerTipeado(texto, 'monto')).toEqual({ ok: false })
    },
  )

  it('el porcentaje se tipea en puntos y sale como fracción', () => {
    expect(leerTipeado('14,94', 'porcentaje')).toEqual({ ok: true, valor: 0.1494 })
    expect(leerTipeado('13', 'porcentaje')).toEqual({ ok: true, valor: 0.13 })
  })

  it('normaliza a 15 cifras (0,07 / 100 no deja ruido binario)', () => {
    const t = leerTipeado('7', 'porcentaje')
    expect(t).toEqual({ ok: true, valor: 0.07 })
  })

  it('acepta negativos y cero', () => {
    expect(leerTipeado('-3,5', 'monto')).toEqual({ ok: true, valor: -3.5 })
    expect(leerTipeado('0', 'monto')).toEqual({ ok: true, valor: 0 })
  })
})

describe('textoParaEditar', () => {
  it('abre con la precisión completa', () => {
    expect(textoParaEditar(1234.567, 'monto', 'es-BO')).toBe('1234,567')
  })

  it('el porcentaje se abre en puntos, sin el ruido de multiplicar por 100', () => {
    expect(textoParaEditar(0.1494, 'porcentaje', 'es-BO')).toBe('14,94')
  })

  it('null abre vacío', () => {
    expect(textoParaEditar(null, 'monto', 'es-BO')).toBe('')
  })
})

describe('hayCambio', () => {
  it('el mismo texto no cambia nada', () => {
    expect(hayCambio('1234,567', '1234,567', 1234.567, 1234.567)).toBe(false)
  })

  it('otro texto con el mismo número no cambia nada', () => {
    expect(hayCambio('1234,567', '1234,5670', 1234.567, 1234.567)).toBe(false)
  })

  it('un value con más de 15 cifras se compara normalizado', () => {
    expect(hayCambio('0,3', '0,30', 0.3, 0.1 + 0.2)).toBe(false)
  })

  it('un número distinto cambia', () => {
    expect(hayCambio('1234,567', '1234,568', 1234.568, 1234.567)).toBe(true)
  })

  it('de un valor a vacío cambia, y de vacío a vacío no', () => {
    expect(hayCambio('5', '', null, 5)).toBe(true)
    expect(hayCambio('', '  ', null, null)).toBe(false)
  })

  it('de vacío a un número cambia', () => {
    expect(hayCambio('', '5', 5, null)).toBe(true)
  })
})

describe('normalizar', () => {
  it('absorbe el ruido binario', () => {
    expect(normalizar(0.1 + 0.2)).toBe(0.3)
    expect(normalizar(-0)).toBe(0)
  })
})

describe('abreConSuCaracter', () => {
  it('un dígito, la coma y el signo abren', () => {
    expect(abreConSuCaracter('5', false, false, false)).toBe(true)
    expect(abreConSuCaracter(',', false, false, false)).toBe(true)
    expect(abreConSuCaracter('-', false, false, false)).toBe(true)
  })

  it('el espacio, las teclas con nombre y los atajos no', () => {
    expect(abreConSuCaracter(' ', false, false, false)).toBe(false)
    expect(abreConSuCaracter('Enter', false, false, false)).toBe(false)
    expect(abreConSuCaracter('Tab', false, false, false)).toBe(false)
    expect(abreConSuCaracter('s', true, false, false)).toBe(false)
    expect(abreConSuCaracter('s', false, true, false)).toBe(false)
    expect(abreConSuCaracter('s', false, false, true)).toBe(false)
  })
})
