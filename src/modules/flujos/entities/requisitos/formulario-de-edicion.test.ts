import { describe, expect, it } from 'vitest'
import type { RequisitoParaConfigurar } from '../flujo'
import { borradorDeEdicion, validarEdicion } from './formulario-de-edicion'
import type { TipoParaRequisito } from './opciones'

const LOCALE = 'es-BO'
const requisito = (parcial: Partial<RequisitoParaConfigurar>): RequisitoParaConfigurar => ({
  id: 'r1',
  faseId: 'f1',
  tipo: 'documento',
  bloqueante: false,
  orden: 10,
  claveDato: null,
  config: {},
  esperaAmbito: null,
  esperaFaseId: null,
  formatos: null,
  maxArchivos: null,
  minArchivos: null,
  notas: null,
  tipoDocumentoId: 't1',
  ...parcial,
})
const tipo: TipoParaRequisito = {
  id: 't1',
  nombre: 'Título',
  formatos: ['application/pdf', 'image/jpeg'],
  activo: true,
  delFlujo: false,
}

describe('validarEdicion', () => {
  it('sin tocar nada, no hay cambios', () => {
    const r = requisito({
      minArchivos: 1,
      maxArchivos: 3,
      formatos: ['application/pdf'],
      notas: 'x',
    })
    expect(validarEdicion(r, borradorDeEdicion(r), tipo, LOCALE)).toEqual({ tipo: 'sin_cambios' })
  })

  it('manda sólo lo que cambió', () => {
    const r = requisito({ minArchivos: 1, maxArchivos: 3 })
    const b = { ...borradorDeEdicion(r), maximo: '2' }
    expect(validarEdicion(r, b, tipo, LOCALE)).toEqual({
      tipo: 'cambios',
      cambios: { max_archivos: 2 },
    })
  })

  it('vaciar manda null: mínimo, máximo, notas y formatos', () => {
    const r = requisito({
      minArchivos: 1,
      maxArchivos: 3,
      formatos: ['application/pdf'],
      notas: 'algo',
    })
    const vacio = { porcentaje: '', minimo: '', maximo: '', formatos: [], notas: '  ' }
    expect(validarEdicion(r, vacio, tipo, LOCALE)).toEqual({
      tipo: 'cambios',
      cambios: { min_archivos: null, max_archivos: null, formatos: null, notas: null },
    })
  })

  it('un máximo menor que el mínimo o un formato ajeno al tipo son errores', () => {
    const r = requisito({ minArchivos: 2 })
    expect(validarEdicion(r, { ...borradorDeEdicion(r), maximo: '1' }, tipo, LOCALE)).toMatchObject(
      {
        tipo: 'errores',
        errores: { max_archivos: expect.any(String) as string },
      },
    )
    expect(
      validarEdicion(r, { ...borradorDeEdicion(r), formatos: ['image/png'] }, tipo, LOCALE),
    ).toMatchObject({ tipo: 'errores', errores: { formatos: expect.any(String) as string } })
  })

  it('sin el tipo leído, los formatos no se mandan', () => {
    const r = requisito({ formatos: ['application/pdf'] })
    const b = { ...borradorDeEdicion(r), formatos: [], maximo: '4' }
    expect(validarEdicion(r, b, null, LOCALE)).toEqual({
      tipo: 'cambios',
      cambios: { max_archivos: 4 },
    })
  })

  it('el porcentaje sólo se edita en pagos.umbral_pct, de 1 a 100', () => {
    const r = requisito({ tipo: 'dato', claveDato: 'pagos.umbral_pct', config: { pct: 50 } })
    expect(validarEdicion(r, { ...borradorDeEdicion(r), porcentaje: '60' }, null, LOCALE)).toEqual({
      tipo: 'cambios',
      cambios: { config: { pct: 60 } },
    })
    expect(
      validarEdicion(r, { ...borradorDeEdicion(r), porcentaje: '101' }, null, LOCALE),
    ).toMatchObject({
      tipo: 'errores',
      errores: { config: expect.any(String) as string },
    })
    // Otro dato: el porcentaje del borrador se ignora.
    const vin = requisito({ tipo: 'dato', claveDato: 'vehiculo.vin' })
    expect(
      validarEdicion(vin, { ...borradorDeEdicion(vin), porcentaje: '999' }, null, LOCALE),
    ).toEqual({
      tipo: 'sin_cambios',
    })
  })

  it('una espera sólo edita las notas', () => {
    const r = requisito({ tipo: 'espera', tipoDocumentoId: null, esperaAmbito: 'hijos' })
    expect(
      validarEdicion(r, { ...borradorDeEdicion(r), notas: 'ojo', maximo: '9' }, null, LOCALE),
    ).toEqual({
      tipo: 'cambios',
      cambios: { notas: 'ojo' },
    })
  })
})
