import { beforeEach, describe, expect, it, vi } from 'vitest'

const llamadas: [string, unknown][] = []
vi.mock('@/shared/lib/supabase/browser', () => ({
  createClient: () => ({
    rpc: (nombre: string, args: unknown) => {
      llamadas.push([nombre, args])
      return Promise.resolve({ data: null, error: null })
    },
  }),
}))

import { leerTipoCambioDelNodo } from './tipo-cambio-del-nodo.client'

const FORMULA = '22222222-2222-4222-8222-222222222222'

describe('leerTipoCambioDelNodo: desde el navegador', () => {
  beforeEach(() => {
    llamadas.length = 0
  })

  it.each([
    ['un formulaId que no es guid', { formulaId: 'no-es-guid', nodo: 'tc' }],
    ['un nodo con mayúsculas', { formulaId: FORMULA, nodo: 'TC' }],
    ['un nodo vacío', { formulaId: FORMULA, nodo: '' }],
  ])('%s no se pide', async (_, pedido) => {
    expect(await leerTipoCambioDelNodo(pedido)).toEqual({
      ok: false,
      error: { codigo: 'validacion', mensaje: 'Ese pedido del tipo de cambio no es válido.' },
    })
    expect(llamadas).toEqual([])
  })

  it('un pedido válido llama la RPC con la sesión del navegador', async () => {
    expect(await leerTipoCambioDelNodo({ formulaId: FORMULA, nodo: 'tc' })).toEqual({
      ok: true,
      data: null,
    })
    expect(llamadas).toEqual([
      ['formula_tipo_cambio_del_nodo', { p_formula: FORMULA, p_nodo: 'tc' }],
    ])
  })
})
