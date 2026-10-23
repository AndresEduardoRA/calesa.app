import { describe, expect, it } from 'vitest'
import {
  bucketDe,
  condicionDe,
  esMonto,
  esquemaNodo,
  formatoDe,
  referenciasDe,
  sobrescribibleDe,
  soloEnDe,
  type Nodo,
} from './nodos'

const nodo = (x: Record<string, unknown>): Nodo => esquemaNodo.parse({ etiqueta: 'X', ...x })

// Un nodo de cada tipo (y de cada operación) con todo lo que puede nombrar, y lo que tiene que dar.
const CASOS: [string, Record<string, unknown>, string[]][] = [
  [
    'input',
    { id: 'a', tipo: 'input', sugerido_de: 'b', requerido_si: 'c', condicion: 'd' },
    ['sugerido_de:b', 'requerido_si:c', 'condicion:d'],
  ],
  ['constante', { id: 'a', tipo: 'constante', condicion: 'd' }, ['condicion:d']],
  ['tipo_cambio', { id: 'a', tipo: 'tipo_cambio', clave: 'oficial' }, []],
  ['campo_vehiculo', { id: 'a', tipo: 'campo_vehiculo', campo: 'atributos.cilindrada' }, []],
  ['bandera', { id: 'a', tipo: 'bandera' }, []],
  [
    'opcion',
    {
      id: 'a',
      tipo: 'opcion',
      opciones: [
        { clave: 'x', etiqueta: 'X', titulo: 'X' },
        { clave: 'y', etiqueta: 'Y', titulo: 'Y' },
      ],
    },
    [],
  ],
  [
    'tabla',
    {
      id: 'a',
      tipo: 'tabla',
      tabla: 't',
      match: { anio: 'anio', tipo: 'tipo_vehiculo' },
      columna: 'c',
      condicion: 'd',
    },
    ['match:anio', 'match:tipo_vehiculo', 'condicion:d'],
  ],
  ['tramo', { id: 'a', tipo: 'tramo', tabla: 't', sobre: 'b', columna: 'c' }, ['sobre:b']],
  [
    'suma',
    { id: 'a', tipo: 'calculo', op: 'suma', de: ['b', 'c'], condicion: 'd' },
    ['de:b', 'de:c', 'condicion:d'],
  ],
  [
    'porcentaje_de',
    { id: 'a', tipo: 'calculo', op: 'porcentaje_de', de: ['b'], pct: 'p' },
    ['de:b', 'pct:p'],
  ],
  [
    'multiplicar',
    { id: 'a', tipo: 'calculo', op: 'multiplicar', de: ['b', 'c'] },
    ['de:b', 'de:c'],
  ],
  ['restar', { id: 'a', tipo: 'calculo', op: 'restar', de: ['b', 'c'] }, ['de:b', 'de:c']],
  ['dividir', { id: 'a', tipo: 'calculo', op: 'dividir', de: ['b', 'c'] }, ['de:b', 'de:c']],
  [
    'si',
    { id: 'a', tipo: 'calculo', op: 'si', de: ['b'], condicion: 'd' },
    ['de:b', 'condicion:d'],
  ],
  [
    'depreciar',
    { id: 'a', tipo: 'calculo', op: 'depreciar', de: ['b'], tabla: 't', sobre: 'e', columna: 'c' },
    ['de:b', 'sobre:e'],
  ],
  ['redondear', { id: 'a', tipo: 'calculo', op: 'redondear', de: ['b'], n: 2 }, ['de:b']],
]

describe('referenciasDe', () => {
  it.each(CASOS)('%s nombra lo que lee, con su papel', (_, crudo, esperadas) => {
    expect(referenciasDe(nodo(crudo)).map((r) => `${r.papel}:${r.id}`)).toEqual(esperadas)
  })
})

describe('esquemaNodo', () => {
  it('rechaza una clave mal escrita, un tipo o una operación que no existen y la aridad', () => {
    const malos = [
      { id: 'a', tipo: 'input', solo_em: ['x'] },
      { id: 'a', tipo: 'formula' },
      { id: 'a', tipo: 'calculo', op: 'potencia', de: ['b'] },
      { id: 'a', tipo: 'calculo', op: 'dividir', de: ['b', 'c', 'd'] },
      { id: 'a', tipo: 'calculo', op: 'porcentaje_de', de: ['b'] },
      { id: 'A', tipo: 'input' },
      { id: 'a', tipo: 'tipo_cambio', clave: 'oficial', solo_en: ['x'] },
      { id: 'a', tipo: 'input', sobrescribible: true },
      { id: 'tablas', tipo: 'constante' },
    ]
    for (const m of malos)
      expect(esquemaNodo.safeParse({ etiqueta: 'X', ...m }).success).toBe(false)
  })

  it('no le pone el formato por defecto a lo que lee: lo guardado no cambia', () => {
    expect(nodo({ id: 'a', tipo: 'input' })).not.toHaveProperty('formato')
  })
})

describe('lo que se lee de un nodo', () => {
  it('formatoDe vale usd sin formato, como el coalesce de la base, y esMonto mira usd y moneda', () => {
    expect(formatoDe({})).toBe('usd')
    expect(formatoDe({ formato: 'pct' })).toBe('pct')
    expect([
      esMonto({}),
      esMonto({ formato: 'moneda' }),
      esMonto({ formato: 'pct' }),
      esMonto({ formato: 'raw' }),
    ]).toEqual([true, true, false, false])
  })

  it('bucketDe trata «ninguno» como sin bucket', () => {
    expect([bucketDe({}), bucketDe({ bucket: 'ninguno' }), bucketDe({ bucket: 'origen' })]).toEqual(
      [undefined, undefined, 'origen'],
    )
  })

  it('soloEnDe, condicionDe y sobrescribibleDe sólo lo dan los tipos que lo admiten', () => {
    const tc = nodo({ id: 'a', tipo: 'tipo_cambio', clave: 'oficial' })
    const tabla = nodo({
      id: 'a',
      tipo: 'tabla',
      tabla: 't',
      match: {},
      columna: 'c',
      solo_en: ['x'],
      condicion: 'd',
      sobrescribible: true,
    })
    const input = nodo({ id: 'a', tipo: 'input' })
    expect([soloEnDe(tc), condicionDe(tc), sobrescribibleDe(tc)]).toEqual([
      undefined,
      undefined,
      false,
    ])
    expect([soloEnDe(tabla), condicionDe(tabla), sobrescribibleDe(tabla)]).toEqual([
      ['x'],
      'd',
      true,
    ])
    expect(sobrescribibleDe(input)).toBe(false)
  })
})
