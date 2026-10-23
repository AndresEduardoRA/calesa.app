import { describe, expect, it } from 'vitest'
import { buscar, esta, mapaDe, propia, recorrer } from './medidor'

describe('medidor', () => {
  it('recorrer suma una visita por elemento y da los mismos elementos', () => {
    const m = { visitas: 0 }
    expect([...recorrer(['a', 'b', 'c'], m)]).toEqual(['a', 'b', 'c'])
    expect(m.visitas).toBe(3)
  })

  it('buscar y esta suman una visita por consulta, haya o no', () => {
    const m = { visitas: 0 }
    expect(buscar(new Map([['a', 1]]), 'a', m)).toBe(1)
    expect(buscar(new Map<string, number>(), 'a', m)).toBeUndefined()
    expect([esta(new Set(['a']), 'a', m), esta(new Set<string>(), 'a', m)]).toEqual([true, false])
    expect(m.visitas).toBe(4)
  })

  it('propia lee sólo claves propias, no las del prototipo, con una visita', () => {
    const m = { visitas: 0 }
    const fila: Record<string, number> = { anio: 2024 }
    expect([propia(fila, 'anio', m), propia(fila, 'constructor', m), propia(fila, 'v', m)]).toEqual(
      [2024, undefined, undefined],
    )
    expect(m.visitas).toBe(3)
  })

  it('mapaDe arma un Map con las claves propias en su orden, una visita por clave', () => {
    const m = { visitas: 0 }
    expect([...mapaDe({ b: 1, a: 2 }, m)]).toEqual([
      ['b', 1],
      ['a', 2],
    ])
    expect(m.visitas).toBe(2)
  })
})
