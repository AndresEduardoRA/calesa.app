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

const DISENO = {
  cabecera: { modos: [], ver_total_bs: false },
  secciones: [
    {
      id: 's',
      titulo: 'Costos',
      presentacion: 'principal',
      items: [{ tipo: 'celda', nodo: 'flete', ancho: 'completo' }],
    },
  ],
  tarjeta_total: { nodo: 'flete', secundarios: [] },
}

// La fila como la devuelve la base: la publicada sin nota ni diseño, y lo que cada prueba cambia.
const fila = (cambios: Record<string, unknown>): Record<string, unknown> => ({
  id: FORMULA,
  estado: 'publicada',
  definicion: DEFINICION,
  params: {},
  diseno: null,
  nota: null,
  actualizado_en: HORA,
  ...cambios,
})

describe('consultaDeLaDefinicion', () => {
  it('una fila por su id, con su estado, la definición, params, el diseño, la nota y la hora', () => {
    const { cliente, llamadas } = clienteFalso({ data: [], error: null })
    void consultaDeLaDefinicion(cliente, FORMULA)
    expect(llamadas).toEqual([
      ['from', 'formulas'],
      ['select', 'id, estado, definicion, params, diseno, nota, actualizado_en'],
      ['eq', 'id', FORMULA],
      ['limit', 1],
    ])
  })
})

describe('leerDefinicionSobre', () => {
  it('la fila leída: la fórmula partida en constantes y tablas, la hora tal cual, su estado, diseño y nota', async () => {
    const { cliente } = clienteFalso({
      data: [fila({ params: { flete: 900 }, estado: 'borrador', nota: 'A medias' })],
      error: null,
    })
    expect(await leerDefinicionSobre(cliente, FORMULA)).toEqual({
      ok: true,
      data: {
        id: FORMULA,
        actualizadoEn: HORA,
        estado: 'borrador',
        diseno: null,
        nota: 'A medias',
        formula: { definicion: DEFINICION, params: { constantes: { flete: 900 }, tablas: {} } },
      },
    })
  })

  it('la publicada, con su diseño leído por su esquema', async () => {
    const { cliente } = clienteFalso({ data: [fila({ diseno: DISENO })], error: null })
    const r = await leerDefinicionSobre(cliente, FORMULA)
    expect(r.ok && r.data ? [r.data.estado, r.data.diseno, r.data.nota] : null).toEqual([
      'publicada',
      DISENO,
      null,
    ])
  })

  it('una fila sin estado, con otro (archivada) o con un diseño sin su forma es un fallo', async () => {
    const sinEstado: Record<string, unknown> = fila({})
    delete sinEstado['estado']
    for (const dato of [
      sinEstado,
      fila({ estado: 'archivada' }),
      fila({ diseno: { secciones: [] } }),
    ]) {
      const { cliente } = clienteFalso({ data: [dato], error: null })
      expect(await leerDefinicionSobre(cliente, FORMULA)).toEqual({
        ok: false,
        error: { codigo: 'inesperado', mensaje: 'No pudimos leer la fórmula.' },
      })
    }
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
      data: [fila({ definicion: { nodos: [{ id: 'x' }] } })],
      error: null,
    })
    expect(await leerDefinicionSobre(cliente, FORMULA)).toEqual({
      ok: false,
      error: { codigo: 'inesperado', mensaje: 'No pudimos leer la fórmula.' },
    })
  })

  it('una fila con una columna de más es un fallo', async () => {
    const { cliente } = clienteFalso({
      data: [{ ...fila({}), visibilidad: null }],
      error: null,
    })
    expect((await leerDefinicionSobre(cliente, FORMULA)).ok).toBe(false)
  })
})
