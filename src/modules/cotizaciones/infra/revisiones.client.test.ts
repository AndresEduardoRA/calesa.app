import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'

const llamadas: [string, Record<string, unknown>][] = []
let respuesta: { data: unknown; error: unknown } = { data: null, error: null }
vi.mock('@/shared/lib/supabase/browser', () => ({
  createClient: () => ({
    rpc: (nombre: string, args: Record<string, unknown>) => {
      llamadas.push([nombre, args])
      return Promise.resolve(respuesta)
    },
  }),
}))

import { leerRevisiones } from './revisiones.client'

const COTIZACION = '00000000-0000-4000-8000-0000000000aa'
const buena = {
  revisiones: [
    {
      id: 5,
      usuario_id: null,
      creado_en: '2026-11-04T10:00:00+00:00',
      autor: null,
      diff: {},
    },
  ],
  hay_mas: true,
  siguiente: 5,
  etiquetas: { nodos: {}, grupos: {} },
}

describe('leerRevisiones: las revisiones desde el navegador', () => {
  beforeEach(() => {
    llamadas.length = 0
    respuesta = { data: buena, error: null }
  })

  it('manda p_tamano de «Ver más» y p_antes sólo con cursor', async () => {
    await leerRevisiones({ cotizacionId: COTIZACION, antes: null, hasta: null })
    expect(llamadas[0]).toEqual([
      'cotizacion_revisiones',
      { p_cotizacion: COTIZACION, p_tamano: TAMANO_DE_VER_MAS },
    ])
    await leerRevisiones({ cotizacionId: COTIZACION, antes: 5, hasta: null })
    expect(llamadas[1]?.[1]).toEqual({
      p_cotizacion: COTIZACION,
      p_tamano: TAMANO_DE_VER_MAS,
      p_antes: 5,
    })
  })

  it('manda p_hasta sólo si llega, y con los dos manda los dos', async () => {
    const hasta = '2026-10-14T04:00:00.000Z'
    await leerRevisiones({ cotizacionId: COTIZACION, antes: null, hasta })
    expect(llamadas[0]?.[1]).toEqual({
      p_cotizacion: COTIZACION,
      p_tamano: TAMANO_DE_VER_MAS,
      p_hasta: hasta,
    })
    await leerRevisiones({ cotizacionId: COTIZACION, antes: 5, hasta })
    expect(llamadas[1]?.[1]).toEqual({
      p_cotizacion: COTIZACION,
      p_tamano: TAMANO_DE_VER_MAS,
      p_antes: 5,
      p_hasta: hasta,
    })
    await leerRevisiones({ cotizacionId: COTIZACION, antes: null, hasta: null })
    expect(llamadas[2]?.[1]).toEqual({ p_cotizacion: COTIZACION, p_tamano: TAMANO_DE_VER_MAS })
  })

  it('da la página leída', async () => {
    const r = await leerRevisiones({ cotizacionId: COTIZACION, antes: null, hasta: null })
    expect(r.ok && r.data.siguiente).toBe(5)
    expect(r.ok && r.data.revisiones).toHaveLength(1)
  })

  it('el error de la base cruza como valor', async () => {
    respuesta = {
      data: null,
      error: { code: '42501', message: 'No tienes acceso a esta cotización.' },
    }
    const r = await leerRevisiones({ cotizacionId: COTIZACION, antes: null, hasta: null })
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error.codigo).toBe('sin_permiso')
  })

  it('una respuesta que no es lo prometido es «inesperado»', async () => {
    respuesta = { data: { revisiones: 'no' }, error: null }
    const r = await leerRevisiones({ cotizacionId: COTIZACION, antes: null, hasta: null })
    expect(!r.ok && r.error.codigo).toBe('inesperado')
  })
})
