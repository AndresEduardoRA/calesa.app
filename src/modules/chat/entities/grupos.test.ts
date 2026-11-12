import { describe, expect, it } from 'vitest'
import {
  esquemaDeGrupo,
  MAXIMO_DE_PERSONAS_ELEGIDAS,
  MOTIVO_DE_LOS_MIEMBROS,
  MOTIVO_DEL_NOMBRE,
  MOTIVO_DEL_TAMANO,
  validarGrupo,
} from './grupos'

const guid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const miembros = (cuantos: number) => Array.from({ length: cuantos }, (_, n) => guid(n + 1))
const grupo = (nombre: string, ids: string[]) => ({ id: guid(999), nombre, miembros: ids })

describe('esquemaDeGrupo', () => {
  it('acepta de 1 a 49 miembros y rechaza 0 y 50', () => {
    expect(esquemaDeGrupo.safeParse(grupo('Ventas', miembros(1))).success).toBe(true)
    expect(
      esquemaDeGrupo.safeParse(grupo('Ventas', miembros(MAXIMO_DE_PERSONAS_ELEGIDAS))).success,
    ).toBe(true)
    expect(esquemaDeGrupo.safeParse(grupo('Ventas', [])).success).toBe(false)
    expect(esquemaDeGrupo.safeParse(grupo('Ventas', miembros(50))).success).toBe(false)
  })

  it('el nombre lleva de 1 a 80 caracteres, sin contar los espacios de los bordes', () => {
    expect(esquemaDeGrupo.safeParse(grupo('', miembros(1))).success).toBe(false)
    expect(esquemaDeGrupo.safeParse(grupo('   ', miembros(1))).success).toBe(false)
    expect(esquemaDeGrupo.safeParse(grupo('a'.repeat(80), miembros(1))).success).toBe(true)
    expect(esquemaDeGrupo.safeParse(grupo('a'.repeat(81), miembros(1))).success).toBe(false)
  })

  it('rechaza miembros repetidos o que no son GUID', () => {
    expect(esquemaDeGrupo.safeParse(grupo('Ventas', [guid(1), guid(1)])).success).toBe(false)
    expect(esquemaDeGrupo.safeParse(grupo('Ventas', ['no-es-guid'])).success).toBe(false)
  })
})

describe('validarGrupo', () => {
  it('devuelve nulo si todo pasa', () => {
    expect(validarGrupo({ nombre: 'Ventas', miembros: miembros(2) })).toBeNull()
  })

  it('dice el motivo de cada campo con la clave del hint de la base', () => {
    expect(validarGrupo({ nombre: '  ', miembros: [] })).toEqual({
      nombre: MOTIVO_DEL_NOMBRE,
      miembros: MOTIVO_DE_LOS_MIEMBROS,
    })
    expect(validarGrupo({ nombre: 'a'.repeat(81), miembros: miembros(1) })).toEqual({
      nombre: MOTIVO_DEL_NOMBRE,
    })
    expect(validarGrupo({ nombre: 'Ventas', miembros: miembros(50) })).toEqual({
      miembros: MOTIVO_DEL_TAMANO,
    })
  })
})
