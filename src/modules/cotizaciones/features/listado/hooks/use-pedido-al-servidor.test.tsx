import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

import { usePedidoAlServidor } from './use-pedido-al-servidor'

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const OTRO = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'

afterEach(() => {
  cleanup()
  refresh.mockClear()
})

describe('usePedidoAlServidor', () => {
  it('sin necesitarlo no pide, y nada está pedido', () => {
    const { result } = renderHook(() => usePedidoAlServidor(ID, false))
    expect(result.current.yaPedido).toBe(false)
    expect(refresh).not.toHaveBeenCalled()
  })

  it('pide una vez por id aunque se vuelva a dibujar', () => {
    const { result, rerender } = renderHook(() => usePedidoAlServidor(ID, true))
    expect(refresh).toHaveBeenCalledTimes(1)
    rerender()
    rerender()
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(result.current.yaPedido).toBe(true)
  })

  it('otro id pide de nuevo y no hereda lo pedido', () => {
    const { result, rerender } = renderHook(({ id }) => usePedidoAlServidor(id, true), {
      initialProps: { id: ID },
    })
    expect(refresh).toHaveBeenCalledTimes(1)
    rerender({ id: OTRO })
    expect(refresh).toHaveBeenCalledTimes(2)
    expect(result.current.yaPedido).toBe(true)
  })

  it('pedir() de «Reintentar» pide aunque ya se haya pedido', () => {
    const { result } = renderHook(() => usePedidoAlServidor(ID, true))
    act(() => {
      result.current.pedir()
    })
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('sin id no pide nada', () => {
    const { result } = renderHook(() => usePedidoAlServidor(null, true))
    act(() => {
      result.current.pedir()
    })
    expect(refresh).not.toHaveBeenCalled()
    expect(result.current.yaPedido).toBe(false)
  })
})
