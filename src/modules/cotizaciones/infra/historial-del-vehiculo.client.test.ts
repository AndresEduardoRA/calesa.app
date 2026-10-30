import { beforeEach, describe, expect, it, vi } from 'vitest'
import { codificarCursor, leerCursor } from '@/shared/lib/paginacion'

const llamadas: [string, ...unknown[]][] = []
let respuesta: { data: unknown; error: unknown } = { data: [], error: null }
const consulta: Record<string, unknown> = {}
for (const nombre of ['select', 'eq', 'order', 'limit', 'lte', 'or', 'gte']) {
  consulta[nombre] = (...args: unknown[]) => {
    llamadas.push([nombre, ...args])
    return nombre === 'limit' ? Promise.resolve(respuesta) : consulta
  }
}
vi.mock('@/shared/lib/supabase/browser', () => ({
  createClient: () => ({
    from: (tabla: string) => {
      llamadas.push(['from', tabla])
      return consulta
    },
  }),
}))

import { leerHistorialDelVehiculo } from './historial-del-vehiculo.client'

const VEHICULO = '00000000-0000-4000-8000-0000000000aa'
const fila = (i: number) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  numero: 100 - i,
  clase: 'preventa',
  creado_en: `2026-10-29T08:${String(59 - i).padStart(2, '0')}:00+00:00`,
  perfiles: { nombre: 'Gala Guarda', email: 'g@x.com' },
})

describe('leerHistorialDelVehiculo: el historial desde el navegador', () => {
  beforeEach(() => {
    llamadas.length = 0
    respuesta = { data: [], error: null }
  })

  it('sin cursor: el vehículo, de la más nueva a la más vieja y 21 filas, sin condición de cursor', async () => {
    await leerHistorialDelVehiculo({ vehiculoId: VEHICULO, cursor: null })
    expect(llamadas).toContainEqual(['from', 'cotizaciones'])
    expect(llamadas).toContainEqual(['eq', 'vehiculo_id', VEHICULO])
    expect(llamadas).toContainEqual(['order', 'creado_en', { ascending: false }])
    expect(llamadas).toContainEqual(['order', 'id', { ascending: false }])
    expect(llamadas.map(([n]) => n)).not.toContain('lte')
    expect(llamadas.at(-1)).toEqual(['limit', 21])
  })

  it('con cursor, el borde de aplicarCursor en el orden de creado_en descendente', async () => {
    const cursor = leerCursor(
      codificarCursor({
        instante: '2026-10-29T08:30:00+00:00',
        id: '00000000-0000-4000-8000-000000000009',
        sentido: 'siguiente',
      }),
    )
    await leerHistorialDelVehiculo({ vehiculoId: VEHICULO, cursor })
    expect(llamadas).toContainEqual(['lte', 'creado_en', '2026-10-29T08:30:00+00:00'])
    expect(llamadas.map(([n]) => n)).toContain('or')
  })

  it('21 filas son una página de 20 con «siguiente»; 3 filas, una página sin más', async () => {
    respuesta = { data: Array.from({ length: 21 }, (_, i) => fila(i)), error: null }
    const llena = await leerHistorialDelVehiculo({ vehiculoId: VEHICULO, cursor: null })
    expect(llena.ok && llena.data.filas).toHaveLength(20)
    expect(llena.ok && llena.data.siguiente).not.toBeNull()
    respuesta = { data: [fila(0), fila(1), fila(2)], error: null }
    const corta = await leerHistorialDelVehiculo({ vehiculoId: VEHICULO, cursor: null })
    expect(corta.ok && corta.data.filas.map((f) => f.autor)).toEqual([
      'Gala Guarda',
      'Gala Guarda',
      'Gala Guarda',
    ])
    expect(corta.ok && corta.data.siguiente).toBeNull()
  })

  it('un error de la base, o una fila que no cumple, es un resultado fallido', async () => {
    respuesta = { data: null, error: { code: '42501', message: 'Sin permiso.' } }
    expect((await leerHistorialDelVehiculo({ vehiculoId: VEHICULO, cursor: null })).ok).toBe(false)
    respuesta = { data: [{ ...fila(0), clase: 'otra' }], error: null }
    expect((await leerHistorialDelVehiculo({ vehiculoId: VEHICULO, cursor: null })).ok).toBe(false)
  })
})
