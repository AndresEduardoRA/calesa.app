import { describe, expect, it } from 'vitest'
import { esquemaCrearCategoria, esquemaGuardarCategoria } from './categorias'

const ID = '00000000-0000-0000-0000-00000000000a'

describe('esquemaCrearCategoria', () => {
  it('acepta una de primer nivel y limpia los espacios', () => {
    const r = esquemaCrearCategoria.parse({ origenId: ID, nombre: '  SUV  ', padreId: null })
    expect(r.nombre).toBe('SUV')
  })

  it('pide un nombre', () => {
    expect(
      esquemaCrearCategoria.safeParse({ origenId: ID, nombre: ' ', padreId: null }).success,
    ).toBe(false)
  })

  it('el padre, si viene, es un id', () => {
    expect(
      esquemaCrearCategoria.safeParse({ origenId: ID, nombre: 'SUV', padreId: 'x' }).success,
    ).toBe(false)
  })
})

describe('esquemaGuardarCategoria', () => {
  it('pide la versión que tenía en pantalla', () => {
    expect(esquemaGuardarCategoria.safeParse({ id: ID, nombre: 'SUV' }).success).toBe(false)
    expect(
      esquemaGuardarCategoria.safeParse({ id: ID, actualizadoEnEsperado: 'v', nombre: 'SUV' })
        .success,
    ).toBe(true)
  })
})
