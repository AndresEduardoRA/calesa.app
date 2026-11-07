import { describe, expect, it } from 'vitest'
import type { Nodo } from '../nodos'
import { mismaEstructura } from './misma-estructura'

const base = {
  id: 'total',
  tipo: 'calculo',
  op: 'porcentaje_de',
  etiqueta: 'Total',
  de: ['a', 'b'],
  pct: 'tasa',
  formato: 'pct',
  texto: '=PORCENTAJE_DE(a+b; tasa)',
  seccion: 'Costos',
  sobrescribible: true,
} as unknown as Nodo

const con = (cambios: Record<string, unknown>): Nodo => ({ ...base, ...cambios }) as unknown as Nodo
const sin = (clave: string): Nodo => {
  const { [clave]: _quitada, ...resto } = base as unknown as Record<string, unknown>
  return resto as unknown as Nodo
}

describe('mismaEstructura (T13)', () => {
  it('es el mismo nodo si sólo difiere la etiqueta o el orden de las claves', () => {
    expect(mismaEstructura(base, base)).toBe(true)
    expect(mismaEstructura(base, con({ etiqueta: 'Otra' }))).toBe(true)
    const revuelto = Object.fromEntries(Object.entries(base).reverse()) as unknown as Nodo
    expect(mismaEstructura(base, revuelto)).toBe(true)
  })

  it.each([
    ['id', { id: 'otro' }],
    ['tipo', { tipo: 'constante' }],
    ['op', { op: 'suma' }],
    ['el orden de de', { de: ['b', 'a'] }],
    ['de', { de: ['a'] }],
    ['pct', { pct: 'otra_tasa' }],
    ['condicion', { condicion: 'c' }],
    ['n', { n: 2 }],
    ['tabla', { tabla: 't' }],
    ['sobre', { sobre: 's' }],
    ['columna', { columna: 'c' }],
    ['formato (pct y raw)', { formato: 'raw' }],
    ['texto', { texto: '=otra' }],
    ['seccion', { seccion: 'Otra' }],
    ['sobrescribible', { sobrescribible: false }],
  ])('difiere en %s', (_nombre, cambios) => {
    expect(mismaEstructura(base, con(cambios))).toBe(false)
    expect(mismaEstructura(con(cambios), base)).toBe(false)
  })

  it('formato presente y ausente son distintos; texto, seccion y sobrescribible también', () => {
    for (const clave of ['formato', 'texto', 'seccion', 'sobrescribible']) {
      expect(mismaEstructura(base, sin(clave)), clave).toBe(false)
      expect(mismaEstructura(sin(clave), base), clave).toBe(false)
    }
  })

  it('una clave con valor indefinido es una clave ausente', () => {
    expect(mismaEstructura(sin('seccion'), con({ seccion: undefined }))).toBe(true)
  })
})
