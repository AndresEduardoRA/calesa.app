import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { PublicacionDeGuia } from '../../../../entities/contenido/repositorios'

const PERSONA = '55555555-5555-4555-8555-555555555555'
const GUIA = '11111111-1111-4111-8111-111111111111'
const VERSION = '2026-11-12T05:00:00.000001+00:00'

type Concesion = { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }
const concede = (clave: string): Concesion => ({ clave, origen_id: null, alcance: 'todos' })

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  guardados: [] as unknown[],
  respuesta: null as ResultadoDeAccion<{ actualizadoEn: string }> | null,
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
  escribirGuias: {
    guardar: (pedido: unknown) => {
      h.guardados.push(pedido)
      return Promise.resolve(h.respuesta)
    },
  },
}))

const { guardarGuia } = await import('./guardar-guia')

const CUERPO = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hola' }] }],
}
const entrada = (publicacion: PublicacionDeGuia) => ({
  id: GUIA,
  actualizadoEnEsperado: VERSION,
  titulo: 'Cómo importar un auto',
  slug: 'como-importar-un-auto',
  resumen: '',
  categoriaId: null,
  autorId: null,
  portadaRuta: null,
  seoTitulo: '',
  seoDescripcion: '',
  cuerpoDoc: CUERPO,
  publicacion,
})

beforeEach(() => {
  h.permisos = []
  h.guardados = []
  h.respuesta = { ok: true, data: { actualizadoEn: VERSION } }
  vi.clearAllMocks()
})

describe('guardarGuia: permisos antes de escribir', () => {
  it('sin web.contenido.gestionar no llama a la base', async () => {
    const respuesta = await guardarGuia(entrada({ tipo: 'mantener' }))
    expect(respuesta.data).toMatchObject({ ok: false, error: { codigo: 'sin_permiso' } })
    expect(h.guardados).toHaveLength(0)
  })

  it.each<PublicacionDeGuia>([
    { tipo: 'publicar' },
    { tipo: 'programar', cuando: '2027-01-01T12:00:00.000Z' },
    { tipo: 'despublicar' },
  ])(
    'sin web.guias.publicar, %o dice «Tu rol no publica guías.» y no llama a la base',
    async (publicacion) => {
      h.permisos = [concede('web.contenido.gestionar')]
      const respuesta = await guardarGuia(entrada(publicacion))
      expect(respuesta.data).toMatchObject({
        ok: false,
        error: { codigo: 'sin_permiso', mensaje: 'Tu rol no publica guías.' },
      })
      expect(h.guardados).toHaveLength(0)
    },
  )

  it('sin web.guias.publicar, guardar a secas sí guarda', async () => {
    h.permisos = [concede('web.contenido.gestionar')]
    const respuesta = await guardarGuia(entrada({ tipo: 'mantener' }))
    expect(respuesta.data).toEqual({ ok: true, data: { actualizadoEn: VERSION } })
    expect(h.guardados).toHaveLength(1)
  })

  it('con los dos permisos publica, con el documento ya limpio y los vacíos en nulo', async () => {
    h.permisos = [concede('web.contenido.gestionar'), concede('web.guias.publicar')]
    await guardarGuia(entrada({ tipo: 'publicar' }))
    expect(h.guardados[0]).toMatchObject({
      id: GUIA,
      actualizadoEnEsperado: VERSION,
      publicacion: { tipo: 'publicar' },
      campos: { resumen: null, seoTitulo: null, cuerpoDoc: CUERPO },
    })
  })
})

describe('guardarGuia: lo que devuelve la base', () => {
  beforeEach(() => {
    h.permisos = [concede('web.contenido.gestionar')]
  })

  it('un slug repetido llega junto a su campo', async () => {
    h.respuesta = {
      ok: false,
      error: {
        codigo: 'duplicado',
        mensaje: 'Ya hay una guía con esa dirección. Cambia el texto.',
      },
      porCampo: { slug: 'Ya hay una guía con esa dirección. Cambia el texto.' },
    }
    const respuesta = await guardarGuia(entrada({ tipo: 'mantener' }))
    expect(respuesta.data).toMatchObject({ ok: false, porCampo: { slug: expect.any(String) } })
  })

  it('una versión que no coincide es un conflicto', async () => {
    h.respuesta = { ok: false, error: { codigo: 'conflicto', mensaje: 'Cambió.' } }
    const respuesta = await guardarGuia(entrada({ tipo: 'mantener' }))
    expect(respuesta.data).toMatchObject({ ok: false, error: { codigo: 'conflicto' } })
  })

  it('una dirección mal formada no llega a la base', async () => {
    const respuesta = await guardarGuia({ ...entrada({ tipo: 'mantener' }), slug: 'Mal Slug' })
    expect(respuesta.validationErrors?.fieldErrors.slug).toBeDefined()
    expect(h.guardados).toHaveLength(0)
  })
})
