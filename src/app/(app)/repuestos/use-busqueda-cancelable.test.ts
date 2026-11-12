import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok, type Resultado } from '@/shared/lib/errores'
import type { OpcionDelBuscador } from './tipos-del-buscador'
import { ESPERA_DE_LA_BUSQUEDA_MS, useBusquedaCancelable } from './use-busqueda-cancelable'

type Pedido = {
  texto: string
  signal: AbortSignal
  responder: (r: Resultado<OpcionDelBuscador[]>) => void
}

describe('useBusquedaCancelable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('la respuesta de una búsqueda vieja no pisa a la nueva', async () => {
    const pedidos: Pedido[] = []
    const buscar = (texto: string, signal: AbortSignal) =>
      new Promise<Resultado<OpcionDelBuscador[]>>((responder) => {
        pedidos.push({ texto, signal, responder })
      })
    const { result, rerender } = renderHook(
      ({ texto }: { texto: string | null }) => useBusquedaCancelable({ texto, buscar, intento: 0 }),
      { initialProps: { texto: 'cam' } },
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ESPERA_DE_LA_BUSQUEDA_MS)
    })
    expect(pedidos).toHaveLength(1)
    rerender({ texto: 'camion' })
    expect(pedidos[0]?.signal.aborted).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ESPERA_DE_LA_BUSQUEDA_MS)
    })
    expect(pedidos).toHaveLength(2)
    await act(async () => {
      pedidos[1]?.responder(ok([{ id: 'nueva', titulo: 'Camión nuevo' }]))
      pedidos[0]?.responder(ok([{ id: 'vieja', titulo: 'Cam vieja' }]))
      await Promise.resolve()
    })
    expect(result.current.estado).toEqual({
      tipo: 'listo',
      opciones: [{ id: 'nueva', titulo: 'Camión nuevo' }],
    })
  })

  it('con un texto que no alcanza no pide nada', async () => {
    const buscar = vi.fn()
    renderHook(() => useBusquedaCancelable({ texto: null, buscar, intento: 0 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ESPERA_DE_LA_BUSQUEDA_MS * 2)
    })
    expect(buscar).not.toHaveBeenCalled()
  })
})
