import { describe, expect, it, vi } from 'vitest'
import {
  accionesDe,
  abreConSuCaracter,
  candadosDe,
  estadosDe,
  hayCambio,
  leerTipeado,
  normalizar,
  notasDe,
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
  it('lee con el locale de la empresa: la coma es el decimal y el punto agrupa de a 3 (4-25)', () => {
    expect(leerTipeado('1,5', 'monto', 'es-BO')).toEqual({ ok: true, valor: 1.5 })
    expect(leerTipeado('1.234', 'monto', 'es-BO')).toEqual({ ok: true, valor: 1234 })
    expect(leerTipeado('1.5', 'monto', 'es-BO')).toEqual({
      ok: false,
      aviso: 'Usa coma para los decimales: 1,5.',
    })
    expect(leerTipeado('1.5', 'monto', 'en-US')).toEqual({ ok: true, valor: 1.5 })
    expect(leerTipeado('1,5', 'monto', 'en-US')).toEqual({
      ok: false,
      aviso: 'Usa punto para los decimales: 1.5.',
    })
  })

  it('vacío y blancos son null, no 0', () => {
    expect(leerTipeado('', 'monto', 'es-BO')).toEqual({ ok: true, valor: null })
    expect(leerTipeado('  ', 'monto', 'es-BO')).toEqual({ ok: true, valor: null })
    expect(leerTipeado(' \t ', 'porcentaje', 'es-BO')).toEqual({ ok: true, valor: null })
  })

  it('quita los blancos de los lados', () => {
    expect(leerTipeado('  12,5 ', 'numero', 'es-BO')).toEqual({ ok: true, valor: 12.5 })
  })

  it.each(['Infinity', '-Infinity', '1e999', '1e3', '0x10', '1,2,3', 'abc', '12abc'])(
    'no lee «%s»',
    (texto) => {
      expect(leerTipeado(texto, 'monto', 'es-BO')).toEqual({
        ok: false,
        aviso: 'Escribe un número, por ejemplo 1234,5.',
      })
    },
  )

  it('el porcentaje se tipea en puntos y sale como fracción', () => {
    expect(leerTipeado('14,94', 'porcentaje', 'es-BO')).toEqual({ ok: true, valor: 0.1494 })
    expect(leerTipeado('13', 'porcentaje', 'es-BO')).toEqual({ ok: true, valor: 0.13 })
  })

  it('normaliza a 15 cifras (0,07 / 100 no deja ruido binario)', () => {
    const t = leerTipeado('7', 'porcentaje', 'es-BO')
    expect(t).toEqual({ ok: true, valor: 0.07 })
  })

  it('acepta negativos y cero', () => {
    expect(leerTipeado('-3,5', 'monto', 'es-BO')).toEqual({ ok: true, valor: -3.5 })
    expect(leerTipeado('0', 'monto', 'es-BO')).toEqual({ ok: true, valor: 0 })
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

describe('accionesDe', () => {
  const f = () => undefined
  const base = {
    id: 'fees',
    overridden: false,
    bloqueada: false,
    defaultValue: undefined,
    hasHelp: undefined,
    hasSettings: undefined,
    onHelp: undefined,
    onSettings: undefined,
  }

  it('sin nada no hay acciones', () => {
    expect(accionesDe(base)).toEqual({
      alAyudar: null,
      alAjustar: null,
      restablecer: null,
      hay: false,
    })
  })

  it('la ayuda y el ⚙ piden la bandera y el callback, y emiten el id de la celda', () => {
    const onHelp = vi.fn()
    const onSettings = vi.fn()
    expect(accionesDe({ ...base, hasHelp: true }).alAyudar).toBeNull()
    expect(accionesDe({ ...base, onHelp }).alAyudar).toBeNull()
    expect(accionesDe({ ...base, hasSettings: true }).alAjustar).toBeNull()
    const a = accionesDe({ ...base, hasHelp: true, onHelp, hasSettings: true, onSettings })
    a.alAyudar?.()
    a.alAjustar?.()
    expect(onHelp).toHaveBeenCalledExactlyOnceWith('fees')
    expect(onSettings).toHaveBeenCalledExactlyOnceWith('fees')
    expect(a.hay).toBe(true)
  })

  it('con el candado siguen la ayuda y el ⚙ y se va ↺', () => {
    const a = accionesDe({ ...base, overridden: true, bloqueada: true, hasHelp: true, onHelp: f })
    expect(a.alAyudar).not.toBeNull()
    expect(a.restablecer).toBeNull()
  })

  it('↺ dice a dónde vuelve, sin la cifra', () => {
    expect(accionesDe({ ...base, overridden: true }).restablecer).toBe('Volver al sugerido')
    expect(accionesDe({ ...base, overridden: true, defaultValue: 0.4 }).restablecer).toBe(
      'Volver al valor por defecto',
    )
    expect(accionesDe({ ...base, overridden: true, defaultValue: null }).restablecer).toBe(
      'Volver al valor por defecto',
    )
  })
})

describe('candadosDe y notasDe (4.13-3c)', () => {
  it('la celda entera está bloqueada sólo con todos sus lados; vacío es sin candado', () => {
    expect(candadosDe('Se calcula.', undefined, true).toda).toBeUndefined()
    expect(candadosDe('Se calcula.', 'Nivel.', true).toda).toBe('Se calcula.')
    expect(candadosDe('Se calcula.', undefined, false).toda).toBe('Se calcula.')
    expect(candadosDe('', '', true)).toEqual({
      candados: { principal: undefined, secundario: undefined },
      toda: undefined,
    })
    expect(candadosDe(undefined, 'Nivel.', false).candados.secundario).toBeUndefined()
  })

  it('una nota por texto distinto; cada lado nombra el aviso y su candado; la entrada, sólo el aviso', () => {
    const aviso = { texto: 'Error.', esError: true }
    const n = notasDe('x', aviso, { principal: 'A', secundario: undefined }, true)
    expect(n.notas.map((m) => m.nota.texto)).toEqual(['Error.', 'A'])
    expect(n.deLado).toEqual({ principal: 'xn xc1', secundario: 'xn' })
    expect(n.deLaEntrada).toBe('xn')
    const iguales = notasDe('x', undefined, { principal: 'A', secundario: 'A' }, true)
    expect(iguales.notas).toHaveLength(1)
    expect(iguales.deLado).toEqual({ principal: 'xc0', secundario: 'xc0' })
    expect(iguales.deLaEntrada).toBeUndefined()
    const distintos = notasDe('x', undefined, { principal: 'A', secundario: 'B' }, true)
    expect(distintos.deLado).toEqual({ principal: 'xc0', secundario: 'xc1' })
  })
})
