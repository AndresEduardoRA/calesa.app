import { beforeEach, describe, expect, it, vi } from 'vitest'

const COTIZACION = '22222222-2222-4222-8222-222222222222'
const LOTE = '11111111-1111-4111-8111-111111111111'
const PERSONA = '55555555-5555-4555-8555-555555555555'
const VERSION = '2026-11-07T11:00:00.000001+00:00'

type Llamada = { nombre: string; args: unknown }

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  llamadas: [] as Llamada[],
  respuesta: { data: null as unknown, error: null as unknown },
  cache: { revalidatePath: vi.fn(), revalidateTag: vi.fn() },
}))

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => h.cache)
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getClaims: () => Promise.resolve({ data: { claims: { sub: PERSONA } } }) },
      rpc: (nombre: string, args: unknown) => {
        if (nombre === 'mis_permisos') {
          return Promise.resolve({ data: h.permisos, error: null })
        }
        h.llamadas.push({ nombre, args })
        return Promise.resolve(h.respuesta)
      },
    }),
}))
// La escritura real (`infra/papelera/escribir.ts`) sobre el cliente simulado: se prueba también qué recibe la RPC.
vi.mock('../../../areas/papelera/composicion', async () => {
  const { papeleraDeCotizacionesSupabase } = await import('../../../infra/papelera/escribir')
  return { repositorioDePapeleraDeCotizaciones: papeleraDeCotizacionesSupabase }
})

const { enviarCotizacionesAPapelera } = await import('./enviar-a-papelera')

const pedido = { cotizaciones: [{ id: COTIZACION, actualizadoEn: VERSION }] }
const enviada = {
  lote: LOTE,
  actualizado_en: '2026-11-07T12:00:00.000001+00:00',
  enviados: [{ id: COTIZACION, numero: 4, titulo: null }],
  rechazados: [],
}

beforeEach(() => {
  h.permisos = [{ clave: 'cotizaciones.editar', origen_id: null, alcance: 'propios' }]
  h.llamadas.length = 0
  h.respuesta = { data: enviada, error: null }
  h.cache.revalidatePath.mockClear()
  h.cache.revalidateTag.mockClear()
})

describe('enviarCotizacionesAPapelera', () => {
  it('sin editar, moderar ni gestionar finales no llama a la base', async () => {
    h.permisos = [
      { clave: 'cotizaciones.ver', origen_id: null, alcance: 'todos' },
      { clave: 'cotizaciones.papelera.purgar', origen_id: null, alcance: 'todos' },
    ]
    const respuesta = await enviarCotizacionesAPapelera(pedido)
    expect(respuesta.data).toEqual({
      ok: false,
      error: {
        codigo: 'sin_permiso',
        mensaje: 'No tienes permiso para enviar cotizaciones a la papelera.',
      },
    })
    expect(h.llamadas).toEqual([])
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
  })

  it('con editar «propios»: manda la versión tal cual y revalida /cotizaciones entera', async () => {
    const respuesta = await enviarCotizacionesAPapelera(pedido)
    expect(h.llamadas).toEqual([
      {
        nombre: 'cotizaciones_papelera_enviar',
        args: { p_cotizaciones: [{ id: COTIZACION, actualizado_en: VERSION }] },
      },
    ])
    expect(respuesta.data).toEqual({
      ok: true,
      data: {
        lote: LOTE,
        actualizadoEn: enviada.actualizado_en,
        enviados: [{ id: COTIZACION, numero: 4, titulo: 'Cotización #4' }],
        rechazados: [],
      },
    })
    expect(h.cache.revalidatePath).toHaveBeenCalledWith('/cotizaciones', 'layout')
  })

  it('todas rechazadas: vuelve el rechazo y no revalida', async () => {
    const rechazo = { id: COTIZACION, titulo: 'X', codigo: 'PT409', motivo: 'Ana la cambió.' }
    h.respuesta = {
      data: { lote: null, actualizado_en: null, enviados: [], rechazados: [rechazo] },
      error: null,
    }
    const respuesta = await enviarCotizacionesAPapelera(pedido)
    expect(respuesta.data).toEqual({
      ok: true,
      data: { lote: null, actualizadoEn: null, enviados: [], rechazados: [rechazo] },
    })
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
  })

  it('un error de la base vuelve como error y no revalida', async () => {
    h.respuesta = { data: null, error: { code: '22023', message: 'No llegó ninguna cotización.' } }
    const respuesta = await enviarCotizacionesAPapelera(pedido)
    expect(respuesta.data?.ok).toBe(false)
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
  })

  it('una respuesta rota es un error inesperado', async () => {
    h.respuesta = { data: { lote: null }, error: null }
    const respuesta = await enviarCotizacionesAPapelera(pedido)
    expect(respuesta.data).toEqual({
      ok: false,
      error: {
        codigo: 'inesperado',
        mensaje: 'No pudimos leer la respuesta. Recarga para ver cómo quedó.',
      },
    })
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
  })

  it('una entrada que no pasa el esquema no llega a la base', async () => {
    const respuesta = await enviarCotizacionesAPapelera({ cotizaciones: [] })
    expect(respuesta.validationErrors).toBeTruthy()
    expect(h.llamadas).toEqual([])
  })
})
