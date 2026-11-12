import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { LegalesDelSitio } from '../../../../entities/contenido/legales'

const PERSONA = '55555555-5555-4555-8555-555555555555'
const VERSION = '2026-11-12T05:00:00.000001+00:00'

type Concesion = { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }
const concede = (clave: string): Concesion => ({ clave, origen_id: null, alcance: 'todos' })

const parrafo = (texto: string) => ({ type: 'paragraph', content: [{ type: 'text', text: texto }] })
const doc = (...content: unknown[]) => ({ type: 'doc', content })
const VACIO = doc({ type: 'paragraph' })

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  guardados: [] as unknown[],
  respuesta: null as ResultadoDeAccion<{ actualizadoEn: string }> | null,
  legales: null as unknown,
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
vi.mock('../../../../areas/contenido/composicion', () => ({
  leerLegales: () => Promise.resolve({ ok: true, data: h.legales }),
  escribirLegales: (pedido: unknown) => {
    h.guardados.push(pedido)
    return Promise.resolve(h.respuesta)
  },
}))

const { guardarLegales } = await import('./guardar-legales')

const NINGUNO: LegalesDelSitio = { terminos: null, privacidad: null, actualizadoEn: VERSION }
const entrada = (
  terminos: unknown = doc(parrafo('Pagas al recibir.')),
  privacidad: unknown = VACIO,
) => ({
  actualizadoEnEsperado: VERSION,
  terminos: { titulo: 'Términos y condiciones', doc: terminos },
  privacidad: { titulo: 'Política de privacidad', doc: privacidad },
})

beforeEach(() => {
  h.permisos = []
  h.guardados = []
  h.legales = NINGUNO
  h.respuesta = { ok: true, data: { actualizadoEn: VERSION } }
  vi.clearAllMocks()
})

describe('guardarLegales: permisos antes de escribir', () => {
  it('sin web.ajustes.gestionar, aun con web.contenido.gestionar, no llama a la base', async () => {
    h.permisos = [concede('web.contenido.gestionar')]
    const respuesta = await guardarLegales(entrada())
    expect(respuesta.data).toMatchObject({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: 'No tienes permiso para cambiar los legales.' },
    })
    expect(h.guardados).toHaveLength(0)
  })

  it('con el permiso manda sólo la clave de los legales con texto, y sólo ellos', async () => {
    h.permisos = [concede('web.ajustes.gestionar')]
    const respuesta = await guardarLegales(entrada())
    expect(respuesta.data).toEqual({ ok: true, data: { actualizadoEn: VERSION } })
    expect(h.guardados).toHaveLength(1)
    const pedido = h.guardados[0] as {
      cambios: Record<string, unknown>
      actualizadoEnEsperado: string
    }
    expect(pedido.actualizadoEnEsperado).toBe(VERSION)
    expect(Object.keys(pedido.cambios)).toEqual(['terminos'])
    expect(h.cache.revalidatePath).toHaveBeenCalledTimes(1)
  })
})

describe('guardarLegales: lo que no llega a la base', () => {
  beforeEach(() => {
    h.permisos = [concede('web.ajustes.gestionar')]
  })

  it('un legal ya guardado al que se le vació el texto vuelve por campo sin llamar a la base', async () => {
    h.legales = {
      ...NINGUNO,
      terminos: { titulo: 'T', doc: doc(parrafo('Antes.')), actualizadoEn: VERSION },
    }
    const respuesta = await guardarLegales(entrada(VACIO))
    expect(respuesta.data).toMatchObject({
      ok: false,
      porCampo: { terminos: 'Escribe el texto de los términos.' },
    })
    expect(h.guardados).toHaveLength(0)
  })

  it('una versión que no coincide llega como conflicto', async () => {
    h.respuesta = { ok: false, error: { codigo: 'conflicto', mensaje: 'Cambió.' } }
    const respuesta = await guardarLegales(entrada())
    expect(respuesta.data).toMatchObject({ ok: false, error: { codigo: 'conflicto' } })
  })
})
