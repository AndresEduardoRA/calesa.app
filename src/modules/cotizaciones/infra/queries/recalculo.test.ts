import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const rpc = vi.fn()
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({ rpc })),
}))

import { recalcularAlAbrir } from './recalculo'

const ORIGEN = '00000000-0000-0000-0000-000000000001'
const VEHICULO = '00000000-0000-0000-0000-000000000002'
const ABIERTA = `${ORIGEN}.1792850400000000.${'a'.repeat(64)}`

// La respuesta de la base tal como la lee `recalculoDesde()`.
const cruda = {
  valores: { total: 10 },
  estados: { total: 'activo' },
  fuentes: { total: 'default' },
  totales: { usd: 10, bs: 69.6, suma_usd: 10 },
  faltantes: [],
}

describe('recalcularAlAbrir: el primer cálculo del servidor', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('calcula con la hoja abierta que entregó la lectura (p_abierta), el origen y el vehículo, en UNA llamada', async () => {
    rpc.mockResolvedValue({ data: cruda, error: null })
    const r = await recalcularAlAbrir({
      origenId: ORIGEN,
      vehiculoId: VEHICULO,
      abierta: ABIERTA,
      modoTc: null,
    })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('cotizacion_evaluar', {
      p_entradas: { inputs: {}, banderas: {}, overrides: {} },
      p_origen: ORIGEN,
      p_abierta: ABIERTA,
      p_vehiculo: VEHICULO,
    })
    expect(r.vehiculoSoltado).toBe(false)
  })

  it('si la base rechaza el vehículo, vuelve a calcular sin él y con la misma hoja abierta', async () => {
    rpc
      .mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'x' } })
      .mockResolvedValueOnce({ data: cruda, error: null })
    const r = await recalcularAlAbrir({
      origenId: ORIGEN,
      vehiculoId: VEHICULO,
      abierta: ABIERTA,
      modoTc: null,
    })
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc.mock.calls[1]).toEqual([
      'cotizacion_evaluar',
      {
        p_entradas: { inputs: {}, banderas: {}, overrides: {} },
        p_origen: ORIGEN,
        p_abierta: ABIERTA,
      },
    ])
    expect(r.vehiculoSoltado).toBe(true)
  })

  it('lleva p_modo_tc del modo con que abre la hoja, también al soltar el vehículo', async () => {
    rpc
      .mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'x' } })
      .mockResolvedValueOnce({ data: cruda, error: null })
    await recalcularAlAbrir({
      origenId: ORIGEN,
      vehiculoId: VEHICULO,
      abierta: ABIERTA,
      modoTc: 'paralelo',
    })
    expect(rpc.mock.calls.map(([, args]) => (args as { p_modo_tc?: string }).p_modo_tc)).toEqual([
      'paralelo',
      'paralelo',
    ])
  })
})
