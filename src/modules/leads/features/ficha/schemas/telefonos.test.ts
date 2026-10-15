import { describe, expect, it } from 'vitest'
import {
  esquemaCambiarTelefono,
  esquemaGuardarTelefonoExtra,
  esquemaQuitarTelefonoExtra,
  esquemaVerificarTelefonoDeLead,
} from './telefonos'

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const OTRO = '9b2c7d1e-1f3a-4b6c-8d4e-2a5f6b7c8d90'
const VERSION = '2026-10-14T10:05:00.123456+00:00'

describe('esquemaCambiarTelefono', () => {
  it('acepta el número como se escribió, con la versión que tenía quien cambia', () => {
    const leido = esquemaCambiarTelefono.safeParse({
      id: ID,
      actualizadoEnEsperado: VERSION,
      codigoDePais: ' +591 ',
      telefono: '700 11 002',
    })
    expect(leido.success).toBe(true)
    if (leido.success) {
      expect(leido.data.codigoDePais).toBe('+591')
    }
  })

  it('el código de país puede faltar; la versión no', () => {
    expect(
      esquemaCambiarTelefono.safeParse({
        id: ID,
        actualizadoEnEsperado: VERSION,
        codigoDePais: null,
        telefono: '+54 9 11 5555 1234',
      }).success,
    ).toBe(true)
    expect(
      esquemaCambiarTelefono.safeParse({ id: ID, codigoDePais: null, telefono: '1' }).success,
    ).toBe(false)
    expect(
      esquemaCambiarTelefono.safeParse({
        id: ID,
        actualizadoEnEsperado: '',
        codigoDePais: null,
        telefono: '1',
      }).success,
    ).toBe(false)
  })

  it('un id que no es un id no pasa, y un número descomunal tampoco', () => {
    const base = { actualizadoEnEsperado: VERSION, codigoDePais: null }
    expect(esquemaCambiarTelefono.safeParse({ ...base, id: 'x', telefono: '7' }).success).toBe(
      false,
    )
    expect(
      esquemaCambiarTelefono.safeParse({ ...base, id: ID, telefono: '7'.repeat(61) }).success,
    ).toBe(false)
  })
})

describe('esquemaVerificarTelefonoDeLead', () => {
  it('lleva el lead, el código y lo escrito', () => {
    expect(
      esquemaVerificarTelefonoDeLead.safeParse({ id: ID, codigoDePais: '+591', telefono: '7001' })
        .success,
    ).toBe(true)
    expect(
      esquemaVerificarTelefonoDeLead.safeParse({ codigoDePais: '+591', telefono: '7001' }).success,
    ).toBe(false)
  })
})

describe('esquemaGuardarTelefonoExtra', () => {
  const base = { leadId: ID, id: OTRO, codigoDePais: '+591', telefono: '71234567' }

  it('la etiqueta es opcional y se recorta; el lugar sólo lo manda un «Deshacer»', () => {
    const leido = esquemaGuardarTelefonoExtra.safeParse({
      ...base,
      etiqueta: '  Casa ',
      creadoEn: null,
    })
    expect(leido.success && leido.data.etiqueta).toBe('Casa')
    expect(
      esquemaGuardarTelefonoExtra.safeParse({
        ...base,
        etiqueta: null,
        creadoEn: '2026-10-13T10:00:00.000Z',
      }).success,
    ).toBe(true)
  })

  it('una fecha que no es una fecha no pasa', () => {
    expect(
      esquemaGuardarTelefonoExtra.safeParse({ ...base, etiqueta: null, creadoEn: 'ayer' }).success,
    ).toBe(false)
  })

  it('el id del teléfono es obligatorio: sin él no hay idempotencia', () => {
    expect(
      esquemaGuardarTelefonoExtra.safeParse({
        leadId: ID,
        codigoDePais: null,
        telefono: '7',
        etiqueta: null,
        creadoEn: null,
      }).success,
    ).toBe(false)
  })
})

describe('esquemaQuitarTelefonoExtra', () => {
  it('lleva el lead y el teléfono', () => {
    expect(esquemaQuitarTelefonoExtra.safeParse({ leadId: ID, id: OTRO }).success).toBe(true)
    expect(esquemaQuitarTelefonoExtra.safeParse({ leadId: ID }).success).toBe(false)
  })
})
