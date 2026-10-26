import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const rpc = vi.fn()
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({ rpc })),
}))

import { getHojaParaCotizar } from './hoja'

const ORIGEN = '00000000-0000-0000-0000-000000000001'
const sinPublicar = {
  estado: 'sin_publicar',
  origen: { id: ORIGEN, nombre: 'Planilla' },
  puede_configurar: false,
}

describe('getHojaParaCotizar: la lectura que abre la hoja', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('hace UNA llamada a cotizacion_hoja con el origen y devuelve la hoja leída', async () => {
    rpc.mockResolvedValue({ data: sinPublicar, error: null })
    const r = await getHojaParaCotizar(ORIGEN)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('cotizacion_hoja', { p_origen: ORIGEN })
    expect(r).toEqual({
      ok: true,
      data: {
        estado: 'sin_publicar',
        origen: { id: ORIGEN, nombre: 'Planilla' },
        puedeConfigurar: false,
      },
    })
  })

  it('quien no cotiza en ese origen recibe sin_permiso, con el texto de la base', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'No tienes el permiso «cotizaciones.crear».' },
    })
    const r = await getHojaParaCotizar(ORIGEN)
    expect(r).toEqual({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: 'No tienes el permiso «cotizaciones.crear».' },
    })
  })

  it('una respuesta que no es lo que promete la base es un error inesperado, no una hoja', async () => {
    rpc.mockResolvedValue({ data: { estado: 'lista' }, error: null })
    const r = await getHojaParaCotizar(ORIGEN)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error.codigo).toBe('inesperado')
  })

  it('un origen que no es un uuid no llega a la base', async () => {
    const r = await getHojaParaCotizar('subasta_usa')
    expect(rpc).not.toHaveBeenCalled()
    expect(!r.ok && r.error.codigo).toBe('validacion')
  })

  it('un pedido que no llegó al servidor dice que es la conexión', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'TypeError: fetch failed' } })
    const r = await getHojaParaCotizar(ORIGEN)
    expect(!r.ok && r.error.codigo).toBe('inesperado')
    expect(!r.ok && r.error.mensaje).toMatch(/conexi/i)
  })
})
