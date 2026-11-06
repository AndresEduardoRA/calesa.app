import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'

const llamadas: { funcion: string; args: unknown }[] = []
let respuesta: { data: unknown; error: unknown } = { data: null, error: null }
vi.mock('@/shared/lib/supabase/browser', () => ({
  createClient: () => ({
    rpc: (funcion: string, args: unknown) => {
      llamadas.push({ funcion, args })
      return Promise.resolve(respuesta)
    },
  }),
}))

import { leerMasOportunidades } from './oportunidades.client'

const LEAD = '00000000-0000-4000-8000-0000000000aa'
const ANTES = {
  antesAbierta: true,
  antesEn: '2026-11-06T12:00:48.1234+00:00',
  antesId: '00000000-0000-4000-8000-0000000000bb',
}

describe('leerMasOportunidades: «Ver más» desde el navegador', () => {
  beforeEach(() => {
    llamadas.length = 0
    respuesta = { data: null, error: null }
  })

  it('pide lead_oportunidades con el tamaño de «Ver más» y los tres valores del cursor, tal como llegaron', async () => {
    respuesta = { data: { puedo_crear: true, hay_mas: false, oportunidades: [] }, error: null }
    const leida = await leerMasOportunidades({ leadId: LEAD, antes: ANTES })
    expect(llamadas).toEqual([
      {
        funcion: 'lead_oportunidades',
        args: {
          p_lead: LEAD,
          p_tamano: TAMANO_DE_VER_MAS,
          p_antes_abierta: true,
          p_antes_en: '2026-11-06T12:00:48.1234+00:00',
          p_antes_id: ANTES.antesId,
        },
      },
    ])
    expect(leida).toEqual({
      ok: true,
      data: { puedoCrear: true, hayMas: false, oportunidades: [] },
    })
  })

  it('un error de PostgREST da su ErrorApp', async () => {
    respuesta = {
      data: null,
      error: { message: 'El cursor de las oportunidades está incompleto.', code: '22023' },
    }
    const leida = await leerMasOportunidades({ leadId: LEAD, antes: ANTES })
    expect(leida.ok).toBe(false)
  })

  it('una forma rota da «inesperado»', async () => {
    respuesta = { data: { algo: 'raro' }, error: null }
    const leida = await leerMasOportunidades({ leadId: LEAD, antes: ANTES })
    expect(leida).toMatchObject({ ok: false, error: { codigo: 'inesperado' } })
  })
})
