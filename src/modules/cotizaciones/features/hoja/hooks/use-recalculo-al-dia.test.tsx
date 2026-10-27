import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import { ENTRADAS_VACIAS, type Entradas } from '../../../entities/entradas'
import type { RespuestaDeRecalculo } from '../../../entities/recalculo'
import { ESPERA_DE_RECALCULO_MS, useRecalculo, type AlDia } from './use-recalculo'

// `alQuedarAlDia` (P8): guardar con el recálculo en camino espera al último, y nunca se queda esperando para siempre.
const INICIAL = { respuesta: respuestaDePrueba({ usd: 1 }), estado: { tipo: 'al_dia' } } as const
const entradas = (n: number): Entradas => ({ ...ENTRADAS_VACIAS, inputs: new Map([['remate', n]]) })

function pedidor() {
  const pendientes: ((r: Resultado<RespuestaDeRecalculo>) => void)[] = []
  const pedir = vi.fn(
    () => new Promise<Resultado<RespuestaDeRecalculo>>((resolver) => pendientes.push(resolver)),
  )
  return { pedir, pendientes }
}

const avanzar = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useRecalculo › alQuedarAlDia', () => {
  it('al día, llama enseguida con lo último y la respuesta vigente', () => {
    const { pedir } = pedidor()
    const hook = renderHook(() => useRecalculo({ inicial: INICIAL, pedir }))
    const fn = vi.fn<(r: AlDia) => void>()
    hook.result.current.alQuedarAlDia(fn)
    expect(fn).toHaveBeenCalledWith({
      ok: true,
      entradas: ENTRADAS_VACIAS,
      respuesta: INICIAL.respuesta,
    })
  })

  it('esperando, llama al llegar la respuesta, con las entradas de ese recálculo; si se confirma otra en el medio, espera a la última', async () => {
    const { pedir, pendientes } = pedidor()
    const hook = renderHook(() => useRecalculo({ inicial: INICIAL, pedir }))
    act(() => {
      hook.result.current.programar(entradas(1))
    })
    const fn = vi.fn<(r: AlDia) => void>()
    hook.result.current.alQuedarAlDia(fn)
    await avanzar(ESPERA_DE_RECALCULO_MS)
    act(() => {
      hook.result.current.programar(entradas(2))
    })
    await act(async () => {
      pendientes[0]?.(ok(respuestaDePrueba({ usd: 10 })))
      await Promise.resolve()
    })
    expect(fn).not.toHaveBeenCalled()
    await avanzar(ESPERA_DE_RECALCULO_MS)
    await act(async () => {
      pendientes[1]?.(ok(respuestaDePrueba({ usd: 20 })))
      await Promise.resolve()
    })
    expect(fn).toHaveBeenCalledTimes(1)
    const r = fn.mock.calls[0]?.[0]
    expect(r?.ok && r.entradas).toEqual(entradas(2))
    expect(r?.ok && r.respuesta?.totales.usd).toBe(20)
  })

  it('si el recálculo falla, llama con «fallo»', async () => {
    const { pedir, pendientes } = pedidor()
    const hook = renderHook(() => useRecalculo({ inicial: INICIAL, pedir }))
    act(() => {
      hook.result.current.programar(entradas(1))
    })
    const fn = vi.fn<(r: AlDia) => void>()
    hook.result.current.alQuedarAlDia(fn)
    await avanzar(ESPERA_DE_RECALCULO_MS)
    await act(async () => {
      pendientes[0]?.(fallo('inesperado', 'x'))
      await Promise.resolve()
    })
    expect(fn).toHaveBeenCalledWith({ ok: false, porque: 'fallo' })
  })

  it('desmontar con una que espera la llama con «se_fue», y no sale ningún pedido', async () => {
    const { pedir } = pedidor()
    const hook = renderHook(() => useRecalculo({ inicial: INICIAL, pedir }))
    act(() => {
      hook.result.current.programar(entradas(1))
    })
    const fn = vi.fn<(r: AlDia) => void>()
    hook.result.current.alQuedarAlDia(fn)
    hook.unmount()
    expect(fn).toHaveBeenCalledWith({ ok: false, porque: 'se_fue' })
    await avanzar(ESPERA_DE_RECALCULO_MS * 2)
    expect(pedir).not.toHaveBeenCalled()
  })
})
