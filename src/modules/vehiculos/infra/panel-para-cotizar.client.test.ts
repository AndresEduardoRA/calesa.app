import { beforeEach, describe, expect, it, vi } from 'vitest'
import { codificarCursor, leerCursor } from '@/shared/lib/paginacion'

const llamadas: [string, ...unknown[]][] = []
let respuesta: { data: unknown; error: unknown } = { data: [], error: null }
const consulta: Record<string, unknown> = {}
for (const nombre of ['select', 'eq', 'not', 'order', 'limit', 'lte', 'gte', 'or']) {
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

import { leerListaDelPanel } from './panel-para-cotizar.client'

const ORIGEN = '00000000-0000-4000-8000-0000000000aa'
const DESDE = '2026-10-29T00:00:00.000Z'
const fila = (i: number) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  numero: 100 - i,
  titulo: `Ford Bronco ${String(i)}`,
  anio: 2024,
  lote: null,
  precio: null,
  creado_en: `2026-10-29T08:${String(59 - i).padStart(2, '0')}:00+00:00`,
  cotizado_en: null,
  cierre_subasta_en: null,
  vehiculos_imagenes: [],
})
const pedido = (texto: string) => ({
  origenId: ORIGEN,
  lista: 'busqueda' as const,
  desde: DESDE,
  cursor: null,
  texto,
})

describe('leerListaDelPanel: la búsqueda', () => {
  beforeEach(() => {
    llamadas.length = 0
    respuesta = { data: [], error: null }
  })

  it('filtra por origen y portada, busca en título, VIN y lote, ordena por alta y pide 21', async () => {
    await leerListaDelPanel(pedido('Bronco'))
    expect(llamadas).toContainEqual(['from', 'vehiculos'])
    expect(llamadas).toContainEqual(['eq', 'origen_id', ORIGEN])
    expect(llamadas.find(([n]) => n === 'select')?.[1]).toContain('creado_en')
    expect(llamadas).toContainEqual([
      'or',
      'titulo.ilike."*Bronco*",vin.ilike."*Bronco*",lote.ilike."*Bronco*"',
    ])
    expect(llamadas).toContainEqual(['order', 'creado_en', { ascending: false }])
    expect(llamadas).toContainEqual(['order', 'id', { ascending: false }])
    expect(llamadas.map(([n]) => n)).not.toContain('not')
    expect(llamadas.at(-1)).toEqual(['limit', 21])
  })

  it('un texto con coma, paréntesis o comillas no rompe el filtro', async () => {
    await leerListaDelPanel(pedido('a,b) "c" 100%'))
    expect(llamadas).toContainEqual([
      'or',
      'titulo.ilike."*a,b) \\"c\\" 100\\\\%*",vin.ilike."*a,b) \\"c\\" 100\\\\%*",lote.ilike."*a,b) \\"c\\" 100\\\\%*"',
    ])
  })

  it('con cursor suma el borde de aplicarCursor en creado_en', async () => {
    const cursor = leerCursor(
      codificarCursor({
        instante: '2026-10-29T08:30:00+00:00',
        id: '00000000-0000-4000-8000-000000000009',
        sentido: 'siguiente',
      }),
    )
    await leerListaDelPanel({ ...pedido('Bronco'), cursor })
    expect(llamadas).toContainEqual(['lte', 'creado_en', '2026-10-29T08:30:00+00:00'])
    expect(llamadas.filter(([n]) => n === 'or')).toHaveLength(2)
  })

  it('21 filas son una página de 20 con «siguiente»', async () => {
    respuesta = { data: Array.from({ length: 21 }, (_, i) => fila(i)), error: null }
    const llena = await leerListaDelPanel(pedido('Bronco'))
    expect(llena.ok && llena.data.filas).toHaveLength(20)
    expect(llena.ok && llena.data.siguiente).not.toBeNull()
  })

  it('sin texto no consulta; un error de la base es un resultado fallido', async () => {
    expect((await leerListaDelPanel(pedido(''))).ok).toBe(false)
    expect(llamadas).toEqual([])
    respuesta = { data: null, error: { code: '42501', message: 'Sin permiso.' } }
    expect((await leerListaDelPanel(pedido('Bronco'))).ok).toBe(false)
  })
})

describe('leerListaDelPanel: las pestañas no cambian', () => {
  beforeEach(() => {
    llamadas.length = 0
  })

  it('«Últ. cotización» pide los cotizados y «Cierre subasta» el margen, sin buscar', async () => {
    await leerListaDelPanel({ origenId: ORIGEN, lista: 'ultima', desde: DESDE, cursor: null })
    expect(llamadas.find(([n]) => n === 'select')?.[1]).not.toContain('creado_en')
    expect(llamadas).toContainEqual(['not', 'cotizado_en', 'is', null])
    expect(llamadas.map(([n]) => n)).not.toContain('or')
    llamadas.length = 0
    await leerListaDelPanel({ origenId: ORIGEN, lista: 'cierre', desde: DESDE, cursor: null })
    expect(llamadas).toContainEqual(['gte', 'cierre_subasta_en', DESDE])
    expect(llamadas.map(([n]) => n)).not.toContain('or')
  })
})
