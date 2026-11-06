import { beforeEach, describe, expect, it, vi } from 'vitest'

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

import { leerTarjeta } from './tarjeta.client'

const FORMULA = (n: number) => `00000000-0000-4000-8000-00000000000${String(n)}`

describe('leerTarjeta: la tarjeta desde el navegador', () => {
  beforeEach(() => {
    llamadas.length = 0
    respuesta = { data: { estado: 'sin_plantilla' }, error: null }
  })

  it('llama cotizacion_tarjeta con p_formula', async () => {
    const r = await leerTarjeta(FORMULA(1))
    expect(llamadas).toEqual([['cotizacion_tarjeta', { p_formula: FORMULA(1) }]])
    expect(r).toEqual({ ok: true, data: { estado: 'sin_plantilla' } })
  })

  it('la segunda vez con la misma versión no llama; con otra, sí', async () => {
    await leerTarjeta(FORMULA(2))
    await leerTarjeta(FORMULA(2))
    expect(llamadas).toHaveLength(1)
    await leerTarjeta(FORMULA(3))
    expect(llamadas).toHaveLength(2)
  })

  it('un fallo no se recuerda: el siguiente pedido lee de nuevo', async () => {
    respuesta = { data: null, error: { message: 'boom', code: 'XX000', details: '', hint: '' } }
    expect((await leerTarjeta(FORMULA(4))).ok).toBe(false)
    respuesta = { data: { estado: 'sin_plantilla' }, error: null }
    expect((await leerTarjeta(FORMULA(4))).ok).toBe(true)
    expect(llamadas).toHaveLength(2)
  })

  it('42501 es sin_permiso y no muestra el mensaje de la base', async () => {
    respuesta = {
      data: null,
      error: { message: 'No tienes acceso a esa versión', code: '42501', details: '', hint: '' },
    }
    const r = await leerTarjeta(FORMULA(5))
    expect(r.ok === false && r.error.codigo).toBe('sin_permiso')
  })

  it('una respuesta que no cumple el esquema es un fallo', async () => {
    respuesta = { data: { estado: 'lista' }, error: null }
    const r = await leerTarjeta(FORMULA(6))
    expect(r.ok === false && r.error.codigo).toBe('inesperado')
  })
})
