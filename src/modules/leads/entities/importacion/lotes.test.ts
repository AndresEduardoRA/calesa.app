import { describe, expect, it } from 'vitest'
import type { PedidoDeFila } from './filas'
import {
  avanceDeImportacion,
  hayAlgoQueCorregir,
  lotesDeImportacion,
  loteImportadoDesde,
  resumirImportacion,
  type ResultadoDeFila,
} from './lotes'

const pedido = (id: string): PedidoDeFila => ({
  id,
  fila: 2,
  lead: {
    nombre: 'Ana',
    telefono_principal: '7',
    tipo_lead_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    origen_lead_id: null,
    atributos: {},
  },
})

const resultado = (id: string, r: ResultadoDeFila['resultado']): ResultadoDeFila => ({
  id,
  fila: 2,
  resultado: r,
  repetido: false,
  numero: null,
  campo: null,
  motivo: null,
})

describe('loteImportadoDesde', () => {
  it('lee las cuatro formas de una fila', () => {
    const filas = loteImportadoDesde({
      importacion: '11111111-1111-4111-8111-111111111111',
      filas: [
        { id: 'a', fila: 2, resultado: 'creado', numero: 15, repetido: false },
        { id: 'b', fila: 3, resultado: 'creado', numero: 16, repetido: true },
        { id: 'c', fila: 4, resultado: 'ya_existe' },
        { id: 'd', fila: 5, resultado: 'error', campo: 'nombre', motivo: 'Escribe el nombre.' },
      ],
    })
    expect(filas).toEqual([
      {
        id: 'a',
        fila: 2,
        resultado: 'creado',
        numero: 15,
        repetido: false,
        campo: null,
        motivo: null,
      },
      {
        id: 'b',
        fila: 3,
        resultado: 'creado',
        numero: 16,
        repetido: true,
        campo: null,
        motivo: null,
      },
      {
        id: 'c',
        fila: 4,
        resultado: 'ya_existe',
        numero: null,
        repetido: false,
        campo: null,
        motivo: null,
      },
      {
        id: 'd',
        fila: 5,
        resultado: 'error',
        numero: null,
        repetido: false,
        campo: 'nombre',
        motivo: 'Escribe el nombre.',
      },
    ])
  })

  it('una forma rota o un resultado desconocido es null: no se da por importado', () => {
    expect(loteImportadoDesde(null)).toBeNull()
    expect(loteImportadoDesde({ importacion: 'x', filas: [] })).toBeNull()
    expect(
      loteImportadoDesde({
        importacion: '11111111-1111-4111-8111-111111111111',
        filas: [{ id: 'a', fila: 2, resultado: 'adoptado' }],
      }),
    ).toBeNull()
  })
})

describe('resumirImportacion', () => {
  const validas = ['a', 'b', 'c', 'd'].map(pedido)

  it('cuenta lo creado, lo que ya existía, lo rechazado y lo que falta', () => {
    const resultados = new Map([
      ['a', resultado('a', 'creado')],
      ['b', resultado('b', 'ya_existe')],
      ['c', resultado('c', 'error')],
    ])
    expect(resumirImportacion(validas, 2, resultados)).toEqual({
      creadas: 1,
      yaExistian: 1,
      rechazadas: 3,
      pendientes: 1,
    })
  })

  it('un reintento de lo ya creado no se cuenta dos veces', () => {
    const resultados = new Map([['a', { ...resultado('a', 'creado'), repetido: true }]])
    expect(resumirImportacion([pedido('a')], 0, resultados).creadas).toBe(1)
  })

  it('el mismo archivo dos veces: todo «ya existe»', () => {
    const resultados = new Map(validas.map((p) => [p.id, resultado(p.id, 'ya_existe')]))
    const resumen = resumirImportacion(validas, 0, resultados)
    expect(resumen).toEqual({ creadas: 0, yaExistian: 4, rechazadas: 0, pendientes: 0 })
    expect(hayAlgoQueCorregir(resumen)).toBe(true)
  })

  it('sin nada que corregir', () => {
    expect(hayAlgoQueCorregir({ creadas: 4, yaExistian: 0, rechazadas: 0, pendientes: 0 })).toBe(
      false,
    )
  })
})

describe('lotesDeImportacion', () => {
  const grande = (id: string, nota: string): PedidoDeFila => ({
    ...pedido(id),
    lead: { ...pedido(id).lead, atributos: { notas: nota } },
  })

  it('de a 50 filas', () => {
    const pedidos = Array.from({ length: 120 }, (_, i) => pedido(`p${String(i)}`))
    expect(lotesDeImportacion(pedidos, 50).map((lote) => lote.length)).toEqual([50, 50, 20])
  })

  it('un lote que pesaría demasiado se parte antes de llegar a 50', () => {
    const pedidos = Array.from({ length: 10 }, (_, i) => grande(`p${String(i)}`, 'x'.repeat(2000)))
    const lotes = lotesDeImportacion(pedidos, 50, 5000)
    expect(lotes.length).toBeGreaterThan(1)
    expect(lotes.flat()).toHaveLength(10)
    for (const lote of lotes) {
      expect(JSON.stringify(lote).length).toBeLessThanOrEqual(5000 + 2200)
    }
  })

  it('una fila que sola pesa más que el tope va en su propio lote', () => {
    const lotes = lotesDeImportacion([grande('a', 'x'.repeat(9000)), pedido('b')], 50, 5000)
    expect(lotes.map((lote) => lote.length)).toEqual([1, 1])
  })

  it('sin filas, sin lotes', () => {
    expect(lotesDeImportacion([], 50)).toEqual([])
  })
})

describe('avanceDeImportacion', () => {
  it('cuenta los lotes que ya tienen todas sus respuestas', () => {
    const lotes = [[pedido('a'), pedido('b')], [pedido('c')]]
    const resultados = new Map([
      ['a', resultado('a', 'creado')],
      ['b', resultado('b', 'error')],
    ])
    const { resumen, lotesHechos } = avanceDeImportacion(lotes, 1, resultados)
    expect(lotesHechos).toBe(1)
    expect(resumen).toEqual({ creadas: 1, yaExistian: 0, rechazadas: 2, pendientes: 1 })
  })
})
