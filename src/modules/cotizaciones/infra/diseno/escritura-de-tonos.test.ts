import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import { coloresDeUnTonoNuevo } from '../../entities/diseno/tonos'
import { escrituraDeTonosSobre } from './escritura-de-tonos'

type Error = { message: string; code?: string; hint?: string }

// Un cliente que anota la RPC y sus parámetros y responde lo dado.
function clienteFalso(respuesta: { data: unknown; error: Error | null }) {
  const llamadas: { rpc: string; parametros: unknown }[] = []
  const cliente = {
    rpc: (rpc: string, parametros: unknown) => {
      llamadas.push({ rpc, parametros })
      return Promise.resolve(respuesta)
    },
  }
  return { repo: escrituraDeTonosSobre(cliente as unknown as SupabaseClient<Database>), llamadas }
}

const ID = '11111111-1111-4111-8111-111111111111'
const HORA = '2026-11-08T10:00:00.123456+00:00'
const lista = {
  tope: 24,
  tonos: [
    {
      id: ID,
      clave: 'dorado',
      nombre: 'Dorado',
      actualizado_en: HORA,
      claro: { fondo: '#fff7d6', borde: '#e9d27a', tinta: '#1b2130' },
      oscuro: { fondo: '#3e3f3c', borde: '#797251', tinta: '#f2f4f8' },
    },
  ],
}

describe('escrituraDeTonosSobre', () => {
  it('T3 · cada RPC con sus parámetros exactos y la lista que devuelve', async () => {
    const colores = coloresDeUnTonoNuevo()
    const crear = clienteFalso({
      data: { id: ID, actualizado_en: HORA, repetido: false, lista },
      error: null,
    })
    const r = await crear.repo.crear({ id: ID, nombre: 'Dorado', colores })
    expect(crear.llamadas).toEqual([
      { rpc: 'tono_crear', parametros: { p_id: ID, p_nombre: 'Dorado', p_colores: colores } },
    ])
    expect(r.ok && r.data.lista.tonos[0]?.nombre).toBe('Dorado')
    expect(r.ok && r.data.actualizadoEn).toBe(HORA)

    const guardar = clienteFalso({ data: { id: ID, actualizado_en: HORA, lista }, error: null })
    await guardar.repo.guardar({ id: ID, actualizadoEnEsperado: HORA, cambios: { nombre: 'Oro' } })
    expect(guardar.llamadas).toEqual([
      {
        rpc: 'tono_guardar',
        parametros: { p_id: ID, p_actualizado_en_esperado: HORA, p_cambios: { nombre: 'Oro' } },
      },
    ])

    const eliminar = clienteFalso({ data: { lista }, error: null })
    const e = await eliminar.repo.eliminar({ id: ID, actualizadoEnEsperado: HORA })
    expect(eliminar.llamadas).toEqual([
      { rpc: 'tono_eliminar', parametros: { p_id: ID, p_actualizado_en_esperado: HORA } },
    ])
    expect(e.ok && e.data.id).toBeNull()
  })

  it('T3 · el hint que es un campo del formulario va a `campo`', async () => {
    for (const hint of ['nombre', 'claro', 'oscuro', 'claro.fondo', 'oscuro.tinta']) {
      const { repo } = clienteFalso({
        data: null,
        error: { message: 'El motivo de la base.', code: '22023', hint },
      })
      const r = await repo.crear({ id: ID, nombre: 'x', colores: coloresDeUnTonoNuevo() })
      expect(!r.ok && r.campo).toBe(hint)
    }
    const { repo } = clienteFalso({
      data: null,
      error: { message: 'No.', code: '22023', hint: 'otra-cosa' },
    })
    const r = await repo.crear({ id: ID, nombre: 'x', colores: coloresDeUnTonoNuevo() })
    expect(r.ok === false && 'campo' in r).toBe(false)
  })

  it('T3 · PT409, 23503 y 23505 conservan el texto de la base', async () => {
    const casos: [string, string, string?][] = [
      ['PT409', 'Otra persona cambió este tono mientras lo editabas.'],
      [
        '23503',
        '«Dorado» lo usa la fórmula de «Subasta» (alguna de sus versiones): no se elimina.',
      ],
      ['23505', 'Ya hay un tono «Dorado».', 'nombre'],
    ]
    for (const [code, message, hint] of casos) {
      const { repo } = clienteFalso({
        data: null,
        error: { message, code, ...(hint ? { hint } : {}) },
      })
      const r = await repo.eliminar({ id: ID, actualizadoEnEsperado: HORA })
      expect(!r.ok && r.error.mensaje, code).toBe(message)
    }
  })

  it('T3 · una respuesta sin lista pide recargar', async () => {
    const { repo } = clienteFalso({ data: { id: ID }, error: null })
    const r = await repo.eliminar({ id: ID, actualizadoEnEsperado: HORA })
    expect(!r.ok && r.error.mensaje).toBe(
      'No pudimos leer la respuesta. Recarga para ver cómo quedó.',
    )
  })
})
