import { describe, expect, it } from 'vitest'
import { modoInicial } from './cabecera-de-la-hoja'

const modo = (clave: string) => ({ clave, nombre: clave.toUpperCase() })

describe('modoInicial', () => {
  it('es el primero de los modos que declara el diseño (P1)', () => {
    expect(modoInicial({ modos: [modo('paralelo'), modo('unificado')] })).toBe('paralelo')
  })

  it('con uno solo, ese; sin modos, nulo', () => {
    expect(modoInicial({ modos: [modo('m1')] })).toBe('m1')
    expect(modoInicial({ modos: [] })).toBeNull()
  })
})
