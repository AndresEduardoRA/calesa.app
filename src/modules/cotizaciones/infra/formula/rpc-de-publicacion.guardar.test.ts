import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import type { Definicion } from '../../entities/formula'
import type { PedidoDeGuardar } from '../../entities/formula/repositorio'
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
const BORRADOR = '33333333-3333-4333-8333-333333333333'
const HORA = '2026-11-07T15:00:00.123456+00:00'
const HORA_NUEVA = '2026-11-07T15:02:10.654321+00:00'
const DEFINICION: Definicion = {
  nodos: [{ id: 'flete', tipo: 'constante', etiqueta: 'Flete', texto: '=900' }],
}
const DISENO = { cabecera: { modos: [], ver_total_bs: false } }

const base = {
  origenId: ORIGEN,
  definicion: DEFINICION,
  params: { flete: 900 },
  diseno: DISENO,
  nota: null,
} as unknown as Omit<PedidoDeGuardar, 'esperada'>

const crear: PedidoDeGuardar = { ...base, esperada: { sobre: 'publicada', publicadaId: PUBLICADA } }
const pisar: PedidoDeGuardar = {
  ...base,
  nota: 'A medias',
  esperada: { sobre: 'borrador', actualizadoEn: HORA },
}

describe('publicacionSobre › guardarBorrador (formula_guardar_borrador)', () => {
  it('crear: la definición, params planos, el diseño, la nota y sólo la publicada esperada', async () => {
    const { cliente, llamadas } = clienteFalso({
      data: { id: BORRADOR, actualizado_en: HORA_NUEVA },
      error: null,
    })
    const hecho = await publicacionSobre(cliente).guardarBorrador(crear)
    expect(llamadas).toEqual([
      [
        'formula_guardar_borrador',
        {
          p_origen: ORIGEN,
          p_def: DEFINICION,
          p_params: { flete: 900 },
          p_diseno: DISENO,
          p_publicada_esperada: PUBLICADA,
        },
      ],
    ])
    expect(hecho).toEqual({ ok: true, data: { id: BORRADOR, actualizadoEn: HORA_NUEVA } })
  })

  it('pisar: sólo la hora esperada, tal cual la dio la base, con la nota leída', async () => {
    const { cliente, llamadas } = clienteFalso({
      data: { id: BORRADOR, actualizado_en: HORA_NUEVA },
      error: null,
    })
    await publicacionSobre(cliente).guardarBorrador(pisar)
    expect(llamadas).toEqual([
      [
        'formula_guardar_borrador',
        {
          p_origen: ORIGEN,
          p_def: DEFINICION,
          p_params: { flete: 900 },
          p_diseno: DISENO,
          p_nota: 'A medias',
          p_actualizado_en_esperado: HORA,
        },
      ],
    ])
  })

  it('un diseño nulo viaja nulo (un borrador sin diseño)', async () => {
    const { cliente, llamadas } = clienteFalso({
      data: { id: BORRADOR, actualizado_en: HORA_NUEVA },
      error: null,
    })
    await publicacionSobre(cliente).guardarBorrador({ ...pisar, diseno: null })
    expect((llamadas[0]?.[1] as Record<string, unknown>)['p_diseno']).toBeNull()
  })

  it('una respuesta sin {id, actualizado_en} es inesperada', async () => {
    for (const data of [null, BORRADOR, { id: 'x', actualizado_en: HORA }, { id: BORRADOR }]) {
      const { cliente } = clienteFalso({ data, error: null })
      const hecho = await publicacionSobre(cliente).guardarBorrador(crear)
      expect(hecho.ok ? null : hecho.error.codigo).toBe('inesperado')
    }
  })

  it('el PT409 es un conflicto con el texto de la base intacto', async () => {
    const mensaje = 'Ya hay un borrador: lo empezó Ana y se guardó hace 2 min.'
    const { cliente } = clienteFalso({ data: null, error: { code: 'PT409', message: mensaje } })
    expect(await publicacionSobre(cliente).guardarBorrador(crear)).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje },
    })
  })

  it('un 22023 es una regla; un 42501, sin permiso', async () => {
    const regla = clienteFalso({ data: null, error: { code: '22023', message: 'Nodo repetido.' } })
    const r = await publicacionSobre(regla.cliente).guardarBorrador(crear)
    expect(r.ok ? null : r.error.codigo).toBe('regla')
    const permiso = clienteFalso({ data: null, error: { code: '42501', message: '' } })
    const p = await publicacionSobre(permiso.cliente).guardarBorrador(crear)
    expect(p.ok ? null : p.error.codigo).toBe('sin_permiso')
  })
})
