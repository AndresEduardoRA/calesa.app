import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// Un cliente falso: la lectura por clave primaria (`from().select().eq().limit()`) y la RPC del listado, con lo que se les diga.
const rpcs: [string, Record<string, unknown>][] = []
const lecturas: unknown[][] = []
let filaDeClave: { data: unknown; error: unknown } = { data: [], error: null }
let respuestaDeLaRpc: { data: unknown; error: unknown } = { data: [], error: null }
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: (tabla: string) => ({
        select: (columnas: string) => ({
          eq: (columna: string, valor: string) => ({
            limit: (n: number) => {
              lecturas.push([tabla, columnas, columna, valor, n])
              return Promise.resolve(filaDeClave)
            },
          }),
        }),
      }),
      rpc: (nombre: string, argumentos: Record<string, unknown>) => {
        rpcs.push([nombre, argumentos])
        return Promise.resolve(respuestaDeLaRpc)
      },
    }),
  ),
}))

import { getUnaDelListado } from './una-del-listado'

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const SIGUIENTE = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5c'
const ORIGEN = '00000000-0000-4000-8000-0000000000aa'
const INSTANTE = '2026-03-01T12:00:00.123456+00:00'

const fila = (id: string) => ({
  id,
  numero: 1001,
  origen_id: ORIGEN,
  lead_id: null,
  vehiculo_id: null,
  creado_por: '00000000-0000-4000-8000-0000000000cc',
  clase: 'preventa',
  estado: 'activa',
  titulo: null,
  total_base: 1234.5,
  moneda_mostrar: null,
  creado_en: INSTANTE,
  vence_el: '2026-03-08',
  vencida: true,
})

describe('getUnaDelListado', () => {
  beforeEach(() => {
    rpcs.length = 0
    lecturas.length = 0
    filaDeClave = { data: [{ id: ID, origen_id: ORIGEN, creado_en: INSTANTE }], error: null }
    respuestaDeLaRpc = { data: [fila(ID)], error: null }
  })

  it('sin fila (no existe, papelera o no se ve) es null y no llama la RPC', async () => {
    filaDeClave = { data: [], error: null }
    const leida = await getUnaDelListado(ID)
    expect(leida).toEqual({ ok: true, data: null })
    expect(rpcs).toHaveLength(0)
  })

  it('lo que no es un guid es null y no pide nada', async () => {
    expect(await getUnaDelListado('abc')).toEqual({ ok: true, data: null })
    expect(lecturas).toHaveLength(0)
    expect(rpcs).toHaveLength(0)
  })

  it('con fila pide la RPC con el origen, el instante tal cual, el id siguiente, tamaño 1 y hacia adelante', async () => {
    await getUnaDelListado(ID)
    expect(lecturas).toEqual([['cotizaciones', 'id, origen_id, creado_en', 'id', ID, 1]])
    expect(rpcs).toHaveLength(1)
    expect(rpcs[0]?.[0]).toBe('cotizaciones_listado')
    expect(rpcs[0]?.[1]).toMatchObject({
      p_tamano: 1,
      p_origen: ORIGEN,
      p_cursor_en: INSTANTE,
      p_cursor_id: SIGUIENTE,
      p_hacia_atras: false,
    })
  })

  it('si la primera fila es ella, la devuelve con su «Vencida»', async () => {
    const leida = await getUnaDelListado(ID)
    expect(leida.ok && leida.data?.id).toBe(ID)
    expect(leida.ok && leida.data?.vencida).toBe(true)
  })

  it('si la primera fila es otra (ella no se ve), es null', async () => {
    respuestaDeLaRpc = { data: [fila('00000000-0000-4000-8000-000000000001')], error: null }
    expect(await getUnaDelListado(ID)).toEqual({ ok: true, data: null })
    respuestaDeLaRpc = { data: [], error: null }
    expect(await getUnaDelListado(ID)).toEqual({ ok: true, data: null })
  })

  it('pedida con mayúsculas, la encuentra (compara normalizado)', async () => {
    const leida = await getUnaDelListado(ID.toUpperCase())
    expect(lecturas[0]?.[3]).toBe(ID)
    expect(leida.ok && leida.data?.id).toBe(ID)
  })

  it('un error de la lectura o de la RPC es un error, no null', async () => {
    filaDeClave = { data: null, error: { code: '42501', message: 'denegado' } }
    expect((await getUnaDelListado(ID)).ok).toBe(false)
    filaDeClave = { data: [{ id: ID, origen_id: ORIGEN, creado_en: INSTANTE }], error: null }
    respuestaDeLaRpc = { data: null, error: { code: '42501', message: 'denegado' } }
    expect((await getUnaDelListado(ID)).ok).toBe(false)
  })

  it('una fila que no es la que promete la base es un error', async () => {
    filaDeClave = { data: [{ id: 'x' }], error: null }
    expect((await getUnaDelListado(ID)).ok).toBe(false)
  })
})
