import { describe, expect, it } from 'vitest'
import { origenesDesde } from './origen'

describe('origenesDesde', () => {
  it('se queda con lo que hace falta para nombrar y elegir un origen', () => {
    const filas = [
      {
        id: '00000000-0000-0000-0000-00000000000a',
        nombre: 'Oficina',
        color: '#027a48',
        tipo: 'manual',
      },
    ]
    expect(origenesDesde(filas)).toEqual([
      { id: '00000000-0000-0000-0000-00000000000a', nombre: 'Oficina', color: '#027a48' },
    ])
  })

  it('sin orígenes devuelve una lista vacía', () => {
    expect(origenesDesde([])).toEqual([])
  })

  it('una fila sin nombre es un error, no un origen sin nombre', () => {
    expect(() => origenesDesde([{ id: '00000000-0000-0000-0000-00000000000a' }])).toThrow()
  })
})
