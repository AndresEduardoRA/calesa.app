// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// Un cliente falso: anota los filtros del `update` y devuelve lo que se le diga.
const filtros: [string, unknown][] = []
let respuesta: { data: unknown; error: unknown } = { data: [], error: null }
const cadena = {
  update: (fila: unknown) => {
    filtros.push(['update', fila])
    return cadena
  },
  eq: (columna: string, valor: unknown) => {
    filtros.push([`eq ${columna}`, valor])
    return cadena
  },
  is: (columna: string, valor: unknown) => {
    filtros.push([`is ${columna}`, valor])
    return cadena
  },
  select: () => cadena,
  limit: () => Promise.resolve(respuesta),
}
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({ from: () => cadena })),
}))

let releido: unknown = { ok: true, data: null }
vi.mock('./leer', () => ({ leerItem: vi.fn(() => Promise.resolve(releido)) }))

import { itemsSupabase } from './guardar'

const ID = '7f9c1d2e-3a4b-4c5d-8e6f-0123456789ab'
const VERSION = '2026-11-12T10:00:00.123456+00:00'
const filaDeLaBase = {
  id: ID,
  proyecto_id: ID,
  descripcion: 'Faro',
  tipo_pieza_id: null,
  condicion_id: null,
  pais_origen_id: null,
  modo_transporte_id: null,
  cantidad: 1,
  stock_cantidad: 0,
  precio_cliente: 10,
  moneda: 'USD',
  tracking: null,
  notas: null,
  en_stock_desde: null,
  actualizado_en: '2026-11-12T10:05:00.000001+00:00',
  fase: null,
}

beforeEach(() => {
  filtros.length = 0
  respuesta = { data: [], error: null }
  releido = { ok: true, data: null }
})

describe('guardar una celda', () => {
  it('el update lleva la versión que se vio y no toca lo eliminado', async () => {
    respuesta = { data: [filaDeLaBase], error: null }
    const r = await itemsSupabase.guardar({
      id: ID,
      fila: { precio_cliente: 10 },
      actualizadoEn: VERSION,
    })
    expect(r.ok).toBe(true)
    expect(filtros).toEqual([
      ['update', { precio_cliente: 10 }],
      ['eq id', ID],
      ['eq actualizado_en', VERSION],
      ['is eliminado_en', null],
    ])
  })

  it('cero filas con el ítem existente es un conflicto, nunca éxito', async () => {
    releido = { ok: true, data: { id: ID } }
    const r = await itemsSupabase.guardar({ id: ID, fila: { cantidad: 2 }, actualizadoEn: VERSION })
    expect(r).toMatchObject({ ok: false, error: { codigo: 'conflicto' } })
    if (!r.ok) expect(r.error.mensaje).toContain('Otra persona cambió')
  })

  it('cero filas con el ítem ya eliminado dice que ya no existe', async () => {
    const r = await itemsSupabase.guardar({ id: ID, fila: { cantidad: 2 }, actualizadoEn: VERSION })
    expect(r).toMatchObject({
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Este ítem ya no existe.' },
    })
  })

  it('un check de cantidad se dice por su columna', async () => {
    respuesta = { data: null, error: { code: '23514', message: 'violates check constraint' } }
    const r = await itemsSupabase.guardar({ id: ID, fila: { cantidad: 0 }, actualizadoEn: VERSION })
    expect(r).toMatchObject({
      ok: false,
      error: { mensaje: 'La cantidad es un número entero desde 1.' },
    })
  })
})
