import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Formula } from './formula'
import { evaluar } from './motor'
import { esquemaEntrada, type Entrada } from './motor-entrada'
import { validarFormula } from './validar'

type Caso = {
  nombre: string
  formula_de?: string
  definicion?: unknown
  params?: unknown
  entrada: object
}
const leer = <T>(ruta: string) =>
  JSON.parse(readFileSync(new URL(ruta, import.meta.url), 'utf8')) as { casos: T[] }
const motor = leer<Caso>('./casos-del-motor.json').casos
const formulas = leer<Caso>('./casos-de-formula.json').casos

const validada = (definicion: unknown, params: unknown): Formula => {
  const r = validarFormula(definicion, params ?? {})
  if (!r.ok) throw new Error(r.error.mensaje)
  return r.formula
}
const VACIA = { inputs: {}, banderas: {}, tipos_cambio: {}, vehiculo: {}, tablas: {} }

// Cada caso del juego, como fórmula y entrada nuevas en cada llamada.
function casos(): { nombre: string; formula: Formula; entrada: Entrada }[] {
  return motor.map((c) => {
    const de = c.formula_de === undefined ? c : formulas.find((f) => f.nombre === c.formula_de)
    const formula = validada(de?.definicion, de?.params)
    return { nombre: c.nombre, formula, entrada: esquemaEntrada.parse({ ...VACIA, ...c.entrada }) }
  })
}

function congelar<T>(x: T): T {
  if (typeof x === 'object' && x !== null) {
    for (const v of Object.values(x)) congelar(v)
    Object.freeze(x)
  }
  return x
}

// El mismo dato con las claves de cada objeto al revés (las listas no cambian de orden).
function alReves<T>(x: T): T {
  if (Array.isArray(x)) return x.map(alReves) as T
  if (typeof x !== 'object' || x === null) return x
  return Object.fromEntries(
    Object.entries(x)
      .reverse()
      .map(([k, v]) => [k, alReves(v)]),
  ) as T
}

describe('evaluar es una función pura', () => {
  it('dos corridas dan el mismo resultado, bit a bit y con las claves en el mismo orden', () => {
    for (const c of casos()) {
      const a = evaluar(c.formula, c.entrada)
      const b = evaluar(c.formula, c.entrada)
      expect(b, c.nombre).toEqual(a)
      expect(JSON.stringify(b), c.nombre).toBe(JSON.stringify(a))
    }
  })

  it('no muta la fórmula ni la entrada: congeladas a fondo da lo mismo', () => {
    for (const c of casos()) {
      const libre = evaluar(c.formula, c.entrada)
      const congelada = evaluar(congelar(c.formula), congelar(c.entrada))
      expect(congelada, c.nombre).toEqual(libre)
    }
  })

  it('el orden de las claves de la entrada y de la fórmula no importa', () => {
    for (const c of casos()) {
      const derecho = evaluar(c.formula, c.entrada)
      const reves = evaluar(alReves(c.formula), alReves(c.entrada))
      expect(JSON.stringify(reves), c.nombre).toBe(JSON.stringify(derecho))
    }
  })

  it('las claves de valores y de estados siguen el orden de la lista de nodos', () => {
    for (const c of casos()) {
      const ids = c.formula.definicion.nodos.map((n) => n.id)
      const r = evaluar(c.formula, c.entrada)
      expect(Object.keys(r.valores), c.nombre).toEqual(ids)
      expect(Object.keys(r.estados), c.nombre).toEqual(ids)
    }
  })

  it('si faltan dos campos de un match, el faltante nombra el menor, en cualquier orden', () => {
    const tabla = { id: 't', tipo: 'tabla', tabla: 'x', columna: 'v', etiqueta: 'T' }
    const formula = (match: Record<string, string>) =>
      validada(
        {
          nodos: [
            { id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC' },
            { ...tabla, match },
            {
              id: 'total',
              tipo: 'calculo',
              op: 'suma',
              de: ['t'],
              etiqueta: 'T',
              salida: 'total',
              bucket: 'b',
            },
          ],
          buckets: { b: 'tc' },
        },
        { tablas: { x: [{ a: 1, b: 2, v: 3 }] } },
      )
    const entrada = esquemaEntrada.parse({ ...VACIA, tipos_cambio: { oficial: 1 } })
    const esperado = [{ codigo: 'campo_sin_valor', donde: 't', ref: 'campo_a' }]
    expect(evaluar(formula({ a: 'campo_a', b: 'campo_b' }), entrada).faltantes).toEqual(esperado)
    expect(evaluar(formula({ b: 'campo_b', a: 'campo_a' }), entrada).faltantes).toEqual(esperado)
  })
})
