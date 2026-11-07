import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOTIVO_SIN_PERMISO_DE_PLANTILLA,
  type PedidoDePublicarLaPlantilla,
} from '../../../entities/plantilla/escritura-de-la-plantilla'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const OTRO_ORIGEN = '44444444-4444-4444-8444-444444444444'
const PERSONA = '55555555-5555-4555-8555-555555555555'
const HORA = '2026-11-07T15:00:00.123456+00:00'
const PUBLICADA = '22222222-2222-4222-8222-222222222222'

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  pedidos: [] as PedidoDePublicarLaPlantilla[],
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
    publicar: (pedido: PedidoDePublicarLaPlantilla) => {
      h.pedidos.push(pedido)
      return Promise.resolve(h.respuesta)
    },
  },
}))

const { publicarBorrador } = await import('./publicar-borrador')

const pedido = { origenId: ORIGEN, esperada: HORA, nota: 'Nueva portada' }
const configura = (origenId: string) => [
  { clave: 'cotizaciones.configurar', origen_id: origenId, alcance: 'todos' as const },
]

beforeEach(() => {
  h.permisos = configura(ORIGEN)
  h.pedidos.length = 0
  h.respuesta = { ok: true, data: PUBLICADA }
  h.revalidatePath.mockClear()
})

describe('publicarBorrador', () => {
  it('sin cotizaciones.configurar, o con el de otro origen, no llama al repositorio', async () => {
    for (const permisos of [[], configura(OTRO_ORIGEN)]) {
      h.permisos = permisos
      const respuesta = await publicarBorrador(pedido)
      expect(respuesta.data).toEqual({
        ok: false,
        error: { codigo: 'sin_permiso', mensaje: MOTIVO_SIN_PERMISO_DE_PLANTILLA },
      })
    }
    expect(h.pedidos).toEqual([])
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('con permiso llama con el pedido exacto, devuelve el id y revalida', async () => {
    const respuesta = await publicarBorrador(pedido)
    expect(h.pedidos).toEqual([pedido])
    expect(respuesta.data).toEqual({ ok: true, data: PUBLICADA })
    expect(h.revalidatePath).toHaveBeenCalledWith('/configuracion/cotizacion')
  })

  it('la nota llega sin los espacios de los bordes', async () => {
    await publicarBorrador({ ...pedido, nota: '  Nueva portada  ' })
    expect(h.pedidos[0]?.nota).toBe('Nueva portada')
  })

  it('un conflicto llega tal cual y no revalida', async () => {
    h.respuesta = { ok: false, error: { codigo: 'conflicto', mensaje: 'El borrador ya no está.' } }
    const respuesta = await publicarBorrador(pedido)
    expect(respuesta.data).toEqual(h.respuesta)
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('el campo nota del repositorio llega como porCampo', async () => {
    h.respuesta = {
      ok: false,
      error: { codigo: 'regla', mensaje: 'Publicar pide una nota.' },
      porCampo: { nota: 'Publicar pide una nota.' },
    }
    const respuesta = await publicarBorrador(pedido)
    expect(respuesta.data).toMatchObject({ porCampo: { nota: 'Publicar pide una nota.' } })
  })

  it('sin versión esperada, o con una que no es una hora, no llega al repositorio', async () => {
    for (const esperada of [null, '2026-11-07', '']) {
      const respuesta = await publicarBorrador({ ...pedido, esperada } as never)
      expect(respuesta.validationErrors).toBeDefined()
    }
    expect(h.pedidos).toEqual([])
  })

  it('la nota en blanco, de más de 2.000 caracteres o con un surrogate suelto no llega', async () => {
    for (const nota of ['  ', 'a'.repeat(2001), 'x\uD83D']) {
      const respuesta = await publicarBorrador({ ...pedido, nota })
      expect(respuesta.validationErrors).toBeDefined()
    }
    expect(h.pedidos).toEqual([])
  })
})
