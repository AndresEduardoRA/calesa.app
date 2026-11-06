import { beforeEach, describe, expect, it, vi } from 'vitest'
import { leerCursor } from '@/shared/lib/paginacion'

vi.mock('server-only', () => ({}))

// Un cliente falso que anota la RPC que se llama y devuelve lo que se le diga.
const llamadas: [string, unknown][] = []
let respuesta: { data: unknown; error: unknown } = { data: [], error: null }
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      rpc: (nombre: string, argumentos: unknown) => {
        llamadas.push([nombre, argumentos])
        return Promise.resolve(respuesta)
      },
    }),
  ),
}))

import { MAXIMO_DE_PAGINA_DE_COTIZACIONES } from '../../entities/listado/listado'
import { getListadoDeCotizaciones } from './listado'

const ORIGEN = '00000000-0000-4000-8000-0000000000aa'
const VEHICULO = '00000000-0000-4000-8000-0000000000bb'
// Un instante con microsegundos: pasarlo por `Date` lo dejaría en milisegundos y la página siguiente repetiría o saltearía filas.
const INSTANTE = '2026-03-01T12:00:00.123456+00:00'

const fila = (i: number, extra: Record<string, unknown> = {}) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  numero: 1000 + i,
  origen_id: ORIGEN,
  lead_id: null,
  vehiculo_id: null,
  creado_por: '00000000-0000-4000-8000-0000000000cc',
  clase: 'preventa',
  estado: 'activa',
  titulo: null,
  total_base: 1234.5,
  moneda_mostrar: null,
  creado_en: `2026-03-01T12:00:${String(59 - i).padStart(2, '0')}.000001+00:00`,
  vence_el: '2026-03-08',
  vencida: false,
  ...extra,
})

describe('getListadoDeCotizaciones: lo que le pide a la base', () => {
  beforeEach(() => {
    llamadas.length = 0
    respuesta = { data: [], error: null }
  })

  it('sin cursor ni filtros pasa el tamaño y nada más (un filtro vacío no se manda: la base lo toma nulo)', async () => {
    await getListadoDeCotizaciones({ cursor: null, tamano: 25 })
    expect(llamadas).toHaveLength(1)
    expect(llamadas[0]?.[0]).toBe('cotizaciones_listado')
    const argumentos = llamadas[0]?.[1] as Record<string, unknown>
    expect(
      Object.fromEntries(Object.entries(argumentos).filter(([, v]) => v !== undefined)),
    ).toEqual({
      p_tamano: 25,
      p_mias: false,
      p_hacia_atras: false,
    })
  })

  it('pasa los filtros y el cursor con el instante como texto, sin perder los microsegundos', async () => {
    await getListadoDeCotizaciones({
      origenId: ORIGEN,
      clase: 'final',
      mias: true,
      vehiculoId: VEHICULO,
      cursor: { instante: INSTANTE, id: ORIGEN, sentido: 'anterior' },
      tamano: 10,
    })
    expect(llamadas[0]?.[1]).toEqual({
      p_tamano: 10,
      p_origen: ORIGEN,
      p_clase: 'final',
      p_mias: true,
      p_vehiculo: VEHICULO,
      p_cursor_en: INSTANTE,
      p_cursor_id: ORIGEN,
      p_hacia_atras: true,
    })
  })

  it('un id, una clase o un tamaño inválidos no llegan a la base', async () => {
    const pedidos = [
      { origenId: 'uno', cursor: null, tamano: 10 },
      { vehiculoId: 'dos', cursor: null, tamano: 10 },
      { clase: 'otra' as 'final', cursor: null, tamano: 10 },
      { cursor: null, tamano: 0 },
      { cursor: null, tamano: MAXIMO_DE_PAGINA_DE_COTIZACIONES + 1 },
      { cursor: { instante: INSTANTE, id: 'tres', sentido: 'siguiente' as const }, tamano: 10 },
    ]
    for (const pedido of pedidos) {
      const r = await getListadoDeCotizaciones(pedido)
      expect(r.ok, JSON.stringify(pedido)).toBe(false)
      if (!r.ok) expect(r.error.codigo).toBe('validacion')
    }
    expect(llamadas).toEqual([])
  })
})

describe('getListadoDeCotizaciones: lo que devuelve', () => {
  beforeEach(() => {
    llamadas.length = 0
    respuesta = { data: [], error: null }
  })

  it('arma la página hacia adelante: con una de más hay siguiente, y las filas en camelCase', async () => {
    respuesta = { data: [fila(1), fila(2), fila(3)], error: null }
    const r = await getListadoDeCotizaciones({ cursor: null, tamano: 2 })
    if (!r.ok) throw new Error(r.error.mensaje)
    expect(r.data.filas.map((f) => f.numero)).toEqual([1001, 1002])
    expect(r.data.filas[0]).toEqual({
      id: fila(1).id,
      numero: 1001,
      origenId: ORIGEN,
      leadId: null,
      vehiculoId: null,
      creadoPor: fila(1).creado_por,
      clase: 'preventa',
      estado: 'activa',
      titulo: null,
      totalBase: 1234.5,
      monedaMostrar: null,
      creadoEn: fila(1).creado_en,
      venceEl: '2026-03-08',
      vencida: false,
    })
    expect(r.data.anterior).toBeNull()
    expect(leerCursor(r.data.siguiente)).toEqual({
      instante: fila(2).creado_en,
      id: fila(2).id,
      sentido: 'siguiente',
    })
  })

  it('arma la página hacia atrás: la base la manda al revés y se da vuelta', async () => {
    respuesta = { data: [fila(3), fila(2), fila(1)], error: null }
    const r = await getListadoDeCotizaciones({
      cursor: { instante: fila(4).creado_en, id: fila(4).id, sentido: 'anterior' },
      tamano: 2,
    })
    if (!r.ok) throw new Error(r.error.mensaje)
    expect(r.data.filas.map((f) => f.numero)).toEqual([1002, 1003])
    expect(r.data.anterior).not.toBeNull()
    expect(r.data.siguiente).not.toBeNull()
  })

  it('una fila que no es la que la base promete es un fallo, no una excepción', async () => {
    respuesta = { data: [fila(1, { total_base: 'mucho' })], error: null }
    const r = await getListadoDeCotizaciones({ cursor: null, tamano: 10 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.codigo).toBe('inesperado')
  })

  it('un error de la base vuelve como valor', async () => {
    respuesta = { data: null, error: { code: '42501', message: 'Sin permiso.' } }
    const r = await getListadoDeCotizaciones({ cursor: null, tamano: 10 })
    expect(r.ok).toBe(false)
  })
})
