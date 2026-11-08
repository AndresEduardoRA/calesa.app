import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOTIVO_SIN_PERMISO_DE_PLANTILLA,
  type PedidoDeDescartarLaPlantilla,
} from '../../../entities/plantilla/escritura-de-la-plantilla'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const OTRO_ORIGEN = '44444444-4444-4444-8444-444444444444'
const PERSONA = '55555555-5555-4555-8555-555555555555'
const HORA = '2026-11-07T15:00:00.123456+00:00'

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  pedidos: [] as PedidoDeDescartarLaPlantilla[],
  respuesta: null as unknown,
  revalidatePath: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  revalidatePath: h.revalidatePath,
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  refresh: vi.fn(),
}))
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
vi.mock('../../../areas/plantilla/composicion', () => ({
  repositorioDeLaPlantilla: {
    descartar: (pedido: PedidoDeDescartarLaPlantilla) => {
      h.pedidos.push(pedido)
      return Promise.resolve(h.respuesta)
    },
  },
}))

const { descartarBorrador } = await import('./descartar-borrador')

const pedido = { origenId: ORIGEN, esperada: HORA }
const configura = (origenId: string) => [
  { clave: 'cotizaciones.configurar', origen_id: origenId, alcance: 'todos' as const },
]

beforeEach(() => {
  h.permisos = configura(ORIGEN)
  h.pedidos.length = 0
  h.respuesta = { ok: true, data: null }
  h.revalidatePath.mockClear()
})

describe('descartarBorrador', () => {
  it('sin cotizaciones.configurar, o con el de otro origen, no llama al repositorio', async () => {
    for (const permisos of [[], configura(OTRO_ORIGEN)]) {
      h.permisos = permisos
      const respuesta = await descartarBorrador(pedido)
      expect(respuesta.data).toEqual({
        ok: false,
        error: { codigo: 'sin_permiso', mensaje: MOTIVO_SIN_PERMISO_DE_PLANTILLA },
      })
    }
    expect(h.pedidos).toEqual([])
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('con permiso llama con el pedido exacto y revalida', async () => {
    const respuesta = await descartarBorrador(pedido)
    expect(h.pedidos).toEqual([pedido])
    expect(respuesta.data).toEqual({ ok: true, data: null })
    expect(h.revalidatePath).toHaveBeenCalledWith('/configuracion/cotizacion')
  })

  it('un conflicto llega tal cual y no revalida', async () => {
    h.respuesta = { ok: false, error: { codigo: 'conflicto', mensaje: 'El borrador ya no está.' } }
    const respuesta = await descartarBorrador(pedido)
    expect(respuesta.data).toEqual(h.respuesta)
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('sin versión esperada, o con una que no es una hora, no llega al repositorio', async () => {
    for (const esperada of [null, '2026-11-07', '']) {
      const respuesta = await descartarBorrador({ ...pedido, esperada } as never)
      expect(respuesta.validationErrors).toBeDefined()
    }
    expect(h.pedidos).toEqual([])
  })
})
