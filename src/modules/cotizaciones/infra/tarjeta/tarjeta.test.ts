// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const llamadas: [string, Record<string, unknown>][] = []
let respuesta: { data: unknown; error: unknown } = { data: null, error: null }
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      rpc: (nombre: string, args: Record<string, unknown>) => {
        llamadas.push([nombre, args])
        return Promise.resolve(respuesta)
      },
    }),
}))

import { getTarjeta } from './tarjeta'

const FORMULA = '00000000-0000-4000-8000-000000000001'

describe('getTarjeta: la tarjeta en el servidor, con la sesión de quien pide', () => {
  beforeEach(() => {
    llamadas.length = 0
    respuesta = { data: { estado: 'sin_plantilla' }, error: null }
  })

  it('llama cotizacion_tarjeta con p_formula, sin memoria: cada pedido lee', async () => {
    expect(await getTarjeta(FORMULA)).toEqual({ ok: true, data: { estado: 'sin_plantilla' } })
    await getTarjeta(FORMULA)
    expect(llamadas).toEqual([
      ['cotizacion_tarjeta', { p_formula: FORMULA }],
      ['cotizacion_tarjeta', { p_formula: FORMULA }],
    ])
  })

  it('42501 es sin_permiso', async () => {
    respuesta = {
      data: null,
      error: { message: 'No tienes acceso a esa versión', code: '42501', details: '', hint: '' },
    }
    const r = await getTarjeta(FORMULA)
    expect(r.ok === false && r.error.codigo).toBe('sin_permiso')
  })

  it('una respuesta que no cumple el esquema es inesperado', async () => {
    respuesta = { data: { estado: 'lista' }, error: null }
    const r = await getTarjeta(FORMULA)
    expect(r.ok === false && r.error.codigo).toBe('inesperado')
  })
})
