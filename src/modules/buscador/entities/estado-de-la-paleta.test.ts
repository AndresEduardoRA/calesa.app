import { describe, expect, it } from 'vitest'
import { MENSAJE_SIN_CONEXION, MENSAJE_SIN_RESPUESTA, type ErrorApp } from '@/shared/lib/errores'
import { estadoDeError } from './estado-de-la-paleta'

const sinRespuesta: ErrorApp = { codigo: 'inesperado', mensaje: MENSAJE_SIN_RESPUESTA }
const sinConexion: ErrorApp = { codigo: 'inesperado', mensaje: MENSAJE_SIN_CONEXION }

describe('estadoDeError', () => {
  it('sin red es «sin conexión» aunque el mensaje sea otro', () => {
    expect(estadoDeError(sinRespuesta, false)).toEqual({
      tipo: 'sin_conexion',
      mensaje: MENSAJE_SIN_RESPUESTA,
    })
  })

  it('el mensaje de «sin conexión» también lo es con red', () => {
    expect(estadoDeError(sinConexion, true)).toEqual({
      tipo: 'sin_conexion',
      mensaje: MENSAJE_SIN_CONEXION,
    })
  })

  it('el resto es un error con su mensaje', () => {
    expect(estadoDeError(sinRespuesta, true)).toEqual({
      tipo: 'error',
      mensaje: MENSAJE_SIN_RESPUESTA,
    })
  })
})
