import { describe, expect, it } from 'vitest'
import { MOTIVO_DOMINANCIA_SIN_LEER, MOTIVO_PERSONA_NO_DOMINADA } from './dominancia'
import { MOTIVO_CUENTA_PROPIA, accionesSobre, motivoSobrePersona } from './persona'

const YO = 'yo'

describe('accionesSobre', () => {
  it('sobre una persona activa que domino: roles, bloquear y dar de baja, sin motivo', () => {
    expect(accionesSobre({ id: 'otra', estado: 'activa', dominada: true }, YO)).toEqual({
      roles: true,
      bloqueo: 'bloquear',
      baja: true,
      enlace: false,
      esPropia: false,
      motivoApagado: null,
    })
  })

  it('a una bloqueada se la desbloquea; a una pendiente se le puede generar otro enlace', () => {
    expect(accionesSobre({ id: 'otra', estado: 'bloqueada', dominada: true }, YO).bloqueo).toBe(
      'desbloquear',
    )
    expect(
      accionesSobre({ id: 'otra', estado: 'invitacion_pendiente', dominada: true }, YO).enlace,
    ).toBe(true)
  })

  it('sobre la cuenta propia no se bloquea ni se da de baja', () => {
    expect(accionesSobre({ id: YO, estado: 'activa', dominada: true }, YO)).toEqual({
      roles: true,
      bloqueo: null,
      baja: false,
      enlace: false,
      esPropia: true,
      motivoApagado: null,
    })
  })

  it('sobre una dada de baja no queda nada por hacer', () => {
    expect(accionesSobre({ id: 'otra', estado: 'baja', dominada: false }, YO)).toEqual({
      roles: false,
      bloqueo: null,
      baja: false,
      enlace: false,
      esPropia: false,
      motivoApagado: null,
    })
  })

  it('a quien no domino: las acciones se muestran y salen apagadas con su motivo', () => {
    expect(accionesSobre({ id: 'otra', estado: 'activa', dominada: false }, YO)).toEqual({
      roles: true,
      bloqueo: 'bloquear',
      baja: true,
      enlace: false,
      esPropia: false,
      motivoApagado: MOTIVO_PERSONA_NO_DOMINADA.bloquear,
    })
    expect(
      accionesSobre({ id: 'otra', estado: 'bloqueada', dominada: false }, YO).motivoApagado,
    ).toBe(MOTIVO_PERSONA_NO_DOMINADA.desbloquear)
  })

  it('si no se pudo saber si la domino, también se apaga', () => {
    expect(accionesSobre({ id: 'otra', estado: 'activa', dominada: null }, YO).motivoApagado).toBe(
      MOTIVO_DOMINANCIA_SIN_LEER,
    )
  })
})

describe('motivoSobrePersona', () => {
  it('la cuenta propia gana: quien llama se domina a sí mismo', () => {
    expect(motivoSobrePersona({ id: YO, estado: 'activa', dominada: null }, YO)).toBeNull()
    expect(motivoSobrePersona({ id: YO, estado: 'activa', dominada: false }, YO)).toBeNull()
  })

  it('no mira el estado: una dada de baja que no domino (el panel abierto a mano) tiene motivo', () => {
    expect(motivoSobrePersona({ id: 'otra', estado: 'baja', dominada: null }, YO)).toBe(
      MOTIVO_DOMINANCIA_SIN_LEER,
    )
    expect(motivoSobrePersona({ id: 'otra', estado: 'baja', dominada: false }, YO)).not.toBeNull()
    expect(motivoSobrePersona({ id: 'otra', estado: 'baja', dominada: true }, YO)).toBeNull()
  })

  it('los textos dicen qué no se puede y por qué', () => {
    expect(MOTIVO_PERSONA_NO_DOMINADA.bloquear).toBe(
      'Tiene permisos que tú no tienes: no puedes cambiar sus roles, bloquearla ni darla de baja.',
    )
    expect(MOTIVO_PERSONA_NO_DOMINADA.desbloquear).toBe(
      'Tiene permisos que tú no tienes: no puedes cambiar sus roles, desbloquearla ni darla de baja.',
    )
    expect(MOTIVO_CUENTA_PROPIA).not.toBe(MOTIVO_DOMINANCIA_SIN_LEER)
  })
})
