import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PedidoDeGuardarLaPlantilla } from '../../../entities/plantilla/escritura-de-la-plantilla'
import { MOTIVO_SIN_PERMISO_DE_PLANTILLA } from '../../../entities/plantilla/escritura-de-la-plantilla'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const OTRO_ORIGEN = '44444444-4444-4444-8444-444444444444'
const PERSONA = '55555555-5555-4555-8555-555555555555'
const HORA = '2026-11-07T15:00:00.123456+00:00'
const NUEVA = '2026-11-07T15:05:00.654321+00:00'

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  pedidos: [] as PedidoDeGuardarLaPlantilla[],
  respuesta: null as unknown,
  revalidatePath: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  revalidatePath: h.revalidatePath,
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  refresh: vi.fn(),
}))
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
vi.mock('../../../areas/plantilla/composicion', () => ({
  repositorioDeLaPlantilla: {
    guardar: (pedido: PedidoDeGuardarLaPlantilla) => {
      h.pedidos.push(pedido)
      return Promise.resolve(h.respuesta)
    },
  },
}))

const { guardarBorrador } = await import('./guardar-borrador')

const definicion = { grupos: [{ grupo: 'compra' }], logo: true }
const pedido = { origenId: ORIGEN, esperada: HORA, definicion }
const configura = (origenId: string) => [
  { clave: 'cotizaciones.configurar', origen_id: origenId, alcance: 'todos' as const },
]

beforeEach(() => {
  h.permisos = configura(ORIGEN)
  h.pedidos.length = 0
  h.respuesta = { ok: true, data: NUEVA }
  h.revalidatePath.mockClear()
})

describe('guardarBorrador: el permiso', () => {
  it('sin cotizaciones.configurar, o con el de otro origen, no llama al repositorio', async () => {
    for (const permisos of [[], configura(OTRO_ORIGEN)]) {
      h.permisos = permisos
      const respuesta = await guardarBorrador(pedido)
      expect(respuesta.data).toEqual({
        ok: false,
        error: { codigo: 'sin_permiso', mensaje: MOTIVO_SIN_PERMISO_DE_PLANTILLA },
      })
    }
    expect(h.pedidos).toEqual([])
  })
})

describe('guardarBorrador: lo que entra', () => {
  it('con permiso llama con el pedido exacto, devuelve la hora nueva y revalida', async () => {
    const respuesta = await guardarBorrador(pedido)
    expect(h.pedidos).toEqual([pedido])
    expect(respuesta.data).toEqual({ ok: true, data: NUEVA })
    expect(h.revalidatePath).toHaveBeenCalledWith('/configuracion/cotizacion')
  })

  it('crear el primero: la esperada nula llega nula', async () => {
    await guardarBorrador({ ...pedido, esperada: null })
    expect(h.pedidos[0]?.esperada).toBeNull()
  })

  it('un conflicto llega tal cual, sin porCampo, y no revalida', async () => {
    h.respuesta = { ok: false, error: { codigo: 'conflicto', mensaje: 'El borrador cambió.' } }
    const respuesta = await guardarBorrador(pedido)
    expect(respuesta.data).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'El borrador cambió.' },
    })
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('el porCampo del repositorio llega tal cual', async () => {
    h.respuesta = {
      ok: false,
      error: { codigo: 'regla', mensaje: 'M' },
      porCampo: { 'grupos[0].tono': 'M' },
    }
    const respuesta = await guardarBorrador(pedido)
    expect(respuesta.data).toMatchObject({ porCampo: { 'grupos[0].tono': 'M' } })
  })

  it('una entrada que no pasa el esquema no llega al repositorio', async () => {
    const respuesta = await guardarBorrador({ ...pedido, esperada: '2026-11-07' })
    expect(respuesta.validationErrors).toBeDefined()
    expect(h.pedidos).toEqual([])
  })
})

describe('guardarBorrador: el texto que la base no lee', () => {
  const ALTO = '\uD83D'

  it.each([
    ['un surrogate suelto en un valor', { ...definicion, nota: `x${ALTO}` }, 'nota'],
    ['un `\\u0000` en un valor', { ...definicion, nota: 'x\u0000' }, 'nota'],
    ['un surrogate en una clave', { etiquetas: { [`a${ALTO}`]: 'x' } }, 'etiquetas'],
    ['un valor en un arreglo', { grupos: [{ grupo: 'a' }, { tono: 'x\u0000' }] }, 'grupos[1].tono'],
  ])('%s: porCampo con su ruta y el repositorio no se llama', async (_, def, donde) => {
    const respuesta = await guardarBorrador({ ...pedido, definicion: def })
    expect(respuesta.data).toMatchObject({
      ok: false,
      error: { codigo: 'validacion' },
      porCampo: { [donde]: expect.stringContaining(`«${donde}»`) as string },
    })
    expect(h.pedidos).toEqual([])
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('100.000 niveles: porCampo, sin RangeError y sin llamar al repositorio', async () => {
    let hondo: unknown = 'x'
    for (let i = 0; i < 100_000; i++) hondo = [hondo]
    const respuesta = await guardarBorrador({ ...pedido, definicion: hondo })
    expect(respuesta.data).toMatchObject({
      ok: false,
      porCampo: { '[0][0][0][0][0][0][0][0]': expect.any(String) as string },
    })
    expect(h.pedidos).toEqual([])
  })

  it('el mensaje no repite el texto tipeado', async () => {
    const respuesta = await guardarBorrador({ ...pedido, definicion: { nota: 'secreto\u0000' } })
    expect(JSON.stringify(respuesta.data)).not.toContain('secreto')
  })

  it('sin plantilla (undefined) no llama al repositorio', async () => {
    const respuesta = await guardarBorrador({
      origenId: ORIGEN,
      esperada: HORA,
      definicion: undefined,
    })
    expect(respuesta.data).toMatchObject({
      ok: false,
      porCampo: { definicion: expect.any(String) as string },
    })
    expect(h.pedidos).toEqual([])
  })

  it('un emoji bien formado pasa', async () => {
    await guardarBorrador({ ...pedido, definicion: { nota: 'hola 😀' } })
    expect(h.pedidos).toHaveLength(1)
  })
})
