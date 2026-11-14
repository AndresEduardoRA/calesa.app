import { beforeEach, describe, expect, it, vi } from 'vitest'

const COTIZACION = '22222222-2222-4222-8222-222222222222'
const ANTERIOR = '77777777-7777-4777-8777-777777777777'
const PERSONA = '55555555-5555-4555-8555-555555555555'
const ORIGEN = '11111111-1111-4111-8111-111111111111'
const VERSION = '2026-11-14T10:00:00.123456+00:00'

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
// La escritura real (`infra/aprobada/aprobar.ts`) sobre el cliente simulado: se prueba también qué recibe la RPC.
vi.mock('../../../areas/aprobada/composicion', async () => {
  const { aprobadaSupabase } = await import('../../../infra/aprobada/aprobar')
  return { repositorioDeAprobada: aprobadaSupabase }
})

const { aprobarCotizacion } = await import('./aprobar')

const cotizacion = (id: string, numero: number) => ({ id, numero, actualizado_en: VERSION })

beforeEach(() => {
  h.permisos = [{ clave: 'cotizaciones.aprobar', origen_id: ORIGEN, alcance: 'todos' }]
  h.llamadas.length = 0
  h.respuesta = { data: null, error: null }
  h.cache.revalidatePath.mockClear()
})

describe('aprobarCotizacion', () => {
  it('sin aprobar en ningún origen no llama a la base', async () => {
    h.permisos = [{ clave: 'cotizaciones.final.gestionar', origen_id: null, alcance: 'todos' }]
    const respuesta = await aprobarCotizacion({ id: COTIZACION, actualizadoEn: VERSION })
    expect(respuesta.data).toEqual({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: 'No tienes permiso para aprobar cotizaciones.' },
    })
    expect(h.llamadas).toEqual([])
  })

  it('entra: manda el id y la versión a la RPC, devuelve la anterior y no revalida nada', async () => {
    h.respuesta = {
      data: { cotizacion: cotizacion(COTIZACION, 7), anterior: cotizacion(ANTERIOR, 3) },
      error: null,
    }
    const respuesta = await aprobarCotizacion({ id: COTIZACION, actualizadoEn: VERSION })
    expect(h.llamadas).toEqual([
      {
        nombre: 'cotizacion_aprobar',
        args: { p_cotizacion: COTIZACION, p_actualizado_en_esperado: VERSION },
      },
    ])
    expect(respuesta.data).toEqual({
      ok: true,
      data: {
        cotizacion: { id: COTIZACION, numero: 7, actualizadoEn: VERSION },
        anterior: { id: ANTERIOR, numero: 3, actualizadoEn: VERSION },
      },
    })
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
    expect(h.cache.revalidateTag).not.toHaveBeenCalled()
  })

  it('una respuesta que no se entiende es un error, no un éxito inventado', async () => {
    h.respuesta = { data: { cotizacion: null }, error: null }
    const respuesta = await aprobarCotizacion({ id: COTIZACION, actualizadoEn: VERSION })
    expect(respuesta.data).toMatchObject({ ok: false, error: { codigo: 'inesperado' } })
  })

  it('un conflicto vuelve con el texto de la base', async () => {
    h.respuesta = {
      data: null,
      error: { code: 'PT409', message: 'Ana cambió esta cotización hace 2 minutos.' },
    }
    const respuesta = await aprobarCotizacion({ id: COTIZACION, actualizadoEn: VERSION })
    expect(respuesta.data).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Ana cambió esta cotización hace 2 minutos.' },
    })
  })

  it('una regla (sin vehículo) vuelve con el texto de la base', async () => {
    h.respuesta = {
      data: null,
      error: { code: '22023', message: 'Para aprobarla, asígnale un vehículo.' },
    }
    const respuesta = await aprobarCotizacion({ id: COTIZACION, actualizadoEn: VERSION })
    expect(respuesta.data).toMatchObject({
      ok: false,
      error: { mensaje: 'Para aprobarla, asígnale un vehículo.' },
    })
  })

  it('un id que no es guid, o sin versión, no llega a la base', async () => {
    expect(
      (await aprobarCotizacion({ id: 'no-es-un-id', actualizadoEn: VERSION })).validationErrors,
    ).toBeTruthy()
    expect(
      (await aprobarCotizacion({ id: COTIZACION, actualizadoEn: '' })).validationErrors,
    ).toBeTruthy()
    expect(
      (await aprobarCotizacion({ id: COTIZACION, actualizadoEn: 'ayer' })).validationErrors,
    ).toBeTruthy()
    expect(h.llamadas).toEqual([])
  })
})
