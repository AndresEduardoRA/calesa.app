import { describe, expect, it } from 'vitest'

import {
  CAMPOS_DE_CONFIGURACION as C,
  decimalCanonico,
  fraccionDesdePorcentaje,
  leerDecimal,
  paraEditar,
  porcentajeDesdeFraccion,
  validarCaja,
  validarFormula,
  validarTramo,
  type CampoDecimal,
} from './configuracion'

const BO = 'es-BO'
const leerBO = (texto: string, campo: CampoDecimal) => leerDecimal(texto, campo, BO)

describe('el recargo: se tipea en % y se guarda como fracción con el mismo entero', () => {
  it.each([
    ['10', '0.1000'],
    ['7,5', '0.0750'],
    ['0', '0.0000'],
    ['999999,99', '9999.9999'],
  ])('%s %% → %s', (tipeado, fraccion) => {
    const leido = validarFormula({ factor: '1,35', recargo: tipeado, redondeo: '1' }, leerBO)
    expect(leido.ok && fraccionDesdePorcentaje(leido.datos.recargoLocal)).toBe(fraccion)
  })

  it('con más de dos decimales en % no se acepta', () => {
    expect(validarFormula({ factor: '1', recargo: '12,345', redondeo: '1' }, leerBO)).toEqual({
      ok: false,
      errores: { recargo: 'Escribe un número cero o mayor, con hasta 2 decimales.' },
    })
  })

  it('la vuelta usa el decimal del locale y es exacta', () => {
    expect(porcentajeDesdeFraccion('0.0750', BO)).toBe('7,50')
    expect(porcentajeDesdeFraccion('9999.9999', BO)).toBe('999999,99')
    expect(porcentajeDesdeFraccion('0.0750', 'en-US')).toBe('7.50')
  })
})

describe('leerDecimal: el lector de números tipeados con el locale, sin float', () => {
  it('en es-BO la coma es el decimal y el punto agrupa de a 3', () => {
    expect(leerBO('1,35', C.factor)).toEqual({ ok: true, valor: '1.3500' })
    expect(leerBO('2.000', C.redondeo)).toEqual({ ok: true, valor: '2000.00' })
    expect(leerBO('15.000,5', C.montoDeTramo)).toEqual({ ok: true, valor: '15000.50' })
    expect(leerBO(' 3 ', C.montoDeCaja)).toEqual({ ok: true, valor: '3.00' })
  })

  it('«1.5» en es-BO es un aviso del separador, no 1,5', () => {
    expect(leerBO('1.5', C.factor)).toEqual({
      ok: false,
      error: 'Usa coma para los decimales: 1,5.',
    })
  })

  it('en en-US los separadores se invierten', () => {
    expect(leerDecimal('1,234.5', C.montoDeTramo, 'en-US')).toEqual({ ok: true, valor: '1234.50' })
  })

  it.each(['1e3', '-1', '', 'abc'])('«%s» no se acepta', (texto) => {
    expect(leerBO(texto, C.montoDeTramo).ok).toBe(false)
  })

  it('el factor tiene que ser mayor que cero; el recargo puede ser cero', () => {
    expect(leerBO('0', C.factor)).toEqual({
      ok: false,
      error: 'Escribe un número mayor que cero, con hasta 4 decimales.',
    })
    expect(leerBO('0', C.recargo)).toEqual({ ok: true, valor: '0.00' })
  })

  it('más decimales que la escala o más que el tope no se aceptan', () => {
    expect(leerBO('1,23456', C.factor).ok).toBe(false)
    expect(leerBO('1000000', C.factor)).toEqual({
      ok: false,
      error: 'Ese valor es demasiado grande.',
    })
  })

  it('decimalCanonico sólo lee el texto que manda el formulario', () => {
    expect(decimalCanonico('1.3500', C.factor)).toEqual({ ok: true, valor: '1.3500' })
    expect(decimalCanonico('1,35', C.factor).ok).toBe(false)
    expect(decimalCanonico('2.000', C.redondeo)).toEqual({ ok: true, valor: '2.00' })
  })

  it('paraEditar pone el decimal del locale sin pasar por number', () => {
    expect(paraEditar('9999999999.99', BO)).toBe('9999999999,99')
    expect(paraEditar('1.3500', 'en-US')).toBe('1.3500')
  })
})

describe('tramos y cajas', () => {
  it('«hasta» vacío es un tramo abierto', () => {
    expect(validarTramo({ costoMin: '2.000', costoMax: ' ', monto: '0' }, leerBO)).toEqual({
      ok: true,
      datos: { costoMin: '2000.00', costoMax: null, monto: '0.00' },
    })
  })

  it('«hasta» igual a «desde» va al campo «hasta»', () => {
    expect(validarTramo({ costoMin: '100', costoMax: '100,00', monto: '5' }, leerBO)).toEqual({
      ok: false,
      errores: { costoMax: 'El "hasta" tiene que ser mayor que el "desde".' },
    })
  })

  it('el tope de pantalla se compara como entero, sin Number', () => {
    expect(
      validarTramo({ costoMin: '0', costoMax: '999999999999,99', monto: '1' }, leerBO).ok,
    ).toBe(true)
    expect(validarTramo({ costoMin: '0', costoMax: '1000000000000', monto: '1' }, leerBO)).toEqual({
      ok: false,
      errores: { costoMax: 'Ese valor es demasiado grande.' },
    })
  })

  it('una caja de 0 no vale', () => {
    expect(validarCaja({ monto: '0' }, leerBO)).toEqual({
      ok: false,
      errores: { monto: 'Escribe un número mayor que cero, con hasta 2 decimales.' },
    })
  })
})
