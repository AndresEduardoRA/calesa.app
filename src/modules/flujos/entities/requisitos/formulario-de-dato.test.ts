import { describe, expect, it } from 'vitest'
import { validarDato, type BorradorDeDato } from './formulario-de-dato'

const LOCALE = 'es-BO'
const borrador = (parcial: Partial<BorradorDeDato>): BorradorDeDato => ({
  clave: 'vehiculo.vin',
  porcentaje: '',
  notas: '',
  ...parcial,
})

describe('validarDato', () => {
  it('una clave del ámbito sin notas ni porcentaje pasa', () => {
    expect(validarDato(borrador({}), 'vehiculos', LOCALE)).toEqual({
      ok: true,
      datos: { clave_dato: 'vehiculo.vin' },
    })
  })

  it('pide la clave y rechaza la que no es del ámbito', () => {
    expect(validarDato(borrador({ clave: '' }), 'vehiculos', LOCALE)).toMatchObject({
      ok: false,
      errores: { clave_dato: expect.any(String) as string },
    })
    // `vehiculo.vin` no es una clave de repuestos.
    expect(validarDato(borrador({}), 'repuestos', LOCALE)).toMatchObject({
      ok: false,
      errores: { clave_dato: expect.any(String) as string },
    })
  })

  it('el porcentaje sólo se pide con pagos.umbral_pct, de 1 a 100', () => {
    const pagos = { clave: 'pagos.umbral_pct' }
    expect(validarDato(borrador({ ...pagos, porcentaje: '50' }), 'vehiculos', LOCALE)).toEqual({
      ok: true,
      datos: { clave_dato: 'pagos.umbral_pct', config: { pct: 50 } },
    })
    for (const malo of ['', '0', '101', '-5', 'abc']) {
      expect(
        validarDato(borrador({ ...pagos, porcentaje: malo }), 'vehiculos', LOCALE),
      ).toMatchObject({
        ok: false,
        errores: { config: expect.any(String) as string },
      })
    }
    // Con otra clave, lo escrito en «Porcentaje» no viaja.
    expect(validarDato(borrador({ porcentaje: '50' }), 'vehiculos', LOCALE)).toEqual({
      ok: true,
      datos: { clave_dato: 'vehiculo.vin' },
    })
  })

  it('las notas se recortan, y más de 500 caracteres se rechazan', () => {
    expect(validarDato(borrador({ notas: '  Con firma  ' }), 'vehiculos', LOCALE)).toEqual({
      ok: true,
      datos: { clave_dato: 'vehiculo.vin', notas: 'Con firma' },
    })
    expect(validarDato(borrador({ notas: 'a'.repeat(501) }), 'vehiculos', LOCALE)).toMatchObject({
      ok: false,
      errores: { notas: expect.any(String) as string },
    })
    expect(validarDato(borrador({ notas: 'a'.repeat(500) }), 'vehiculos', LOCALE).ok).toBe(true)
  })
})
