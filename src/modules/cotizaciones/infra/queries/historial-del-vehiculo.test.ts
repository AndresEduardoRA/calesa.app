import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// Un cliente falso que anota lo que la consulta pide y devuelve lo que se le diga.
const llamadas: [string, ...unknown[]][] = []
let respuesta: { data: unknown; error: unknown } = { data: [], error: null }
const consulta: Record<string, unknown> = {}
for (const nombre of ['select', 'eq', 'order', 'limit', 'lte', 'or', 'gte']) {
  consulta[nombre] = (...args: unknown[]) => {
    llamadas.push([nombre, ...args])
    return nombre === 'limit' ? Promise.resolve(respuesta) : consulta
  }
}
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: (tabla: string) => {
        llamadas.push(['from', tabla])
        return consulta
      },
    }),
  ),
}))

import { contarCotizacionesDelVehiculo } from './historial-del-vehiculo'

const VEHICULO = '00000000-0000-4000-8000-0000000000aa'
const filas = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  }))

describe('contarCotizacionesDelVehiculo: «Cotizado (n)»', () => {
  beforeEach(() => {
    llamadas.length = 0
    respuesta = { data: [], error: null }
  })

  it('filtra por vehículo, ordena por creado_en desc e id desc y pide 21 (nunca un count)', async () => {
    await contarCotizacionesDelVehiculo(VEHICULO)
    expect(llamadas).toContainEqual(['from', 'cotizaciones'])
    expect(llamadas).toContainEqual(['select', 'id'])
    expect(llamadas).toContainEqual(['eq', 'vehiculo_id', VEHICULO])
    expect(llamadas).toContainEqual(['order', 'creado_en', { ascending: false }])
    expect(llamadas).toContainEqual(['order', 'id', { ascending: false }])
    expect(llamadas.at(-1)).toEqual(['limit', 21])
  })

  it('20 o menos es un número exacto; 21 filas es «20+»', async () => {
    respuesta = { data: filas(2), error: null }
    expect(await contarCotizacionesDelVehiculo(VEHICULO)).toEqual({
      ok: true,
      data: { n: 2, hayMas: false },
    })
    respuesta = { data: filas(21), error: null }
    expect(await contarCotizacionesDelVehiculo(VEHICULO)).toEqual({
      ok: true,
      data: { n: 20, hayMas: true },
    })
  })

  it('un error de la base vuelve como valor, no como excepción', async () => {
    respuesta = { data: null, error: { code: '42501', message: 'Sin permiso.' } }
    const r = await contarCotizacionesDelVehiculo(VEHICULO)
    expect(r.ok).toBe(false)
  })

  it('un id que no es un guid no llega a la base', async () => {
    const r = await contarCotizacionesDelVehiculo('uno')
    expect(r.ok).toBe(false)
    expect(llamadas).toEqual([])
  })
})
