import { describe, expect, it } from 'vitest'
import type { Plantilla } from './forma-de-plantilla'
import { filasDelEditor, filtrarFilas, nombreDelTono } from './filas-del-editor'
import type { ContextoDePlantilla } from './validar-plantilla'

const contexto: ContextoDePlantilla = {
  definicion: {
    nodos: [
      { id: 'fees', etiqueta: 'Fees', grupo: 'compra' },
      { id: 'grua', etiqueta: 'Grúa', grupo: 'logistica' },
      { id: 'remate', etiqueta: 'Remate', grupo: 'compra' },
      { id: 'total', etiqueta: 'TOTAL', salida: 'total' },
      { id: 'garantia', etiqueta: 'Garantía', salida: 'aparte' },
    ],
    grupos: [
      { id: 'compra', etiqueta: 'Compra', tono: 'verde' },
      { id: 'logistica', etiqueta: 'Logística', tono: 'amarillo' },
    ],
  },
  diseno: { tarjeta_total: { secundarios: ['garantia'] } },
  visibilidad: null,
  tonos: ['verde'],
}
const p: Plantilla = {
  grupos: [{ grupo: 'logistica', tono: 'azul' }, { grupo: 'compra' }],
  total: { etiqueta: 'T' },
  logo: true,
  columnas: { leyenda: false, plazo: false, tipo_cambio: false },
}

describe('filasDelEditor', () => {
  it('los grupos en el orden de la plantilla y los miembros en el de la fórmula', () => {
    const f = filasDelEditor(p, contexto)
    expect(f.grupos.map((g) => g.id)).toEqual(['logistica', 'compra'])
    expect(f.grupos[1]!.miembros.map((m) => m.id)).toEqual(['fees', 'remate'])
    expect(f.grupos[0]).toMatchObject({
      tono: 'azul',
      tonoDelGrupo: 'amarillo',
      etiqueta: 'Logística',
    })
    expect(f.total).toEqual({ id: 'total', etiqueta: 'TOTAL' })
    expect(f.aparte).toEqual([{ id: 'garantia', etiqueta: 'Garantía' }])
  })
})

describe('nombreDelTono', () => {
  it('el nombre del catálogo o la clave con el aviso', () => {
    expect(nombreDelTono('verde', [{ clave: 'verde', nombre: 'Verde' }])).toBe('Verde')
    expect(nombreDelTono('rojo', [{ clave: 'verde', nombre: 'Verde' }])).toBe('rojo (ya no está)')
    expect(nombreDelTono('constructor', [])).toBe('constructor (ya no está)')
  })
})

describe('filtrarFilas', () => {
  const filas = [
    { id: 'grua', etiqueta: 'Grúa' },
    { id: 'fees', etiqueta: 'Fees', escrita: 'Honorarios' },
    { id: 'remate', etiqueta: 'Remate' },
  ]
  it('sin tildes ni mayúsculas, por etiqueta, escrita o id', () => {
    expect(filtrarFilas(filas, 'GRUA').map((f) => f.id)).toEqual(['grua'])
    expect(filtrarFilas(filas, 'honor').map((f) => f.id)).toEqual(['fees'])
    expect(filtrarFilas(filas, 'remat').map((f) => f.id)).toEqual(['remate'])
  })
  it('en blanco, todas', () => {
    expect(filtrarFilas(filas, '  ')).toHaveLength(3)
  })
  it('una fila con motivo se queda siempre', () => {
    expect(filtrarFilas(filas, 'grua', (id) => id === 'fees').map((f) => f.id)).toEqual([
      'grua',
      'fees',
    ])
  })
})
