import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const rpc = vi.fn()
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({ rpc })),
}))

import {
  crudaDeUnaGuardada,
  ID_DE_LA_COTIZACION,
} from '../../entities/hoja-de-una-guardada.soporte'
import { getHojaDeUnaGuardada } from './hoja-de-una-guardada'

const evaluada = (usd: number | null = 2350) => ({
  valores: { remate: 1000 },
  estados: {},
  fuentes: { remate: 'input' },
  totales: { usd, bs: null, suma_usd: null },
  faltantes: [],
})
const responder = (hoja: unknown, evaluar: unknown) => {
  rpc.mockImplementation((nombre: string) =>
    Promise.resolve(nombre === 'cotizacion_hoja_guardada' ? hoja : evaluar),
  )
}
const pedidoDeEvaluar = () => {
  const llamada = rpc.mock.calls.find((c) => c[0] === 'cotizacion_evaluar')
  return llamada?.[1] as Record<string, unknown>
}

describe('getHojaDeUnaGuardada: la lectura que abre una cotización guardada', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('lee la hoja con UNA llamada y calcula con otra, por la cotización y sin hoja abierta', async () => {
    responder({ data: crudaDeUnaGuardada(), error: null }, { data: evaluada(), error: null })
    const r = await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION)
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc.mock.calls[0]).toEqual(['cotizacion_hoja_guardada', { p_id: ID_DE_LA_COTIZACION }])
    expect(rpc.mock.calls[1]?.[0]).toBe('cotizacion_evaluar')
    const pedido = pedidoDeEvaluar()
    expect(pedido['p_cotizacion']).toBe(ID_DE_LA_COTIZACION)
    expect(pedido).not.toHaveProperty('p_origen')
    expect(pedido).not.toHaveProperty('p_abierta')
    expect(pedido).not.toHaveProperty('p_vehiculo')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.hoja.cotizacion.numero).toBe(41)
      expect(r.data.inicial.estado).toEqual({ tipo: 'al_dia' })
      expect(r.data.inicial.respuesta?.totales.usd).toBe(2350)
    }
  })

  it('calcula con lo guardado como entradas (C4) y con su modo de tipo de cambio', async () => {
    responder(
      {
        data: crudaDeUnaGuardada({
          cotizacion: { ...crudaDeUnaGuardada().cotizacion, modo_tc: 'unificado' },
          valores: { remate: 1000, variante: 'moto', cuenta: 1, iva_c: 0.13 },
          fuentes: { remate: 'input', iva_c: 'override' },
        }),
        error: null,
      },
      { data: evaluada(), error: null },
    )
    await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION)
    expect(pedidoDeEvaluar()).toEqual({
      p_entradas: {
        inputs: { remate: 1000 },
        banderas: { cuenta: true },
        overrides: { iva_c: 0.13 },
        variante: 'moto',
      },
      p_cotizacion: ID_DE_LA_COTIZACION,
      p_modo_tc: 'unificado',
    })
  })

  it('sin modo guardado no manda p_modo_tc', async () => {
    responder({ data: crudaDeUnaGuardada(), error: null }, { data: evaluada(), error: null })
    await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION)
    expect(pedidoDeEvaluar()).not.toHaveProperty('p_modo_tc')
  })
})

describe('getHojaDeUnaGuardada: lo que sale mal', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('con 42501 la cotización no está disponible y no se calcula nada', async () => {
    responder(
      { data: null, error: { code: '42501', message: 'No tienes acceso a esta cotización.' } },
      { data: evaluada(), error: null },
    )
    const r = await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(!r.ok && r.error.codigo).toBe('sin_permiso')
  })

  it('otro error de la lectura es un error, no «no disponible»', async () => {
    responder(
      { data: null, error: { code: 'XX000', message: 'boom' } },
      { data: null, error: null },
    )
    const r = await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error.codigo).not.toBe('sin_permiso')
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('una respuesta que no es lo que promete la base es un error inesperado', async () => {
    responder({ data: { estado: 'lista' }, error: null }, { data: evaluada(), error: null })
    const r = await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION)
    expect(!r.ok && r.error.codigo).toBe('inesperado')
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('si el recálculo falla la hoja abre igual, con «No se pudo recalcular»', async () => {
    responder(
      { data: crudaDeUnaGuardada(), error: null },
      { data: null, error: { code: '42501', message: 'No tienes acceso a este vehículo.' } },
    )
    const r = await getHojaDeUnaGuardada(ID_DE_LA_COTIZACION)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.inicial.respuesta).toBeNull()
      expect(r.data.inicial.estado).toEqual({ tipo: 'fallo', recargar: true })
    }
  })

  it('un id que no es un uuid no llega a la base', async () => {
    const r = await getHojaDeUnaGuardada('cotizacion-41')
    expect(rpc).not.toHaveBeenCalled()
    expect(!r.ok && r.error.codigo).toBe('validacion')
  })
})
