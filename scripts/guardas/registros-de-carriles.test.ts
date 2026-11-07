import { describe, expect, it } from 'vitest'

import { sumarListas, sumarObjetos } from './registros-de-carriles'

describe('sumarObjetos', () => {
  it('suma los registros de cada carril, en el orden de las rutas', () => {
    const suma = sumarObjetos<number>({
      './areas-c/g.ts': { REGISTRO: { c1: 3 } },
      './areas-b/g.ts': { REGISTRO: { b1: 1, b2: 2 } },
    })
    expect(Object.keys(suma)).toEqual(['b1', 'b2', 'c1'])
    expect(suma).toEqual({ b1: 1, b2: 2, c1: 3 })
  })

  it('sin archivos, o con uno que no exporta REGISTRO, es vacío', () => {
    expect(sumarObjetos({})).toEqual({})
    expect(sumarObjetos({ './areas-b/g.ts': {} })).toEqual({})
  })

  it('un REGISTRO que no es un objeto es un error que nombra el archivo', () => {
    expect(() => sumarObjetos({ './areas-b/g.ts': { REGISTRO: [1] } })).toThrow(/areas-b\/g\.ts/)
    expect(() => sumarObjetos({ './areas-b/g.ts': { REGISTRO: null } })).toThrow(/objeto/)
    expect(() => sumarObjetos({ './areas-b/g.ts': { REGISTRO: 'x' } })).toThrow(/objeto/)
  })
})

describe('sumarListas', () => {
  it('suma las listas de cada carril, en el orden de las rutas', () => {
    expect(
      sumarListas<string>({
        './areas-c/g.ts': { REGISTRO: ['c'] },
        './areas-b/g.ts': { REGISTRO: ['b1', 'b2'] },
      }),
    ).toEqual(['b1', 'b2', 'c'])
  })

  it('sin archivos es vacío y un REGISTRO que no es lista es un error', () => {
    expect(sumarListas({})).toEqual([])
    expect(() => sumarListas({ './areas-b/g.ts': { REGISTRO: { a: 1 } } })).toThrow(/lista/)
  })
})
