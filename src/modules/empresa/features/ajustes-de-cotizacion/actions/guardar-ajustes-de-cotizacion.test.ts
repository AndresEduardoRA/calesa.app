import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'

const PERSONA = '55555555-5555-4555-8555-555555555555'
const USA = '11111111-1111-4111-8111-111111111111'

type Pedido = {
  vigenciaDias: number
  vehiculoObligatorioAlCotizar: boolean
  actualizadoEnEsperado: string
}

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  pedidos: [] as Pedido[],
  respuesta: null as Resultado<{ actualizadoEn: string }> | null,
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
vi.mock('../../../composicion', () => ({
  repositorioAjustesDeCotizacion: {
    guardar: (pedido: Pedido) => {
      h.pedidos.push(pedido)
      return Promise.resolve(h.respuesta)
    },
  },
}))

const { guardarAjustesDeCotizacion } = await import('./guardar-ajustes-de-cotizacion')

const pedido = {
  vigenciaDias: 30,
  vehiculoObligatorioAlCotizar: false,
  actualizadoEnEsperado: '2026-11-08T05:00:00.000001+00:00',
}
const sinPermiso = {
  ok: false,
  error: {
    codigo: 'sin_permiso',
    mensaje: 'Cambiar estos ajustes pide configurar el cotizador en todos los orígenes.',
  },
}

beforeEach(() => {
  h.permisos = [{ clave: 'cotizaciones.configurar', origen_id: null, alcance: 'todos' }]
  h.pedidos.length = 0
  h.respuesta = { ok: true, data: { actualizadoEn: '2026-11-08T06:00:00.000001+00:00' } }
  h.cache.revalidatePath.mockClear()
})

describe('guardarAjustesDeCotizacion', () => {
  it('con cotizaciones.configurar en un solo origen no llama a la base', async () => {
    h.permisos = [{ clave: 'cotizaciones.configurar', origen_id: USA, alcance: 'todos' }]
    const respuesta = await guardarAjustesDeCotizacion(pedido)
    expect(respuesta.data).toEqual(sinPermiso)
    expect(h.pedidos).toEqual([])
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
  })

  it('sin la clave, aunque gestione los ajustes de la empresa, no llama a la base', async () => {
    h.permisos = [{ clave: 'empresa.ajustes.gestionar', origen_id: null, alcance: 'todos' }]
    const respuesta = await guardarAjustesDeCotizacion(pedido)
    expect(respuesta.data).toEqual(sinPermiso)
    expect(h.pedidos).toEqual([])
  })

  it('con la clave sin origen manda sólo las tres claves y revalida las dos pantallas de la fila', async () => {
    const respuesta = await guardarAjustesDeCotizacion({ ...pedido, otra: 'x' } as typeof pedido)
    expect(h.pedidos).toHaveLength(1)
    expect(h.pedidos[0]).toStrictEqual(pedido)
    expect(respuesta.data).toEqual(h.respuesta)
    expect(h.cache.revalidatePath).toHaveBeenCalledWith('/configuracion/cotizacion')
    expect(h.cache.revalidatePath).toHaveBeenCalledWith('/configuracion/empresa')
  })

  it('un conflicto de la base vuelve tal cual y no revalida', async () => {
    h.respuesta = {
      ok: false,
      error: {
        codigo: 'conflicto',
        mensaje: 'Otra persona cambió los ajustes de la empresa mientras los editabas.',
      },
    }
    const respuesta = await guardarAjustesDeCotizacion(pedido)
    expect(respuesta.data).toEqual(h.respuesta)
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
  })

  it('una vigencia fuera de 1 a 365 no llega al repositorio', async () => {
    const respuesta = await guardarAjustesDeCotizacion({ ...pedido, vigenciaDias: 366 })
    expect(respuesta.validationErrors).toBeTruthy()
    expect(h.pedidos).toEqual([])
  })
})
