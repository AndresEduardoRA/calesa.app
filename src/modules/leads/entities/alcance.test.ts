import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { alcanceDelListado } from './alcance'

const con = (alcance: 'propios' | 'todos'): Permisos => [
  { clave: 'leads.ver', origenId: null, alcance },
]

describe('alcanceDelListado', () => {
  it('por defecto es «míos», también con «todos»', () => {
    expect(alcanceDelListado(con('todos'), undefined)).toEqual({
      puedeVerTodos: true,
      modo: 'mios',
    })
    expect(alcanceDelListado(con('propios'), undefined)).toEqual({
      puedeVerTodos: false,
      modo: 'mios',
    })
  })

  it('«todos» sólo se da a quien tiene el alcance «todos» y lo pidió', () => {
    expect(alcanceDelListado(con('todos'), 'todos').modo).toBe('todos')
    expect(alcanceDelListado(con('propios'), 'todos').modo).toBe('mios')
  })

  it('un valor que no es «todos» no cuenta, ni sin el permiso', () => {
    expect(alcanceDelListado(con('todos'), 'cualquiera').modo).toBe('mios')
    expect(alcanceDelListado([], 'todos')).toEqual({ puedeVerTodos: false, modo: 'mios' })
  })
})
