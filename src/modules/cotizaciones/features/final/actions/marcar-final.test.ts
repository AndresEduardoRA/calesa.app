import { beforeEach, describe, expect, it, vi } from 'vitest'

const COTIZACION = '22222222-2222-4222-8222-222222222222'
const PERSONA = '55555555-5555-4555-8555-555555555555'
const ORIGEN = '11111111-1111-4111-8111-111111111111'

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
// La escritura real (`infra/final/marcar.ts`) sobre el cliente simulado: se prueba también qué recibe la RPC.
vi.mock('../../../areas/final/composicion', async () => {
  const { finalSupabase } = await import('../../../infra/final/marcar')
  return { repositorioDeFinal: finalSupabase }
})

const { marcarFinal } = await import('./marcar-final')

beforeEach(() => {
  h.permisos = [{ clave: 'cotizaciones.final.gestionar', origen_id: ORIGEN, alcance: 'todos' }]
  h.llamadas.length = 0
  h.respuesta = { data: null, error: null }
  h.cache.revalidatePath.mockClear()
})

describe('marcarFinal', () => {
  it('sin gestionar finales en ningún origen no llama a la base', async () => {
    h.permisos = [{ clave: 'cotizaciones.editar', origen_id: null, alcance: 'todos' }]
    const respuesta = await marcarFinal({ id: COTIZACION })
    expect(respuesta.data).toEqual({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: 'No tienes permiso para marcar la final.' },
    })
    expect(h.llamadas).toEqual([])
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
  })

  it('entra: llama a la RPC con el id y revalida /cotizaciones entera', async () => {
    const respuesta = await marcarFinal({ id: COTIZACION })
    expect(h.llamadas).toEqual([
      { nombre: 'cotizacion_marcar_final', args: { p_cotizacion: COTIZACION } },
    ])
    expect(respuesta.data).toEqual({ ok: true, data: null })
    expect(h.cache.revalidatePath).toHaveBeenCalledWith('/cotizaciones', 'layout')
  })

  it('un conflicto vuelve con el texto de la base y no revalida', async () => {
    h.respuesta = {
      data: null,
      error: {
        code: 'PT409',
        message: 'La cotización cambió mientras la marcabas. Vuelve a intentarlo.',
      },
    }
    const respuesta = await marcarFinal({ id: COTIZACION })
    expect(respuesta.data).toEqual({
      ok: false,
      error: {
        codigo: 'conflicto',
        mensaje: 'La cotización cambió mientras la marcabas. Vuelve a intentarlo.',
      },
    })
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
  })

  it('una regla vuelve con el texto de la base y no revalida', async () => {
    h.respuesta = {
      data: null,
      error: { code: '23514', message: 'Una final exige vehículo vinculado.' },
    }
    const respuesta = await marcarFinal({ id: COTIZACION })
    expect(respuesta.data).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'Una final exige vehículo vinculado.' },
    })
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
  })

  it('un id que no es guid no llega a la base', async () => {
    const respuesta = await marcarFinal({ id: 'no-es-un-id' })
    expect(respuesta.validationErrors).toBeTruthy()
    expect(h.llamadas).toEqual([])
  })
})
