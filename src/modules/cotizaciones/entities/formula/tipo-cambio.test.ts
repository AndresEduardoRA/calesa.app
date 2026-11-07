import { describe, expect, it } from 'vitest'
import { avisoDeNumero } from '@/shared/lib/numero-tipeado'
import { MENSAJE_DEL_VALOR_VACIO } from './ajuste'
import {
  MENSAJE_DEL_MISMO_TIPO_CAMBIO,
  MENSAJE_DEL_TIPO_CAMBIO_GRANDE,
  MENSAJE_DEL_TIPO_CAMBIO_INVALIDO,
  textoInicialDeTipoCambio,
  tipoCambioTipeado,
} from './tipo-cambio'

const LOCALE = 'es-BO'
const ACTUAL = 6.96

describe('tipoCambioTipeado', () => {
  it('lee el valor con el decimal del locale de la empresa', () => {
    expect(tipoCambioTipeado('6,97', LOCALE, ACTUAL)).toEqual({ ok: true, valor: 6.97 })
    expect(tipoCambioTipeado(' 12.405 ', LOCALE, ACTUAL)).toEqual({ ok: true, valor: 12405 })
    expect(tipoCambioTipeado('0,000145', LOCALE, ACTUAL)).toEqual({ ok: true, valor: 0.000145 })
  })

  it('un separador que no es del locale dice su aviso', () => {
    expect(tipoCambioTipeado('6.97', LOCALE, ACTUAL)).toEqual({
      ok: false,
      aviso: avisoDeNumero('6.97', 'separador', LOCALE),
    })
  })

  it('vacío pide el valor nuevo', () => {
    expect(tipoCambioTipeado('', LOCALE, ACTUAL)).toEqual({
      ok: false,
      aviso: MENSAJE_DEL_VALOR_VACIO,
    })
    expect(tipoCambioTipeado('   ', LOCALE, ACTUAL)).toEqual({
      ok: false,
      aviso: MENSAJE_DEL_VALOR_VACIO,
    })
  })

  it.each(['abc', '1e12', '0', '0,0', '-1', '1,1234567'])(
    '«%s» no es un tipo de cambio',
    (texto) => {
      expect(tipoCambioTipeado(texto, LOCALE, ACTUAL)).toEqual({
        ok: false,
        aviso: MENSAJE_DEL_TIPO_CAMBIO_INVALIDO,
      })
    },
  )

  it('acepta hasta 6 decimales', () => {
    expect(tipoCambioTipeado('1,123456', LOCALE, ACTUAL)).toEqual({ ok: true, valor: 1.123456 })
  })

  it('un billón o más es demasiado grande', () => {
    expect(tipoCambioTipeado('1.000.000.000.000', LOCALE, ACTUAL)).toEqual({
      ok: false,
      aviso: MENSAJE_DEL_TIPO_CAMBIO_GRANDE,
    })
    expect(tipoCambioTipeado('999.999.999.999,99', LOCALE, ACTUAL)).toEqual({
      ok: true,
      valor: 999999999999.99,
    })
  })

  it('igual al valor de hoy no se pide', () => {
    expect(tipoCambioTipeado('6,96', LOCALE, ACTUAL)).toEqual({
      ok: false,
      aviso: MENSAJE_DEL_MISMO_TIPO_CAMBIO,
    })
    expect(tipoCambioTipeado('6,960000', LOCALE, ACTUAL)).toEqual({
      ok: false,
      aviso: MENSAJE_DEL_MISMO_TIPO_CAMBIO,
    })
  })

  it('los textos son los de Empresa › Monedas', () => {
    expect(MENSAJE_DEL_TIPO_CAMBIO_INVALIDO).toBe(
      'Escribe un valor mayor que cero, con hasta 6 decimales.',
    )
    expect(MENSAJE_DEL_TIPO_CAMBIO_GRANDE).toBe('Ese valor es demasiado grande.')
    expect(MENSAJE_DEL_MISMO_TIPO_CAMBIO).toBe('El tipo de cambio ya tiene ese valor.')
  })
})

describe('textoInicialDeTipoCambio', () => {
  it('abre con toda su precisión y el decimal del locale', () => {
    expect(textoInicialDeTipoCambio(6.96, LOCALE)).toBe('6,96')
    expect(textoInicialDeTipoCambio(0.000145, LOCALE)).toBe('0,000145')
    expect(textoInicialDeTipoCambio(12405.5, LOCALE)).toBe('12405,5')
  })
})
