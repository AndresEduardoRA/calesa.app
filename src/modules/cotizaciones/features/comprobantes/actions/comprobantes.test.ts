import { beforeEach, describe, expect, it, vi } from 'vitest'

const COTIZACION = '22222222-2222-4222-8222-222222222222'
const COMPROBANTE = '33333333-3333-4333-8333-333333333333'
const PERSONA = '55555555-5555-4555-8555-555555555555'
const VERSION = '2026-11-08 10:00:00.123456+00'

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
// La escritura real (`infra/comprobantes/escribir.ts`) sobre el cliente simulado: se prueba también qué recibe la RPC.
vi.mock('../../../areas/comprobantes/composicion', async () => {
  const { comprobantesSupabase } = await import('../../../infra/comprobantes/escribir')
  return { repositorioDeComprobantes: comprobantesSupabase }
})

const { emitirComprobante } = await import('./emitir')
const { anularComprobante } = await import('./anular')

const conClave = (clave: string) => [{ clave, origen_id: null, alcance: 'todos' as const }]

beforeEach(() => {
  h.permisos = conClave('cotizaciones.comprobantes.emitir')
  h.llamadas.length = 0
  h.respuesta = { data: null, error: null }
  h.cache.revalidatePath.mockClear()
})

describe('emitirComprobante', () => {
  it('sin la clave no llama a la base (gestionar Empresa no alcanza)', async () => {
    h.permisos = conClave('empresa.ajustes.gestionar')
    const respuesta = await emitirComprobante({
      cotizacionId: COTIZACION,
      cotizacionEsperada: VERSION,
    })
    expect(respuesta.data).toEqual({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: 'No tienes permiso para emitir comprobantes.' },
    })
    expect(h.llamadas).toEqual([])
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
  })

  it('entra: llama a la RPC con el id y la versión, y revalida /cotizaciones', async () => {
    h.respuesta = {
      data: { id: COMPROBANTE, serie: 'A', numero: 7, emitido_en: '2026-11-08T14:00:00+00:00' },
      error: null,
    }
    const respuesta = await emitirComprobante({
      cotizacionId: COTIZACION,
      cotizacionEsperada: VERSION,
    })
    expect(h.llamadas).toEqual([
      {
        nombre: 'comprobante_emitir',
        args: { p_cotizacion: COTIZACION, p_cotizacion_esperada: VERSION },
      },
    ])
    expect(respuesta.data).toEqual({
      ok: true,
      data: { id: COMPROBANTE, serie: 'A', numero: 7, emitidoEn: '2026-11-08T14:00:00+00:00' },
    })
    expect(h.cache.revalidatePath).toHaveBeenCalledWith('/cotizaciones', 'layout')
  })

  it('un vigente colado vuelve como conflicto con el texto de la base y no revalida', async () => {
    const mensaje =
      'Esta cotización ya tiene el comprobante «A-6» vigente: anúlalo para emitir otro.'
    h.respuesta = { data: null, error: { code: 'PT409', message: mensaje } }
    const respuesta = await emitirComprobante({
      cotizacionId: COTIZACION,
      cotizacionEsperada: VERSION,
    })
    expect(respuesta.data).toEqual({ ok: false, error: { codigo: 'conflicto', mensaje } })
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
  })

  it('un id que no es guid no llega a la base', async () => {
    const respuesta = await emitirComprobante({
      cotizacionId: 'no-es-un-id',
      cotizacionEsperada: VERSION,
    })
    expect(respuesta.validationErrors).toBeTruthy()
    expect(h.llamadas).toEqual([])
  })
})

describe('anularComprobante', () => {
  it('sin la clave no llama a la base', async () => {
    h.permisos = conClave('cotizaciones.final.gestionar')
    const respuesta = await anularComprobante({ comprobanteId: COMPROBANTE, motivo: 'Error' })
    expect(respuesta.data).toEqual({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: 'No tienes permiso para anular comprobantes.' },
    })
    expect(h.llamadas).toEqual([])
  })

  it('entra: llama a la RPC con el id y el motivo sin espacios a los lados', async () => {
    h.respuesta = {
      data: { id: COMPROBANTE, anulado_en: '2026-11-08T15:00:00+00:00' },
      error: null,
    }
    const respuesta = await anularComprobante({
      comprobanteId: COMPROBANTE,
      motivo: '  Se cargó mal el precio  ',
    })
    expect(h.llamadas).toEqual([
      {
        nombre: 'comprobante_anular',
        args: { p_comprobante: COMPROBANTE, p_motivo: 'Se cargó mal el precio' },
      },
    ])
    expect(respuesta.data).toEqual({
      ok: true,
      data: { id: COMPROBANTE, anuladoEn: '2026-11-08T15:00:00+00:00' },
    })
  })

  it('un motivo vacío no llega a la base', async () => {
    const respuesta = await anularComprobante({ comprobanteId: COMPROBANTE, motivo: '   ' })
    expect(respuesta.validationErrors).toBeTruthy()
    expect(h.llamadas).toEqual([])
  })
})
