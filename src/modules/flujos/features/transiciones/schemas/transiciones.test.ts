import { describe, expect, it } from 'vitest'
import {
  esquemaCrearTransicion,
  esquemaEliminarTransicion,
  esquemaGuardarTransicion,
  esquemaPonerRolesDeFase,
  esquemaPonerRolesDeTransicion,
} from './transiciones'

const ID = '11111111-1111-4111-8111-111111111111'
const OTRO = '22222222-2222-4222-8222-222222222222'
const crear = {
  id: ID,
  ambito: 'vehiculos',
  flujoId: OTRO,
  actualizadoEnEsperado: '2026-11-11T10:00:00Z',
  deFaseId: ID,
  aFaseId: OTRO,
  accion: null,
  notaObligatoria: false,
}

describe('esquemas de transiciones', () => {
  it('crear exige ids guid, un ámbito conocido y la versión', () => {
    expect(esquemaCrearTransicion.safeParse(crear).success).toBe(true)
    expect(esquemaCrearTransicion.safeParse({ ...crear, id: 'no' }).success).toBe(false)
    expect(esquemaCrearTransicion.safeParse({ ...crear, aFaseId: 'x' }).success).toBe(false)
    expect(esquemaCrearTransicion.safeParse({ ...crear, ambito: 'otro' }).success).toBe(false)
    expect(esquemaCrearTransicion.safeParse({ ...crear, actualizadoEnEsperado: '' }).success).toBe(
      false,
    )
  })

  it('la acción es texto o nula; el largo exacto lo dice la base', () => {
    expect(esquemaCrearTransicion.safeParse({ ...crear, accion: 'Embarcar' }).success).toBe(true)
    expect(esquemaCrearTransicion.safeParse({ ...crear, accion: 'x'.repeat(161) }).success).toBe(
      false,
    )
    expect(esquemaCrearTransicion.safeParse({ ...crear, accion: 5 }).success).toBe(false)
  })

  it('eliminar exige id guid y versión', () => {
    const base = { id: ID, ambito: 'repuestos', actualizadoEnEsperado: 'v' }
    expect(esquemaEliminarTransicion.safeParse(base).success).toBe(true)
    expect(esquemaEliminarTransicion.safeParse({ ...base, id: 'no' }).success).toBe(false)
    expect(
      esquemaEliminarTransicion.safeParse({ ...base, actualizadoEnEsperado: '' }).success,
    ).toBe(false)
  })

  it('guardar rechaza una clave de más y los cambios vacíos', () => {
    const base = { id: ID, ambito: 'vehiculos', actualizadoEnEsperado: 'v' }
    const ok = { ...base, cambios: { accion: null } }
    expect(esquemaGuardarTransicion.safeParse(ok).success).toBe(true)
    expect(
      esquemaGuardarTransicion.safeParse({ ...base, cambios: { notaObligatoria: false } }).success,
    ).toBe(true)
    expect(esquemaGuardarTransicion.safeParse({ ...base, cambios: {} }).success).toBe(false)
    expect(
      esquemaGuardarTransicion.safeParse({ ...base, cambios: { accion: 'x', otra: 1 } }).success,
    ).toBe(false)
    expect(esquemaGuardarTransicion.safeParse({ ...ok, sobra: 1 }).success).toBe(false)
  })

  it('los roles rechazan un no-guid y más de 100, y aceptan la lista vacía', () => {
    const fase = { faseId: ID, ambito: 'vehiculos', actualizadoEnEsperado: 'v', roles: [] }
    expect(esquemaPonerRolesDeFase.safeParse(fase).success).toBe(true)
    expect(esquemaPonerRolesDeFase.safeParse({ ...fase, roles: [OTRO] }).success).toBe(true)
    expect(esquemaPonerRolesDeFase.safeParse({ ...fase, roles: ['x'] }).success).toBe(false)
    const muchos = Array.from({ length: 101 }, () => OTRO)
    expect(esquemaPonerRolesDeFase.safeParse({ ...fase, roles: muchos }).success).toBe(false)
    const salida = { id: ID, ambito: 'repuestos', actualizadoEnEsperado: 'v', roles: [OTRO] }
    expect(esquemaPonerRolesDeTransicion.safeParse(salida).success).toBe(true)
    expect(esquemaPonerRolesDeTransicion.safeParse({ ...salida, roles: null }).success).toBe(false)
  })
})
