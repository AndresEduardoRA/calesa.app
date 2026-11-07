import { describe, expect, it } from 'vitest'
import { envioDesde, errorDeEnvio, resumenDeEnvio, type ResultadoDeEnvio } from './resultados'

const LOTE = '99999999-9999-4999-8999-999999999999'
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const VERSION = '2026-11-07T12:00:00.000001+00:00'

const respuesta = (enviados: unknown[], rechazados: unknown[] = []) => ({
  lote: enviados.length > 0 ? LOTE : null,
  actualizado_en: enviados.length > 0 ? VERSION : null,
  enviados,
  rechazados,
})

const rechazo = (codigo: string, motivo = 'Motivo.') => ({ id: A, titulo: 'A', codigo, motivo })

const envio = (rechazados: ResultadoDeEnvio['rechazados']): ResultadoDeEnvio => ({
  lote: null,
  actualizadoEn: null,
  enviados: [],
  rechazados,
})

describe('envioDesde', () => {
  it('lee lo que responde la base', () => {
    expect(envioDesde(respuesta([{ id: A, numero: 7, titulo: 'Hilux' }]))).toEqual({
      lote: LOTE,
      actualizadoEn: VERSION,
      enviados: [{ id: A, numero: 7, titulo: 'Hilux' }],
      rechazados: [],
    })
  })

  it('una enviada sin título lleva «Cotización #n», como al restaurar', () => {
    const leido = envioDesde(respuesta([{ id: A, numero: 7, titulo: null }]))
    expect(leido?.enviados).toEqual([{ id: A, numero: 7, titulo: 'Cotización #7' }])
  })

  it('sin enviadas, el lote y la versión son nulos, y un rechazo puede no traer título', () => {
    const leido = envioDesde(
      respuesta([], [{ id: B, titulo: null, codigo: '42501', motivo: 'Sin permiso.' }]),
    )
    expect(leido).toEqual({
      lote: null,
      actualizadoEn: null,
      enviados: [],
      rechazados: [{ id: B, titulo: null, codigo: '42501', motivo: 'Sin permiso.' }],
    })
  })

  it('una forma rota es null', () => {
    const { rechazados: _, ...sinRechazados } = respuesta([{ id: A, numero: 1, titulo: 'X' }])
    expect(envioDesde(sinRechazados)).toBeNull()
    expect(envioDesde(null)).toBeNull()
    expect(envioDesde({ ...respuesta([]), lote: 'x' })).toBeNull()
  })
})

describe('resumenDeEnvio', () => {
  it('una, por su título', () => {
    const leido = envioDesde(respuesta([{ id: A, numero: 7, titulo: 'Hilux' }]))
    expect(leido && resumenDeEnvio(leido)).toBe('«Hilux» se envió a la papelera.')
  })

  it('una sin título, por su número', () => {
    const leido = envioDesde(respuesta([{ id: A, numero: 7, titulo: null }]))
    expect(leido && resumenDeEnvio(leido)).toBe('«Cotización #7» se envió a la papelera.')
  })

  it('varias, cuántas', () => {
    const leido = envioDesde(
      respuesta([
        { id: A, numero: 1, titulo: 'X' },
        { id: B, numero: 2, titulo: 'Y' },
      ]),
    )
    expect(leido && resumenDeEnvio(leido)).toBe('Se enviaron 2 a la papelera.')
  })
})

describe('errorDeEnvio', () => {
  it('una que otra persona cambió es un conflicto, con el motivo de la base', () => {
    expect(errorDeEnvio(envio([rechazo('PT409', 'Ana la cambió hace un momento.')]))).toEqual({
      codigo: 'conflicto',
      mensaje: 'Ana la cambió hace un momento.',
    })
  })

  it('sin permiso es sin_permiso; lo demás, una regla', () => {
    expect(errorDeEnvio(envio([rechazo('42501')])).codigo).toBe('sin_permiso')
    expect(errorDeEnvio(envio([rechazo('P0001')]))).toEqual({ codigo: 'regla', mensaje: 'Motivo.' })
    expect(errorDeEnvio(envio([rechazo('23514')])).codigo).toBe('regla')
  })

  it('sin ningún rechazo dice que no se pudo', () => {
    expect(errorDeEnvio(envio([]))).toEqual({ codigo: 'regla', mensaje: 'No se pudo enviar.' })
  })
})
