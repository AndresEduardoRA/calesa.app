import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import { MOTIVO_SIN_PERMISO_DE_TONOS, coloresDeUnTonoNuevo } from '../../../entities/diseno/tonos'

const ID = '11111111-1111-4111-8111-111111111111'
const PERSONA = '55555555-5555-4555-8555-555555555555'
const HORA = '2026-11-08T10:00:00.123456+00:00'

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  llamadas: [] as { que: string; pedido: unknown }[],
  respuesta: null as Resultado<unknown> | { ok: false; error: unknown; campo?: string } | null,
  revalidatePath: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))
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
vi.mock('../../../areas/diseno/composicion', () => {
  const llamar = (que: string) => (pedido: unknown) => {
    h.llamadas.push({ que, pedido })
    return Promise.resolve(h.respuesta)
  }
  return {
    repositorioDeTonos: {
      crear: llamar('crear'),
      guardar: llamar('guardar'),
      eliminar: llamar('eliminar'),
    },
  }
})

const { crearTono } = await import('./crear-tono')
const { guardarTono } = await import('./guardar-tono')
const { eliminarTono } = await import('./eliminar-tono')

const colores = coloresDeUnTonoNuevo()
const lista = { id: ID, actualizadoEn: HORA, repetido: false, lista: { tope: 24, tonos: [] } }
const configura = [{ clave: 'cotizaciones.configurar', origen_id: null, alcance: 'todos' as const }]

const pedidos = {
  crear: () => crearTono({ id: ID, nombre: 'Dorado', colores }),
  guardar: () => guardarTono({ id: ID, actualizadoEnEsperado: HORA, cambios: { nombre: 'Oro' } }),
  eliminar: () => eliminarTono({ id: ID, actualizadoEnEsperado: HORA }),
}

beforeEach(() => {
  h.permisos = configura
  h.llamadas.length = 0
  h.respuesta = { ok: true, data: lista }
  h.revalidatePath.mockClear()
})

describe('las actions del catálogo de tonos', () => {
  it('T4 · sin cotizaciones.configurar ninguna llama al repositorio ni revalida', async () => {
    h.permisos = [{ clave: 'cotizaciones.ver', origen_id: null, alcance: 'todos' }]
    for (const pedir of Object.values(pedidos)) {
      const respuesta = await pedir()
      expect(respuesta.data).toEqual({
        ok: false,
        error: { codigo: 'sin_permiso', mensaje: MOTIVO_SIN_PERMISO_DE_TONOS },
      })
    }
    expect(h.llamadas).toEqual([])
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('T4 · con el permiso llaman con el pedido tal cual y revalidan sólo si entró', async () => {
    for (const [que, pedir] of Object.entries(pedidos)) {
      h.llamadas.length = 0
      h.revalidatePath.mockClear()
      h.respuesta = { ok: true, data: lista }
      expect((await pedir()).data).toEqual({ ok: true, data: lista })
      expect(h.llamadas.map((l) => l.que)).toEqual([que])
      expect(h.revalidatePath).toHaveBeenCalledTimes(1)

      h.revalidatePath.mockClear()
      h.respuesta = { ok: false, error: { codigo: 'conflicto', mensaje: 'Cambió.' } }
      expect((await pedir()).data).toEqual(h.respuesta)
      expect(h.revalidatePath).not.toHaveBeenCalled()
    }
  })

  it('T4 · el motivo de un campo viaja junto a él', async () => {
    h.respuesta = {
      ok: false,
      error: { codigo: 'validacion', mensaje: 'En el tema claro la tinta…' },
      campo: 'claro',
    }
    const respuesta = await pedidos.crear()
    expect(respuesta.data).toEqual({
      ok: false,
      error: { codigo: 'validacion', mensaje: 'En el tema claro la tinta…' },
      porCampo: { claro: 'En el tema claro la tinta…' },
    })
  })

  it('T4 · un id que no es guid y unos cambios con una clave de más se rechazan en Zod', async () => {
    const malos = [
      () => crearTono({ id: 'x', nombre: 'Dorado', colores }),
      () => guardarTono({ id: 'x', actualizadoEnEsperado: HORA, cambios: {} }),
      () =>
        guardarTono({
          id: ID,
          actualizadoEnEsperado: HORA,
          cambios: { clave: 'oro' } as unknown as { nombre: string },
        }),
      () => guardarTono({ id: ID, actualizadoEnEsperado: '', cambios: { nombre: 'Oro' } }),
      () => eliminarTono({ id: 'x', actualizadoEnEsperado: HORA }),
      () => crearTono({ id: ID, nombre: 'Dorado', colores: { claro: colores.claro } as never }),
    ]
    for (const malo of malos) {
      const respuesta = await malo()
      expect(respuesta.data).toBeUndefined()
      expect(respuesta.validationErrors).toBeDefined()
    }
    expect(h.llamadas).toEqual([])
  })
})
