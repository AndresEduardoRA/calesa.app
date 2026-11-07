import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import { plantillaSobre } from './rpc-de-la-plantilla'

type Respuesta = {
  data: unknown
  error: { code?: string; message: string; details?: string; hint?: string } | null
}

function clienteFalso(respuesta: Respuesta) {
  const llamadas: [string, Record<string, unknown>][] = []
  const cliente = {
    rpc: (nombre: string, argumentos: Record<string, unknown>) => {
      llamadas.push([nombre, argumentos])
      return Promise.resolve(respuesta)
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, llamadas }
}

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const PUBLICADA = '22222222-2222-4222-8222-222222222222'
const HORA = '2026-11-07T15:00:00.123456+00:00'
const DEFINICION = { grupos: [], logo: true }
const INESPERADO = {
  ok: false,
  error: {
    codigo: 'inesperado',
    mensaje: 'No pudimos leer la respuesta. Recarga para ver cómo quedó.',
  },
}

describe('plantillaSobre › guardar', () => {
  it('con la esperada nula manda `null` explícito (la clave existe) y no manda `p_nota`', async () => {
    const { cliente, llamadas } = clienteFalso({ data: HORA, error: null })
    const hecho = await plantillaSobre(cliente).guardar({
      origenId: ORIGEN,
      esperada: null,
      definicion: DEFINICION,
    })
    expect(hecho).toEqual({ ok: true, data: HORA })
    const [nombre, args] = llamadas[0] ?? ['', {}]
    expect(nombre).toBe('plantilla_guardar_borrador')
    expect(args).toEqual({ p_origen: ORIGEN, p_actualizado_en_esperado: null, p_def: DEFINICION })
    expect(Object.keys(args)).toContain('p_actualizado_en_esperado')
    expect(JSON.stringify(args)).toContain('"p_actualizado_en_esperado":null')
    expect(Object.keys(args)).not.toContain('p_nota')
  })

  it('con la esperada, la manda tal cual, con sus microsegundos', async () => {
    const { cliente, llamadas } = clienteFalso({ data: HORA, error: null })
    await plantillaSobre(cliente).guardar({
      origenId: ORIGEN,
      esperada: HORA,
      definicion: DEFINICION,
    })
    expect(llamadas[0]?.[1]).toMatchObject({ p_actualizado_en_esperado: HORA })
  })

  it('una respuesta que no es un texto, o vacía, es «inesperado»', async () => {
    for (const data of [null, 3, '', { a: 1 }]) {
      const { cliente } = clienteFalso({ data, error: null })
      const hecho = await plantillaSobre(cliente).guardar({
        origenId: ORIGEN,
        esperada: null,
        definicion: DEFINICION,
      })
      expect(hecho).toEqual(INESPERADO)
    }
  })

  it('un rechazo de la regla va a su campo, con el mensaje de la base', async () => {
    const { cliente } = clienteFalso({
      data: null,
      error: {
        code: '22023',
        message: 'El grupo «x» no es de la fórmula.',
        details: 'grupo_inexistente',
        hint: 'grupos[0].grupo',
      },
    })
    const hecho = await plantillaSobre(cliente).guardar({
      origenId: ORIGEN,
      esperada: HORA,
      definicion: DEFINICION,
    })
    expect(hecho).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'El grupo «x» no es de la fórmula.' },
      porCampo: { 'grupos[0].grupo': 'El grupo «x» no es de la fórmula.' },
    })
  })

  it('un PT409 es un conflicto con el mensaje de la base', async () => {
    const mensaje = 'El borrador de esta plantilla cambió hace 2 min, mientras lo editabas.'
    const { cliente } = clienteFalso({ data: null, error: { code: 'PT409', message: mensaje } })
    const hecho = await plantillaSobre(cliente).guardar({
      origenId: ORIGEN,
      esperada: HORA,
      definicion: DEFINICION,
    })
    expect(hecho).toEqual({ ok: false, error: { codigo: 'conflicto', mensaje } })
  })
})

describe('plantillaSobre › publicar', () => {
  it('manda el origen, la esperada y la nota, y da el id', async () => {
    const { cliente, llamadas } = clienteFalso({ data: PUBLICADA, error: null })
    const hecho = await plantillaSobre(cliente).publicar({
      origenId: ORIGEN,
      esperada: HORA,
      nota: 'Nueva portada',
    })
    expect(hecho).toEqual({ ok: true, data: PUBLICADA })
    expect(llamadas).toEqual([
      [
        'plantilla_publicar',
        { p_origen: ORIGEN, p_actualizado_en_esperado: HORA, p_nota: 'Nueva portada' },
      ],
    ])
  })

  it('una respuesta que no es un id es «inesperado»', async () => {
    const { cliente } = clienteFalso({ data: 'no-es-guid', error: null })
    const hecho = await plantillaSobre(cliente).publicar({
      origenId: ORIGEN,
      esperada: HORA,
      nota: 'x',
    })
    expect(hecho).toEqual(INESPERADO)
  })

  it('«Publicar pide una nota.» va al campo `nota`', async () => {
    const { cliente } = clienteFalso({
      data: null,
      error: { code: '22023', message: 'Publicar pide una nota.', hint: 'nota' },
    })
    const hecho = await plantillaSobre(cliente).publicar({
      origenId: ORIGEN,
      esperada: HORA,
      nota: '',
    })
    expect(hecho).toMatchObject({ ok: false, porCampo: { nota: 'Publicar pide una nota.' } })
  })
})

describe('plantillaSobre › descartar', () => {
  it('manda el origen y la esperada; sin error, entró', async () => {
    const { cliente, llamadas } = clienteFalso({ data: null, error: null })
    const hecho = await plantillaSobre(cliente).descartar({ origenId: ORIGEN, esperada: HORA })
    expect(hecho).toEqual({ ok: true, data: null })
    expect(llamadas).toEqual([
      ['plantilla_descartar_borrador', { p_origen: ORIGEN, p_actualizado_en_esperado: HORA }],
    ])
  })

  it('un PT409 («el borrador ya no está») es un conflicto', async () => {
    const mensaje = 'El borrador ya no está: la versión 3 se publicó hace un momento.'
    const { cliente } = clienteFalso({ data: null, error: { code: 'PT409', message: mensaje } })
    const hecho = await plantillaSobre(cliente).descartar({ origenId: ORIGEN, esperada: HORA })
    expect(hecho).toEqual({ ok: false, error: { codigo: 'conflicto', mensaje } })
  })
})
