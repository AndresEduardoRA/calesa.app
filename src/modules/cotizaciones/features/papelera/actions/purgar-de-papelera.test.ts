import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoDePurgar } from '../../../entities/papelera/resultados'
import type { Resultado } from '@/shared/lib/errores'

const LOTE = '11111111-1111-4111-8111-111111111111'
const COTIZACION = '22222222-2222-4222-8222-222222222222'
const PERSONA = '55555555-5555-4555-8555-555555555555'

type Pedido = { loteId: string; actualizadoEnEsperado: string; cotizaciones?: readonly string[] }

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  pedidos: [] as Pedido[],
  respuesta: null as Resultado<ResultadoDePurgar> | null,
  cache: { revalidatePath: vi.fn(), revalidateTag: vi.fn() },
}))

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => h.cache)
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getClaims: () => Promise.resolve({ data: { claims: { sub: PERSONA } } }) },
      rpc: (nombre: string) =>
        Promise.resolve(
          nombre === 'mis_permisos'
            ? { data: h.permisos, error: null }
            : { data: null, error: { message: `rpc inesperada: ${nombre}` } },
        ),
    }),
}))
vi.mock('../../../areas/papelera/composicion', () => ({
  repositorioDePapeleraDeCotizaciones: {
    purgar: (pedido: Pedido) => {
      h.pedidos.push(pedido)
      return Promise.resolve(h.respuesta)
    },
  },
}))

const { purgarCotizacionesDePapelera } = await import('./purgar-de-papelera')

const pedido = {
  loteId: LOTE,
  actualizadoEnEsperado: '2026-11-06T11:00:00.000001+00:00',
  cotizaciones: [COTIZACION],
}
const purgado: ResultadoDePurgar = {
  actualizadoEn: '2026-11-06T12:00:00.000001+00:00',
  purgados: [{ id: COTIZACION, numero: 1, titulo: 'Cotización #1' }],
  bloqueados: [],
  quedan: 0,
}
const conLaClave = [
  { clave: 'cotizaciones.papelera.purgar', origen_id: null, alcance: 'todos' as const },
]

beforeEach(() => {
  h.permisos = conLaClave
  h.pedidos.length = 0
  h.respuesta = { ok: true, data: purgado }
  h.cache.revalidatePath.mockClear()
  h.cache.revalidateTag.mockClear()
})

describe('purgarCotizacionesDePapelera', () => {
  it('sin la clave de vaciar la papelera no llama a la base', async () => {
    h.permisos = [
      { clave: 'cotizaciones.editar', origen_id: null, alcance: 'todos' },
      { clave: 'cotizaciones.ver', origen_id: null, alcance: 'todos' },
    ]
    const respuesta = await purgarCotizacionesDePapelera(pedido)
    expect(respuesta.data).toEqual({
      ok: false,
      error: {
        codigo: 'sin_permiso',
        mensaje: 'No tienes permiso para purgar la papelera de cotizaciones.',
      },
    })
    expect(h.pedidos).toEqual([])
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
  })

  it('con la clave: manda el pedido tal cual y revalida /cotizaciones entera', async () => {
    const respuesta = await purgarCotizacionesDePapelera(pedido)
    expect(h.pedidos).toEqual([pedido])
    expect(respuesta.data).toEqual({ ok: true, data: purgado })
    expect(h.cache.revalidatePath).toHaveBeenCalledWith('/cotizaciones', 'layout')
  })

  it('el lote entero va sin lista', async () => {
    await purgarCotizacionesDePapelera({
      loteId: LOTE,
      actualizadoEnEsperado: pedido.actualizadoEnEsperado,
    })
    expect(h.pedidos).toEqual([
      { loteId: LOTE, actualizadoEnEsperado: pedido.actualizadoEnEsperado },
    ])
  })

  it('un error de la base vuelve tal cual y no revalida', async () => {
    h.respuesta = {
      ok: false,
      error: {
        codigo: 'conflicto',
        mensaje: 'Ana cambió este lote de la papelera hace un momento.',
      },
    }
    const respuesta = await purgarCotizacionesDePapelera(pedido)
    expect(respuesta.data).toEqual(h.respuesta)
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
  })

  it('una entrada que no pasa el esquema no llega al repositorio', async () => {
    const respuesta = await purgarCotizacionesDePapelera({ ...pedido, loteId: 'x' })
    expect(respuesta.validationErrors).toBeTruthy()
    expect(h.pedidos).toEqual([])
  })
})
