import { describe, expect, it } from 'vitest'
import { SIN_SELECCION, alternar, alternarTodas, vigente } from './seleccion'

describe('la selección del listado', () => {
  it('alternar elige y quita', () => {
    const una = alternar(SIN_SELECCION, 'a')
    expect([...una]).toEqual(['a'])
    expect([...alternar(una, 'b')]).toEqual(['a', 'b'])
    expect([...alternar(una, 'a')]).toEqual([])
  })

  it('alternar todas: las elige, y si ya estaban, las suelta', () => {
    const todas = alternarTodas(alternar(SIN_SELECCION, 'a'), ['a', 'b', 'c'])
    expect([...todas]).toEqual(['a', 'b', 'c'])
    expect([...alternarTodas(todas, ['a', 'b', 'c'])]).toEqual([])
  })

  it('lo que ya no está en la página deja de estar elegido', () => {
    const elegidas = alternar(alternar(SIN_SELECCION, 'a'), 'z')
    expect([...vigente(elegidas, ['a', 'b'])]).toEqual(['a'])
  })
})
