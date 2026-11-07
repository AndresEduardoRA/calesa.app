import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'

const pedidos: { ruta: string; resolver: (r: Resultado<Blob>) => void }[] = []
vi.mock('../../../areas/tarjeta/composicion.client', () => ({
  pedirElPdf: (ruta: string) =>
    new Promise<Resultado<Blob>>((resolver) => {
      pedidos.push({ ruta, resolver })
    }),
}))

import { ESPERA_PARA_SOLTAR_MS, useDescargaDelPdf } from './use-descarga-del-pdf'

const ID = '00000000-0000-4000-8000-0000000000aa'
const nombres: string[] = []
const crear = vi.fn(() => 'blob:prueba')
const soltar = vi.fn()

beforeEach(() => {
  pedidos.length = 0
  nombres.length = 0
  crear.mockClear()
  soltar.mockClear()
  vi.useFakeTimers()
  URL.createObjectURL = crear
  URL.revokeObjectURL = soltar
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    nombres.push(`${this.download}|${this.href}`)
  })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useDescargaDelPdf', () => {
  it('pide la ruta del PDF, mientras tanto está bajando y baja cotizacion-<n>.pdf', async () => {
    const { result } = renderHook(() => useDescargaDelPdf(ID, 1234))
    act(() => {
      result.current.descargar()
    })
    expect(result.current.estado).toEqual({ tipo: 'bajando' })
    expect(pedidos.map((p) => p.ruta)).toEqual([`/cotizaciones/${ID}/pdf`])
    await act(async () => {
      pedidos[0]?.resolver({ ok: true, data: new Blob(['%PDF']) })
      await Promise.resolve()
    })
    expect(result.current.estado).toEqual({ tipo: 'quieta' })
    expect(nombres).toEqual(['cotizacion-1234.pdf|blob:prueba'])
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('suelta la URL del blob después de bajarlo', async () => {
    const { result } = renderHook(() => useDescargaDelPdf(ID, 5))
    act(() => {
      result.current.descargar()
    })
    await act(async () => {
      pedidos[0]?.resolver({ ok: true, data: new Blob(['%PDF']) })
      await Promise.resolve()
    })
    expect(soltar).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(ESPERA_PARA_SOLTAR_MS)
    })
    expect(soltar).toHaveBeenCalledWith('blob:prueba')
  })

  it('un fallo no baja nada, dice su código y se puede volver a pedir', async () => {
    const { result } = renderHook(() => useDescargaDelPdf(ID, 5))
    act(() => {
      result.current.descargar()
    })
    await act(async () => {
      pedidos[0]?.resolver({ ok: false, error: { codigo: 'no_encontrado', mensaje: 'x' } })
      await Promise.resolve()
    })
    expect(result.current.estado).toEqual({ tipo: 'fallo', codigo: 'no_encontrado' })
    expect(nombres).toEqual([])
    act(() => {
      result.current.descargar()
    })
    expect(result.current.estado).toEqual({ tipo: 'bajando' })
    expect(pedidos).toHaveLength(2)
  })
})
