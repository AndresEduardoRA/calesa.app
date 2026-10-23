import { describe, expect, it } from 'vitest'
import { buscar, esta, mapaDe, ordenar, propia, recorrer } from './medidor'

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

  it('ordenar da una copia ordenada por bytes y cuenta cada elemento y cada comparación', () => {
    const m = { visitas: 0 }
    const lista = ['zz', 'aa', 'b_1', 'b0', 'mm']
    expect(ordenar(lista, m)).toEqual(['aa', 'b0', 'b_1', 'mm', 'zz'])
    expect(lista).toEqual(['zz', 'aa', 'b_1', 'b0', 'mm'])
    // 5 al recorrer, y entre n − 1 y n·log2(n) + n comparaciones (cuántas, lo decide el sort de V8).
    expect(m.visitas).toBeGreaterThanOrEqual(5 + 4)
    expect(m.visitas).toBeLessThanOrEqual(5 + 5 * Math.log2(5) + 5)
  })
})
