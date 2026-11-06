import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import {
  consultaDeAutores,
  consultaDelEstado,
  consultaDeUnaVersion,
  consultaDeVersiones,
  leerAutores,
  leerPaginaConAutores,
} from './consulta-de-versiones'

type Llamada = [string, ...unknown[]]

// Un cliente que anota cada llamada de la consulta y responde lo que le toca a cada tabla.
function clienteFalso(respuestas: Record<string, unknown> = {}) {
  const llamadas: Llamada[] = []
  let tabla = ''
  const consulta: Record<string, unknown> = {}
  for (const metodo of ['select', 'eq', 'in', 'lt', 'not', 'order', 'limit', 'maybeSingle']) {
    consulta[metodo] = (...args: unknown[]) => {
      llamadas.push([metodo, ...args])
      return consulta
    }
  }
  consulta['then'] = (resolver: (valor: unknown) => unknown) =>
    Promise.resolve({ data: respuestas[tabla] ?? [], error: null }).then(resolver)
  const cliente = {
    from: (nombre: string) => {
      tabla = nombre
      llamadas.push(['from', nombre])
      return consulta
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, llamadas }
}

const O1 = '11111111-1111-4111-8111-111111111111'
const P1 = '22222222-2222-4222-8222-222222222222'
const OCULTO = /definicion|params|diseno|visibilidad/

const select = (llamadas: Llamada[]) => String(llamadas.find(([m]) => m === 'select')?.[1])

describe('consultaDeVersiones', () => {
  it('la primera página: sin lo oculto, del origen, sin borrador, de la más nueva y una de más', () => {
    const { cliente, llamadas } = clienteFalso()
    void consultaDeVersiones(cliente, O1, null)
    expect(select(llamadas)).not.toMatch(OCULTO)
    expect(llamadas).toEqual([
      ['from', 'formulas'],
      ['select', 'id, version, estado, nota, publicado_por, publicado_en'],
      ['eq', 'origen_id', O1],
      ['not', 'version', 'is', null],
      ['order', 'version', { ascending: false }],
      ['limit', 21],
    ])
  })

  it('con cursor, lo que está antes de él', () => {
    const { cliente, llamadas } = clienteFalso()
    void consultaDeVersiones(cliente, O1, 81)
    expect(llamadas).toContainEqual(['lt', 'version', 81])
  })
})

describe('consultaDelEstado', () => {
  it('la publicada y el borrador, a lo sumo dos, sin lo oculto', () => {
    const { cliente, llamadas } = clienteFalso()
    void consultaDelEstado(cliente, O1)
    expect(select(llamadas)).not.toMatch(OCULTO)
    expect(llamadas).toContainEqual(['eq', 'origen_id', O1])
    expect(llamadas).toContainEqual(['in', 'estado', ['borrador', 'publicada']])
    expect(llamadas).toContainEqual(['limit', 2])
  })
})

describe('consultaDeUnaVersion', () => {
  it('sólo el número, por clave primaria', () => {
    const { cliente, llamadas } = clienteFalso()
    void consultaDeUnaVersion(cliente, P1)
    expect(llamadas).toEqual([
      ['from', 'formulas'],
      ['select', 'version'],
      ['eq', 'id', P1],
      ['maybeSingle'],
    ])
  })
})

describe('los autores', () => {
  it('por clave primaria y con tope', () => {
    const { cliente, llamadas } = clienteFalso()
    void consultaDeAutores(cliente, [P1])
    expect(llamadas).toEqual([
      ['from', 'perfiles'],
      ['select', 'id, nombre, email'],
      ['in', 'id', [P1]],
      ['limit', 1],
    ])
  })

  it('sin ids no consulta', async () => {
    const { cliente, llamadas } = clienteFalso()
    expect(await leerAutores(cliente, [])).toEqual({ ok: true, data: new Map() })
    expect(llamadas).toEqual([])
  })
})

describe('leerPaginaConAutores', () => {
  it('una lectura para la página y otra para sus nombres', async () => {
    const { cliente, llamadas } = clienteFalso({
      formulas: [
        {
          id: O1,
          version: 1,
          estado: 'publicada',
          nota: null,
          publicado_por: P1,
          publicado_en: '2026-11-06T10:00:00+00:00',
        },
      ],
      perfiles: [{ id: P1, nombre: 'Ana', email: 'ana@x.bo' }],
    })
    const resultado = await leerPaginaConAutores(cliente, O1, null)
    expect(resultado.ok && resultado.data.filas[0]?.autor).toBe('Ana')
    expect(llamadas.filter(([m]) => m === 'from')).toEqual([
      ['from', 'formulas'],
      ['from', 'perfiles'],
    ])
  })
})
