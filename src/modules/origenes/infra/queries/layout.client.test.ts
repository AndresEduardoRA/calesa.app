import { beforeEach, describe, expect, it, vi } from 'vitest'

const llamadas: [string, ...unknown[]][] = []
let respuestas: Record<string, { data: unknown; error: unknown }> = {}
vi.mock('@/shared/lib/supabase/browser', () => ({
  createClient: () => ({
    from: (tabla: string) => {
      llamadas.push(['from', tabla])
      const consulta = {
        select: (...args: unknown[]) => {
          llamadas.push(['select', ...args])
          return consulta
        },
        eq: (columna: string, valor: unknown) => {
          llamadas.push(['eq', columna, valor])
          return columna === 'activo' || columna === 'activa'
            ? Promise.resolve(respuestas[tabla])
            : consulta
        },
      }
      return consulta
    },
  }),
}))

import { leerLayoutActivo } from './layout.client'

const ORIGEN = '00000000-0000-4000-8000-0000000000aa'
const CAMPO = {
  id: '00000000-0000-4000-8000-000000000001',
  origen_id: ORIGEN,
  clave: 'color',
  etiqueta: 'Color',
  tipo: 'texto',
  opciones: [],
  requerido: false,
  valor_defecto: null,
  grupo: null,
  orden: 1,
  en_tarjeta: false,
  filtrable: false,
  publico_web: false,
  clave_apibara: null,
  es_sistema: false,
  activo: true,
  actualizado_en: '2026-10-29T08:00:00+00:00',
}
const CATEGORIA = {
  id: '00000000-0000-4000-8000-000000000002',
  origen_id: ORIGEN,
  padre_id: null,
  nombre: 'SUV',
  orden: 1,
  activa: true,
  actualizado_en: '2026-10-29T08:00:00+00:00',
}

describe('leerLayoutActivo', () => {
  beforeEach(() => {
    llamadas.length = 0
    respuestas = {
      origenes_campos: { data: [CAMPO], error: null },
      categorias: { data: [CATEGORIA], error: null },
    }
  })

  it('lee sólo los campos y las categorías activos del origen', async () => {
    const leido = await leerLayoutActivo(ORIGEN)
    expect(llamadas).toContainEqual(['from', 'origenes_campos'])
    expect(llamadas).toContainEqual(['from', 'categorias'])
    expect(llamadas.filter(([n, c]) => n === 'eq' && c === 'origen_id')).toHaveLength(2)
    expect(llamadas).toContainEqual(['eq', 'activo', true])
    expect(llamadas).toContainEqual(['eq', 'activa', true])
    expect(leido.ok && leido.data.campos.map((c) => c.clave)).toEqual(['color'])
    expect(leido.ok && leido.data.categorias.map((c) => c.nombre)).toEqual(['SUV'])
  })

  it('un error de la base o una fila que no cumple es un resultado fallido', async () => {
    respuestas['origenes_campos'] = {
      data: null,
      error: { code: '42501', message: 'Sin permiso.' },
    }
    expect((await leerLayoutActivo(ORIGEN)).ok).toBe(false)
    respuestas['origenes_campos'] = { data: [{ id: 'no' }], error: null }
    expect((await leerLayoutActivo(ORIGEN)).ok).toBe(false)
  })
})
