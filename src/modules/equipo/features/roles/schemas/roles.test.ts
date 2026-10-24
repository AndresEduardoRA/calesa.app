import { describe, expect, it } from 'vitest'
import { esquemaCrearRol, esquemaOtorgar, esquemaRevocar } from './roles'

const ROL = '00000000-0000-0000-0000-0000000000aa'
const VERSION = '2026-10-11T15:00:00.123456+00:00'

describe('esquemaCrearRol', () => {
  it('acepta un nombre con letras y un color de la lista', () => {
    expect(esquemaCrearRol.parse({ nombre: '  Ventas  ', color: '#027a48' })).toEqual({
      nombre: 'Ventas',
      color: '#027a48',
    })
  })

  it('rechaza un nombre del que no sale una clave', () => {
    expect(esquemaCrearRol.safeParse({ nombre: '123', color: '#027a48' }).success).toBe(false)
    expect(esquemaCrearRol.safeParse({ nombre: 'x', color: '#027a48' }).success).toBe(false)
  })

  it('rechaza un color que no está en la lista', () => {
    expect(esquemaCrearRol.safeParse({ nombre: 'Ventas', color: '#000000' }).success).toBe(false)
  })
})

describe('esquemaOtorgar y esquemaRevocar', () => {
  const base = {
    rolId: ROL,
    actualizadoEnEsperado: VERSION,
    clave: 'vehiculos.ver',
    origenId: null,
  }

  it('exigen la versión del rol', () => {
    expect(esquemaOtorgar.safeParse({ ...base, alcance: 'todos' }).success).toBe(true)
    expect(
      esquemaOtorgar.safeParse({ ...base, alcance: 'todos', actualizadoEnEsperado: '' }).success,
    ).toBe(false)
    expect(esquemaRevocar.safeParse({ ...base, actualizadoEnEsperado: undefined }).success).toBe(
      false,
    )
  })

  it('sólo aceptan permisos del catálogo', () => {
    expect(
      esquemaOtorgar.safeParse({ ...base, alcance: 'todos', clave: 'permiso.inventado' }).success,
    ).toBe(false)
    expect(esquemaRevocar.safeParse({ ...base, clave: 'permiso.inventado' }).success).toBe(false)
  })

  it('también aceptan el permiso de un nivel de acceso, pero no uno mal formado ni el de «todos»', () => {
    for (const clave of ['cotizaciones.nivel.costos.ver', 'cotizaciones.nivel.gerencia.editar']) {
      expect(esquemaOtorgar.safeParse({ ...base, alcance: 'todos', clave }).success).toBe(true)
      expect(esquemaRevocar.safeParse({ ...base, clave }).success).toBe(true)
    }
    for (const clave of [
      'cotizaciones.nivel.todos.ver',
      'cotizaciones.nivel.costos.borrar',
      'cotizaciones.nivel.Costos.ver',
    ]) {
      expect(esquemaOtorgar.safeParse({ ...base, alcance: 'todos', clave }).success).toBe(false)
      expect(esquemaRevocar.safeParse({ ...base, clave }).success).toBe(false)
    }
  })

  it('el origen es un id o nada (todos los orígenes)', () => {
    expect(esquemaOtorgar.safeParse({ ...base, alcance: 'propios', origenId: ROL }).success).toBe(
      true,
    )
    expect(
      esquemaOtorgar.safeParse({ ...base, alcance: 'propios', origenId: 'oficina' }).success,
    ).toBe(false)
  })
})
