import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import { consultaDeLaDefinicion, leerDefinicionSobre } from './consulta-de-la-definicion'

type Llamada = [string, ...unknown[]]

// Un cliente que anota cada llamada de la consulta y responde lo que se le da.
function clienteFalso(respuesta: {
  data: unknown
  error: { message: string; code?: string } | null
}) {
  const llamadas: Llamada[] = []
  const consulta: Record<string, unknown> = {}
  for (const metodo of ['select', 'eq', 'limit']) {
    consulta[metodo] = (...args: unknown[]) => {
      llamadas.push([metodo, ...args])
      return consulta
    }
  }
  consulta['then'] = (resolver: (valor: unknown) => unknown) =>
    Promise.resolve(respuesta).then(resolver)
  const cliente = {
    from: (nombre: string) => {
      llamadas.push(['from', nombre])
      return consulta
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, llamadas }
}

const FORMULA = '22222222-2222-4222-8222-222222222222'
const HORA = '2026-11-07T15:00:00.123456+00:00'
const DEFINICION = {
  nodos: [
    { id: 'tc', tipo: 'tipo_cambio', etiqueta: 'TC', clave: 'oficial' },
    { id: 'flete', tipo: 'constante', etiqueta: 'Flete', texto: '=900' },
  ],
  buckets: { b: 'tc' },
}

describe('consultaDeLaDefinicion', () => {
  it('una fila por su id, con la definición, params y la hora', () => {
    const { cliente, llamadas } = clienteFalso({ data: [], error: null })
    void consultaDeLaDefinicion(cliente, FORMULA)
    expect(llamadas).toEqual([
      ['from', 'formulas'],
      ['select', 'id, definicion, params, actualizado_en'],
      ['eq', 'id', FORMULA],
      ['limit', 1],
    ])
  })
})

describe('leerDefinicionSobre', () => {
  it('la fila leída: la fórmula partida en constantes y tablas, y la hora tal cual', async () => {
    const { cliente } = clienteFalso({
      data: [{ id: FORMULA, definicion: DEFINICION, params: { flete: 900 }, actualizado_en: HORA }],
      error: null,
    })
    expect(await leerDefinicionSobre(cliente, FORMULA)).toEqual({
      ok: true,
      data: {
        id: FORMULA,
        actualizadoEn: HORA,
        formula: { definicion: DEFINICION, params: { constantes: { flete: 900 }, tablas: {} } },
      },
    })
  })

  it('sin fila (se descartó o ya no se configura el origen): nulo', async () => {
    const { cliente } = clienteFalso({ data: [], error: null })
    expect(await leerDefinicionSobre(cliente, FORMULA)).toEqual({ ok: true, data: null })
  })

  it('un error de la base es un fallo', async () => {
    const { cliente } = clienteFalso({ data: null, error: { message: 'boom', code: '42501' } })
    const r = await leerDefinicionSobre(cliente, FORMULA)
    expect(r.ok).toBe(false)
  })

  it('una definición sin la forma de una fórmula es un fallo, no una fórmula', async () => {
    const { cliente } = clienteFalso({
      data: [
        { id: FORMULA, definicion: { nodos: [{ id: 'x' }] }, params: {}, actualizado_en: HORA },
      ],
      error: null,
    })
    expect(await leerDefinicionSobre(cliente, FORMULA)).toEqual({
      ok: false,
      error: { codigo: 'inesperado', mensaje: 'No pudimos leer la fórmula.' },
    })
  })

  it('una fila con una columna de más es un fallo', async () => {
    const { cliente } = clienteFalso({
      data: [{ id: FORMULA, definicion: DEFINICION, params: {}, actualizado_en: HORA, diseno: {} }],
      error: null,
    })
    expect((await leerDefinicionSobre(cliente, FORMULA)).ok).toBe(false)
  })
})
