import { describe, expect, it, vi } from 'vitest'
import {
  MOTIVO_DOMINANCIA_SIN_LEER,
  MOTIVO_PERSONA_NO_DOMINADA,
} from '../../../entities/dominancia'
import { MOTIVO_CUENTA_PROPIA, accionesSobre } from '../../../entities/persona'
import { lineasDeLaPersona } from './menu-persona'

const hacer = {
  verRoles: vi.fn(),
  cambiarBloqueo: vi.fn(),
  darDeBaja: vi.fn(),
  generarEnlace: vi.fn(),
}

const claves = (estado: Parameters<typeof accionesSobre>[0]['estado'], propia = false) =>
  lineasDeLaPersona(
    accionesSobre({ id: 'a', estado, dominada: true }, propia ? 'a' : 'b'),
    false,
    hacer,
  ).map((linea) => linea.clave)

describe('las líneas del «⋯» de una persona', () => {
  it('una persona activa: roles, bloquear y, aparte, dar de baja', () => {
    expect(claves('activa')).toEqual(['roles', 'bloqueo', 'separador-de-baja', 'baja'])
  })

  it('una invitación pendiente suma generar otro enlace, antes de bloquear', () => {
    expect(claves('invitacion_pendiente')).toEqual([
      'roles',
      'enlace',
      'bloqueo',
      'separador-de-baja',
      'baja',
    ])
  })

  it('una cuenta bloqueada se desbloquea', () => {
    const lineas = lineasDeLaPersona(
      accionesSobre({ id: 'a', estado: 'bloqueada', dominada: true }, 'b'),
      false,
      hacer,
    )
    expect(lineas.find((l) => l.clave === 'bloqueo')).toMatchObject({ etiqueta: 'Desbloquear' })
  })

  it('la cuenta propia no se bloquea ni se da de baja, y dice por qué', () => {
    const lineas = lineasDeLaPersona(
      accionesSobre({ id: 'a', estado: 'activa', dominada: true }, 'a'),
      false,
      hacer,
    )
    expect(lineas.map((l) => l.clave)).toEqual(['roles', 'cuenta-propia'])
    expect(lineas.at(-1)).toMatchObject({ tipo: 'nota', texto: MOTIVO_CUENTA_PROPIA })
  })

  it('una persona dada de baja no tiene ninguna línea', () => {
    expect(claves('baja')).toEqual([])
  })

  it('mientras algo está en curso, las acciones salen apagadas', () => {
    const lineas = lineasDeLaPersona(
      accionesSobre({ id: 'a', estado: 'activa', dominada: true }, 'b'),
      true,
      hacer,
    )
    const acciones = lineas.filter((l) => l.tipo === 'accion')
    expect(acciones.length).toBe(3)
    expect(acciones.every((l) => l.deshabilitada)).toBe(true)
  })

  it('elegir una línea hace lo suyo', () => {
    const lineas = lineasDeLaPersona(
      accionesSobre({ id: 'a', estado: 'activa', dominada: true }, 'b'),
      false,
      hacer,
    )
    for (const linea of lineas) {
      if (linea.tipo === 'accion') linea.alElegir()
    }
    expect(hacer.verRoles).toHaveBeenCalledTimes(1)
    expect(hacer.cambiarBloqueo).toHaveBeenCalledWith(true)
    expect(hacer.darDeBaja).toHaveBeenCalledTimes(1)
  })
})

describe('las líneas del «⋯» sobre quien no domino (9-1)', () => {
  it('a quien no domino: roles, bloquear y dar de baja apagados, y la nota con el motivo', () => {
    const lineas = lineasDeLaPersona(
      accionesSobre({ id: 'a', estado: 'activa', dominada: false }, 'b'),
      false,
      hacer,
    )
    expect(lineas.map((l) => l.clave)).toEqual([
      'roles',
      'bloqueo',
      'separador-de-baja',
      'baja',
      'no-dominada',
    ])
    const acciones = lineas.filter((l) => l.tipo === 'accion')
    expect(acciones.every((l) => l.deshabilitada)).toBe(true)
    expect(lineas.at(-1)).toMatchObject({
      tipo: 'nota',
      texto: MOTIVO_PERSONA_NO_DOMINADA.bloquear,
    })
  })

  it('a una pendiente que no domino se le puede generar otro enlace', () => {
    const lineas = lineasDeLaPersona(
      accionesSobre({ id: 'a', estado: 'invitacion_pendiente', dominada: false }, 'b'),
      false,
      hacer,
    )
    expect(lineas.find((l) => l.clave === 'enlace')).toMatchObject({ deshabilitada: false })
    expect(lineas.find((l) => l.clave === 'bloqueo')).toMatchObject({ deshabilitada: true })
  })

  it('si no se pudo saber, se apaga igual y lo dice', () => {
    const lineas = lineasDeLaPersona(
      accionesSobre({ id: 'a', estado: 'activa', dominada: null }, 'b'),
      false,
      hacer,
    )
    expect(lineas.filter((l) => l.tipo === 'accion').every((l) => l.deshabilitada)).toBe(true)
    expect(lineas.at(-1)).toMatchObject({ tipo: 'nota', texto: MOTIVO_DOMINANCIA_SIN_LEER })
  })

  it('a quien domino, sin nota y todo habilitado', () => {
    const lineas = lineasDeLaPersona(
      accionesSobre({ id: 'a', estado: 'activa', dominada: true }, 'b'),
      false,
      hacer,
    )
    expect(lineas.some((l) => l.tipo === 'nota')).toBe(false)
    expect(lineas.filter((l) => l.tipo === 'accion').some((l) => l.deshabilitada)).toBe(false)
  })
})
