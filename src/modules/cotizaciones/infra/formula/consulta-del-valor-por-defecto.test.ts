import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import {
  consultaDelValorPorDefecto,
  leerValorPorDefectoSobre,
} from './consulta-del-valor-por-defecto'

type Llamada = [string, ...unknown[]]

// Un cliente que anota cada llamada de la consulta y responde lo que se le da.
function clienteFalso(respuesta: {
  data: unknown
  error: { message: string; code?: string } | null
}) {
  const llamadas: Llamada[] = []
  const consulta: Record<string, unknown> = {}
  for (const metodo of ['select', 'eq', 'limit']) {
    consulta[metodo] = (...args: unknown[]) => {
      llamadas.push([metodo, ...args])
      return consulta
    }
  }
  consulta['then'] = (resolver: (valor: unknown) => unknown) =>
    Promise.resolve(respuesta).then(resolver)
  const cliente = {
    from: (nombre: string) => {
      llamadas.push(['from', nombre])
      return consulta
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, llamadas }
}

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const PUBLICADA = '22222222-2222-4222-8222-222222222222'

describe('consultaDelValorPorDefecto', () => {
  it('la publicada del origen, una fila, con id, versión y el valor de cada nodo (sin el resto de params)', () => {
    const { cliente, llamadas } = clienteFalso({ data: [], error: null })
    void consultaDelValorPorDefecto(cliente, ORIGEN, ['flete', 'fees_pct'])
    expect(llamadas).toEqual([
      ['from', 'formulas'],
      ['select', 'id, version, v0:params->flete, v1:params->fees_pct'],
      ['eq', 'origen_id', ORIGEN],
      ['eq', 'estado', 'publicada'],
      ['limit', 1],
    ])
  })
})

describe('leerValorPorDefectoSobre', () => {
  it('dos nodos: cada uno con su valor', async () => {
    const { cliente } = clienteFalso({
      data: [{ id: PUBLICADA, version: 3, v0: 1250, v1: 0.13 }],
      error: null,
    })
    expect(await leerValorPorDefectoSobre(cliente, ORIGEN, ['flete', 'fees_pct'])).toEqual({
      ok: true,
      data: { publicadaId: PUBLICADA, version: 3, valores: { flete: 1250, fees_pct: 0.13 } },
    })
  })

  it('sin publicada: nulo', async () => {
    const { cliente } = clienteFalso({ data: [], error: null })
    expect(await leerValorPorDefectoSobre(cliente, ORIGEN, ['flete'])).toEqual({
      ok: true,
      data: null,
    })
  })

  it('sin la constante, o con algo que no es un número: ese nodo nulo', async () => {
    const { cliente } = clienteFalso({
      data: [{ id: PUBLICADA, version: 3, v0: null, v1: '5' }],
      error: null,
    })
    expect(await leerValorPorDefectoSobre(cliente, ORIGEN, ['flete', 'fees_pct'])).toEqual({
      ok: true,
      data: { publicadaId: PUBLICADA, version: 3, valores: { flete: null, fees_pct: null } },
    })
  })

  it('un error de la lectura es un error', async () => {
    const { cliente } = clienteFalso({ data: null, error: { message: 'Failed to fetch' } })
    const leido = await leerValorPorDefectoSobre(cliente, ORIGEN, ['flete'])
    expect(leido.ok).toBe(false)
  })

  it('una fila que no tiene la forma esperada es inesperada', async () => {
    const { cliente } = clienteFalso({ data: [{ id: 'x', version: 'tres' }], error: null })
    const leido = await leerValorPorDefectoSobre(cliente, ORIGEN, ['flete'])
    expect(leido.ok ? null : leido.error.codigo).toBe('inesperado')
  })
})
