import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePanelPorUrl } from './use-panel-por-url'

afterEach(cleanup)

function envoltura(busqueda: string, alCambiar?: (evento: UrlUpdateEvent) => void) {
  return function Envoltura({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter searchParams={busqueda} onUrlUpdate={alCambiar}>
        {children}
      </NuqsTestingAdapter>
    )
  }
}

describe('usePanelPorUrl', () => {
  it('está cerrado sin ?panel= y abierto con el suyo', () => {
    const cerrado = renderHook(() => usePanelPorUrl('purgar'), { wrapper: envoltura('') })
    expect(cerrado.result.current.abierto).toBe(false)
    const abierto = renderHook(() => usePanelPorUrl('purgar'), {
      wrapper: envoltura('?panel=purgar'),
    })
    expect(abierto.result.current.abierto).toBe(true)
  })

  it('no responde al panel de otro', () => {
    const { result } = renderHook(() => usePanelPorUrl('purgar'), {
      wrapper: envoltura('?panel=etapas'),
    })
    expect(result.current.abierto).toBe(false)
  })

  it('lee los valores que nombra la URL, y nulo los que faltan', () => {
    const { result } = renderHook(() => usePanelPorUrl('purgar', ['lote', 'lead']), {
      wrapper: envoltura('?panel=purgar&lote=L1'),
    })
    expect(result.current.valor('lote')).toBe('L1')
    expect(result.current.valor('lead')).toBeNull()
  })

  it('abrir suma al historial («atrás» lo cierra) y escribe el panel con sus valores', async () => {
    const eventos: UrlUpdateEvent[] = []
    const { result } = renderHook(() => usePanelPorUrl('purgar', ['lote']), {
      wrapper: envoltura('', (e) => eventos.push(e)),
    })
    act(() => {
      result.current.abrir({ lote: 'L1' })
    })
    await waitFor(() => {
      expect(result.current.abierto).toBe(true)
    })
    expect(result.current.valor('lote')).toBe('L1')
    const ultimo = eventos.at(-1)
    expect(ultimo?.options.history).toBe('push')
    expect(ultimo?.searchParams.get('panel')).toBe('purgar')
    expect(ultimo?.searchParams.get('lote')).toBe('L1')
  })

  it('cerrar quita el panel y sus valores, y deja lo demás de la URL', async () => {
    const eventos: UrlUpdateEvent[] = []
    const { result } = renderHook(() => usePanelPorUrl('purgar', ['lote']), {
      wrapper: envoltura('?panel=purgar&lote=L1&q=ana', (e) => eventos.push(e)),
    })
    act(() => {
      result.current.cerrar()
    })
    await waitFor(() => {
      expect(result.current.abierto).toBe(false)
    })
    const ultimo = eventos.at(-1)
    expect(ultimo?.searchParams.get('panel')).toBeNull()
    expect(ultimo?.searchParams.get('lote')).toBeNull()
    expect(ultimo?.searchParams.get('q')).toBe('ana')
  })

  it('abrir dos veces con la misma URL no escribe de más', async () => {
    const alCambiar = vi.fn()
    const { result } = renderHook(() => usePanelPorUrl('purgar'), {
      wrapper: envoltura('', alCambiar),
    })
    act(() => {
      result.current.abrir()
    })
    await waitFor(() => {
      expect(result.current.abierto).toBe(true)
    })
    expect(alCambiar).toHaveBeenCalledTimes(1)
  })
})
