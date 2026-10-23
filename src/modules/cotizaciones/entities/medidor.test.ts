import { describe, expect, it } from 'vitest'
import { buscar, esta, recorrer } from './medidor'

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
})
