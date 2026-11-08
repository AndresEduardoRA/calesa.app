import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import {
  MOTIVO_SIN_PERMISO_DE_TABLA,
  type PedidoDePublicarTabla,
  type PublicacionDeTabla,
} from '../../../entities/tablas/publicacion'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const OTRO_ORIGEN = '44444444-4444-4444-8444-444444444444'
const TABLA = '22222222-2222-4222-8222-222222222222'
const PERSONA = '55555555-5555-4555-8555-555555555555'

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  pedidos: [] as PedidoDePublicarTabla[],
  respuesta: null as ResultadoDeAccion<PublicacionDeTabla> | null,
  cache: {
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    updateTag: vi.fn(),
    refresh: vi.fn(),
  },
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
vi.mock('../../../areas/tablas/composicion', () => ({
  repositorioDeTablas: {
    publicar: (pedido: PedidoDePublicarTabla) => {
      h.pedidos.push(pedido)
      return Promise.resolve(h.respuesta)
    },
  },
}))

const { publicarTabla } = await import('./publicar-tabla')

const pedido = {
  tablaId: TABLA,
  origenId: ORIGEN as string | null,
  filas: [{ monto: 1 }, { monto: 2, nombre: 'x' }] as Record<string, number | string>[],
  nota: ' precios de noviembre ',
  versionEsperada: 3,
}
const configura = (origenId: string) => [
  { clave: 'cotizaciones.configurar', origen_id: origenId, alcance: 'todos' as const },
]

beforeEach(() => {
  h.permisos = configura(ORIGEN)
  h.pedidos.length = 0
  h.respuesta = { ok: true, data: { version: 4, formulas: [] } }
  for (const espia of Object.values(h.cache)) {
    espia.mockClear()
  }
})

describe('publicarTabla', () => {
  it('sin cotizaciones.configurar del origen no llama a la base', async () => {
    h.permisos = configura(OTRO_ORIGEN)
    const respuesta = await publicarTabla(pedido)
    expect(respuesta.data).toEqual({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: MOTIVO_SIN_PERMISO_DE_TABLA },
    })
    expect(h.pedidos).toEqual([])
  })

  it('una compartida con el permiso en otro origen sí llama (la base pide el de cada origen)', async () => {
    h.permisos = configura(OTRO_ORIGEN)
    await publicarTabla({ ...pedido, origenId: null })
    expect(h.pedidos).toHaveLength(1)
  })

  it('entra: manda las filas en su orden y la nota recortada, y revalida la pestaña', async () => {
    const respuesta = await publicarTabla(pedido)
    expect(h.pedidos).toEqual([{ ...pedido, nota: 'precios de noviembre' }])
    expect(respuesta.data).toEqual({ ok: true, data: { version: 4, formulas: [] } })
    expect(h.cache.revalidatePath).toHaveBeenCalledWith(RUTAS.configuracionDeCotizacion)
  })

  it('con un conflicto no revalida y devuelve el mensaje de la base', async () => {
    h.respuesta = {
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Ana publicó la versión 4.' },
    }
    const respuesta = await publicarTabla(pedido)
    expect(respuesta.data).toEqual(h.respuesta)
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
  })
})
