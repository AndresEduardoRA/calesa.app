import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import { publicacionSobre } from './rpc-de-publicacion'

type Respuesta = {
  data: unknown
  error: { code?: string; message: string; hint?: string } | null
}

// Un cliente que anota cada RPC con sus argumentos y responde lo que se le da.
function clienteFalso(respuesta: Respuesta) {
  const llamadas: [string, unknown][] = []
  const cliente = {
    rpc: (nombre: string, argumentos: unknown) => {
      llamadas.push([nombre, argumentos])
      return Promise.resolve(respuesta)
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, llamadas }
}

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const PUBLICADA = '22222222-2222-4222-8222-222222222222'
const NUEVA = '33333333-3333-4333-8333-333333333333'
const HORA = '2026-11-07T15:00:00.123456+00:00'

describe('publicacionSobre › publicar', () => {
  it('llama formula_publicar con el origen, la nota, la publicada que se leyó y la hora del borrador', async () => {
    const { cliente, llamadas } = clienteFalso({ data: NUEVA, error: null })
    const hecho = await publicacionSobre(cliente).publicar({
      origenId: ORIGEN,
      nota: 'Subo el flete',
      actualizadoEsperado: HORA,
      publicadaEsperada: PUBLICADA,
    })
    expect(llamadas).toEqual([
      [
        'formula_publicar',
        {
          p_origen: ORIGEN,
          p_nota: 'Subo el flete',
          p_publicada_esperada: PUBLICADA,
          p_actualizado_en_esperado: HORA,
        },
      ],
    ])
    expect(hecho).toEqual({ ok: true, data: NUEVA })
  })

  it('sin publicada no manda esa esperada (la base la toma nula); la hora del borrador, siempre', async () => {
    const { cliente, llamadas } = clienteFalso({ data: NUEVA, error: null })
    await publicacionSobre(cliente).publicar({
      origenId: ORIGEN,
      nota: 'Primera',
      actualizadoEsperado: HORA,
      publicadaEsperada: null,
    })
    expect(llamadas).toEqual([
      [
        'formula_publicar',
        { p_origen: ORIGEN, p_nota: 'Primera', p_actualizado_en_esperado: HORA },
      ],
    ])
  })

  it('el PT409 es un conflicto con el mensaje de la base intacto', async () => {
    const { cliente } = clienteFalso({
      data: null,
      error: { code: 'PT409', message: 'Ana publicó la versión 3 hace 2 min.' },
    })
    const hecho = await publicacionSobre(cliente).publicar({
      origenId: ORIGEN,
      nota: 'x',
      actualizadoEsperado: HORA,
      publicadaEsperada: PUBLICADA,
    })
    expect(hecho).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Ana publicó la versión 3 hace 2 min.' },
    })
  })
})

describe('publicacionSobre › publicar: los errores', () => {
  it('un 22023 es una regla con su mensaje; un 42501, sin permiso', async () => {
    const regla = clienteFalso({
      data: null,
      error: { code: '22023', message: 'Publicar pide el diseño de la hoja.' },
    })
    expect(
      await publicacionSobre(regla.cliente).publicar({
        origenId: ORIGEN,
        nota: 'x',
        actualizadoEsperado: HORA,
        publicadaEsperada: null,
      }),
    ).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'Publicar pide el diseño de la hoja.' },
    })
    const permiso = clienteFalso({ data: null, error: { code: '42501', message: '' } })
    const sinPermiso = await publicacionSobre(permiso.cliente).publicar({
      origenId: ORIGEN,
      nota: 'x',
      actualizadoEsperado: HORA,
      publicadaEsperada: null,
    })
    expect(sinPermiso.ok ? null : sinPermiso.error.codigo).toBe('sin_permiso')
  })

  it('una respuesta que no es un uuid es inesperada', async () => {
    const { cliente } = clienteFalso({ data: 'no-es-un-uuid', error: null })
    const hecho = await publicacionSobre(cliente).publicar({
      origenId: ORIGEN,
      nota: 'x',
      actualizadoEsperado: HORA,
      publicadaEsperada: null,
    })
    expect(hecho.ok ? null : hecho.error.codigo).toBe('inesperado')
  })
})

const ARCHIVADA = '44444444-4444-4444-8444-444444444444'

describe('publicacionSobre › revertir', () => {
  it('llama formula_revertir con el origen, la versión, la nota y la publicada que se leyó', async () => {
    const { cliente, llamadas } = clienteFalso({ data: NUEVA, error: null })
    const hecho = await publicacionSobre(cliente).revertir({
      origenId: ORIGEN,
      versionId: ARCHIVADA,
      nota: 'Vuelve a la versión 1.',
      publicadaEsperada: PUBLICADA,
    })
    expect(llamadas).toEqual([
      [
        'formula_revertir',
        {
          p_origen: ORIGEN,
          p_version: ARCHIVADA,
          p_nota: 'Vuelve a la versión 1.',
          p_publicada_esperada: PUBLICADA,
        },
      ],
    ])
    expect(hecho).toEqual({ ok: true, data: NUEVA })
  })

  it('el PT409 llega con su texto; un 22023, como regla', async () => {
    const choque = clienteFalso({
      data: null,
      error: { code: 'PT409', message: 'Otra persona publicó la versión 4 hace 1 min.' },
    })
    expect(
      await publicacionSobre(choque.cliente).revertir({
        origenId: ORIGEN,
        versionId: ARCHIVADA,
        nota: 'x',
        publicadaEsperada: PUBLICADA,
      }),
    ).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Otra persona publicó la versión 4 hace 1 min.' },
    })
    const regla = clienteFalso({
      data: null,
      error: { code: '22023', message: 'Esa ya es la versión publicada.' },
    })
    expect(
      await publicacionSobre(regla.cliente).revertir({
        origenId: ORIGEN,
        versionId: ARCHIVADA,
        nota: 'x',
        publicadaEsperada: PUBLICADA,
      }),
    ).toEqual({ ok: false, error: { codigo: 'regla', mensaje: 'Esa ya es la versión publicada.' } })
  })
})

describe('publicacionSobre › descartar', () => {
  it('llama formula_descartar_borrador con el origen y la hora del borrador y, sin error, entra', async () => {
    const { cliente, llamadas } = clienteFalso({ data: null, error: null })
    const hecho = await publicacionSobre(cliente).descartar({
      origenId: ORIGEN,
      actualizadoEsperado: HORA,
    })
    expect(llamadas).toEqual([
      ['formula_descartar_borrador', { p_origen: ORIGEN, p_actualizado_en_esperado: HORA }],
    ])
    expect(hecho).toEqual({ ok: true, data: null })
  })

  it('el PT409 de la hora llega con su texto', async () => {
    const mensaje = 'El borrador cambió después de que lo abriste: se guardó de nuevo hace 1 min.'
    const { cliente } = clienteFalso({ data: null, error: { code: 'PT409', message: mensaje } })
    expect(
      await publicacionSobre(cliente).descartar({ origenId: ORIGEN, actualizadoEsperado: HORA }),
    ).toEqual({ ok: false, error: { codigo: 'conflicto', mensaje } })
  })

  it('un 42501 es sin permiso con el mensaje de la base', async () => {
    const { cliente } = clienteFalso({
      data: null,
      error: { code: '42501', message: 'No tienes permiso para configurar la fórmula.' },
    })
    const hecho = await publicacionSobre(cliente).descartar({
      origenId: ORIGEN,
      actualizadoEsperado: HORA,
    })
    expect(hecho.ok ? null : hecho.error.codigo).toBe('sin_permiso')
  })
})

describe('publicacionSobre › cambiarConstante', () => {
  const pedido = { origenId: ORIGEN, nodo: 'flete', valor: 0.13, publicadaEsperada: PUBLICADA }

  it('llama formula_cambiar_constante con el origen, el nodo, el valor y la publicada esperada, siempre', async () => {
    const { cliente, llamadas } = clienteFalso({ data: NUEVA, error: null })
    const hecho = await publicacionSobre(cliente).cambiarConstante(pedido)
    expect(llamadas).toEqual([
      [
        'formula_cambiar_constante',
        { p_origen: ORIGEN, p_nodo: 'flete', p_valor: 0.13, p_publicada_esperada: PUBLICADA },
      ],
    ])
    expect(hecho).toEqual({ ok: true, data: NUEVA })
  })

  it('el PT409 es un conflicto con el mensaje de la base intacto, sin campo', async () => {
    const { cliente } = clienteFalso({
      data: null,
      error: { code: 'PT409', message: 'Ana publicó la versión 3 hace 2 min.' },
    })
    expect(await publicacionSobre(cliente).cambiarConstante(pedido)).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Ana publicó la versión 3 hace 2 min.' },
    })
  })

  it('el 22023 con hint «valor» va al campo «valor»', async () => {
    const { cliente } = clienteFalso({
      data: null,
      error: { code: '22023', message: 'La constante ya tiene ese valor.', hint: 'valor' },
    })
    expect(await publicacionSobre(cliente).cambiarConstante(pedido)).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'La constante ya tiene ese valor.' },
      campo: 'valor',
    })
  })

  it('otro 22023 (el hint de un nodo de _formula_rechazar, o sin hint) es una regla sin campo', async () => {
    const delNodo = clienteFalso({
      data: null,
      error: { code: '22023', message: 'El flete no puede ser negativo.', hint: 'flete' },
    })
    expect(await publicacionSobre(delNodo.cliente).cambiarConstante(pedido)).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'El flete no puede ser negativo.' },
    })
    const sinHint = clienteFalso({
      data: null,
      error: { code: '22023', message: 'El origen no tiene fórmula publicada.' },
    })
    expect(await publicacionSobre(sinHint.cliente).cambiarConstante(pedido)).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'El origen no tiene fórmula publicada.' },
    })
  })

  it('una respuesta que no es un id es inesperada', async () => {
    const { cliente } = clienteFalso({ data: 'otra cosa', error: null })
    const hecho = await publicacionSobre(cliente).cambiarConstante(pedido)
    expect(hecho.ok ? null : hecho.error.codigo).toBe('inesperado')
  })
})
