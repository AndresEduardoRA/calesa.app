import { describe, expect, it } from 'vitest'
import { esquemaFormula } from './formula'
import { evaluar } from './motor'
import { esquemaEntrada, revisarEntrada, type Entrada } from './motor-entrada'
import { esquemaNodo } from './nodos'

const BUENA = {
  inputs: { remate: 9500 },
  banderas: { es_hibrido: true },
  tipos_cambio: { oficial: 6.96, paralelo: 12.4 },
  vehiculo: { anio: 2023, 'atributos.tipo': 'auto', 'atributos.vin': null },
  tablas: { depreciacion: [{ anio: 2023, factor: 0.9 }] },
}

describe('esquemaEntrada', () => {
  it('acepta la entrada del motor, y es estricta', () => {
    expect(esquemaEntrada.parse(BUENA)).toEqual(BUENA)
    expect(esquemaEntrada.safeParse({ ...BUENA, overrides: {} }).success).toBe(false)
    expect(esquemaEntrada.safeParse({ ...BUENA, tablas: undefined }).success).toBe(false)
  })

  it('sólo números finitos, tipos de cambio mayores que 0 y banderas que son sí o no', () => {
    const malas = [
      { inputs: { a: Number.POSITIVE_INFINITY } },
      { inputs: { a: Number.NaN } },
      { tipos_cambio: { oficial: 0 } },
      { tipos_cambio: { oficial: -1 } },
      { banderas: { b: 1 } },
      { vehiculo: { anio: true } },
      { inputs: { Remate: 1 } },
    ]
    for (const x of malas)
      expect(esquemaEntrada.safeParse({ ...BUENA, ...x }).success, JSON.stringify(x)).toBe(false)
  })
})

describe('evaluar con una entrada que el Zod habría rechazado (el tipo no lo impide)', () => {
  const formula = esquemaFormula.parse({
    definicion: {
      nodos: [
        { id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC' },
        { id: 'a', tipo: 'input', etiqueta: 'A' },
        {
          id: 'total',
          tipo: 'calculo',
          op: 'suma',
          de: ['a'],
          etiqueta: 'T',
          salida: 'total',
          bucket: 'b',
        },
      ],
      buckets: { b: 'tc' },
    },
    params: {},
  })
  const con = (x: Partial<Entrada>): Entrada => ({
    ...esquemaEntrada.parse({ ...BUENA, inputs: {}, banderas: {} }),
    ...x,
  })

  it('un tipo de cambio que no es mayor que 0 cuenta como sin valor', () => {
    for (const oficial of [0, -2, Number.NaN]) {
      const r = evaluar(formula, con({ tipos_cambio: { oficial }, inputs: { a: 1 } }))
      expect([r.valores['tc'], r.totales.bs, r.faltantes], String(oficial)).toEqual([
        null,
        null,
        [{ codigo: 'tipo_de_cambio_sin_valor', donde: 'tc', ref: 'oficial' }],
      ])
    }
  })

  it('un número que no es finito no se guarda: queda null con fuera_de_rango', () => {
    const r = evaluar(formula, con({ inputs: { a: Number.POSITIVE_INFINITY } }))
    expect([r.valores['a'], r.valores['total'], r.faltantes]).toEqual([
      null,
      null,
      [{ codigo: 'fuera_de_rango', donde: 'a' }],
    ])
  })
})

describe('revisarEntrada', () => {
  const nodos = new Map(
    [
      { id: 'a', tipo: 'input', etiqueta: 'A' },
      { id: 'f', tipo: 'bandera', etiqueta: 'F' },
    ].map((n) => {
      const nodo = esquemaNodo.parse(n)
      return [nodo.id, nodo] as const
    }),
  )
  const medidor = { visitas: 0 }

  it('acepta inputs que son inputs y banderas que son banderas, y cuenta cada clave', () => {
    const entrada = { inputs: new Map([['a', 1]]), banderas: new Map([['f', true]]) }
    expect(() => revisarEntrada(nodos, entrada, medidor)).not.toThrow()
    expect(medidor.visitas).toBe(4)
  })

  it('rechaza lo demás', () => {
    expect(() =>
      revisarEntrada(nodos, { inputs: new Map([['f', 1]]), banderas: new Map() }, medidor),
    ).toThrow(/«f», que no es un input/)
  })
})
