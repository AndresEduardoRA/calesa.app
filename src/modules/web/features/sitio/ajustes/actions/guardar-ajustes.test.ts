import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CambiosDeAjustes } from '../../../../entities/sitio/ajustes'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'

const PERSONA = '55555555-5555-4555-8555-555555555555'
const COREA = '11111111-1111-4111-8111-111111111111'

type Pedido = { cambios: CambiosDeAjustes; actualizadoEnEsperado: string }

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  pedidos: [] as Pedido[],
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
vi.mock('../../../../areas/sitio/composicion', () => ({
  guardarAjustesDelSitio: (pedido: Pedido) => {
    h.pedidos.push(pedido)
    return Promise.resolve(h.respuesta)
  },
}))

const { guardarAjustesDelSitio } = await import('./guardar-ajustes')

const VERSION = '2026-11-12T05:00:00.000001+00:00'
const entrada = {
  nombreSitio: 'Autos del Sur',
  lema: 'Del puerto a tu casa',
  direccionPublica: 'https://autosdelsur.bo',
  whatsappRespaldo: '',
  horario: '',
  facebook: '',
  instagram: 'https://instagram.com/autosdelsur',
  tiktok: '',
  youtube: '',
  x: '',
  linkedin: '',
  seoTitulo: '',
  seoDescripcion: '',
  mostrarMonedaSecundaria: false,
  origenesVisibles: [COREA],
  actualizadoEnEsperado: VERSION,
}
const sinPermiso = {
  ok: false,
  error: {
    codigo: 'sin_permiso',
    mensaje: 'No tienes permiso para cambiar los ajustes de la web.',
  },
}

beforeEach(() => {
  h.permisos = [{ clave: 'web.ajustes.gestionar', origen_id: null, alcance: 'todos' }]
  h.pedidos.length = 0
  h.respuesta = { ok: true, data: { actualizadoEn: '2026-11-12T06:00:00.000001+00:00' } }
  h.cache.revalidatePath.mockClear()
})

describe('guardarAjustesDelSitio', () => {
  it.each(['web.contenido.gestionar', 'web.cola.gestionar'])(
    'con %s y sin web.ajustes.gestionar no llama a la base',
    async (clave) => {
      h.permisos = [{ clave, origen_id: null, alcance: 'todos' }]
      const respuesta = await guardarAjustesDelSitio(entrada)
      expect(respuesta.data).toEqual(sinPermiso)
      expect(h.pedidos).toEqual([])
      expect(h.cache.revalidatePath).not.toHaveBeenCalled()
    },
  )

  it('con la clave manda la versión tal cual y sólo las claves del sitio, y revalida la pantalla', async () => {
    const respuesta = await guardarAjustesDelSitio({
      ...entrada,
      legales: { terminos: {} },
      cola_activa: false,
    } as typeof entrada)
    expect(h.pedidos).toHaveLength(1)
    const [pedido] = h.pedidos
    expect(pedido?.actualizadoEnEsperado).toBe(VERSION)
    expect(Object.keys(pedido?.cambios ?? {}).sort()).toEqual(
      [
        'direccion_publica',
        'horario',
        'lema',
        'mostrar_moneda_secundaria',
        'nombre_sitio',
        'origenes_visibles',
        'redes',
        'seo',
        'whatsapp_respaldo',
      ].sort(),
    )
    expect(pedido?.cambios.redes).toEqual({ instagram: 'https://instagram.com/autosdelsur' })
    expect(respuesta.data).toEqual(h.respuesta)
    expect(h.cache.revalidatePath).toHaveBeenCalledWith('/configuracion/web')
  })

  it('un error de la base con su campo vuelve igual y no revalida', async () => {
    h.respuesta = {
      ok: false,
      error: { codigo: 'regla', mensaje: 'La dirección pública empieza con https://.' },
      porCampo: { direccionPublica: 'La dirección pública empieza con https://.' },
    }
    const respuesta = await guardarAjustesDelSitio(entrada)
    expect(respuesta.data).toEqual(h.respuesta)
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
  })
})
