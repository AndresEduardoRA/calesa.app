import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoDeEncima } from '../../../entities/resultado-de-encima'

const { ejecutar, push, refresh, avisarExito } = vi.hoisted(() => ({
  ejecutar: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  avisarExito: vi.fn(),
}))
vi.mock('next-safe-action/hooks', () => ({ useAction: () => ({ executeAsync: ejecutar }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))
vi.mock('@/shared/ui/toasts', () => ({ avisarExito }))
vi.mock('../actions/cotizar-encima', () => ({ cotizarEncima: {} }))

import { useCotizarEncima } from './use-cotizar-encima'

const ANTERIOR = '00000000-0000-4000-8000-0000000000aa'
const NUEVA = '00000000-0000-4000-8000-0000000000cc'
const respuesta = (data: ResultadoDeEncima) => ({ data: { ok: true as const, data } })
const creada = (descartados = 0): ResultadoDeEncima => ({
  tipo: 'creada',
  id: NUEVA,
  numero: 42,
  version: 2,
  descartados,
})
const intentoDe = (llamada: number) =>
  (ejecutar.mock.calls[llamada]?.[0] as { intento: string }).intento

beforeEach(() => {
  ejecutar.mockReset()
  push.mockReset()
  refresh.mockReset()
  avisarExito.mockReset()
})

describe('useCotizarEncima (C12)', () => {
  it('manda la anterior y un intento; tras una pérdida el reintento usa el mismo', async () => {
    ejecutar.mockResolvedValueOnce(respuesta({ tipo: 'perdida' }))
    ejecutar.mockResolvedValueOnce(respuesta(creada()))
    const { result } = renderHook(() => useCotizarEncima({ anterior: ANTERIOR }))
    await act(async () => {
      await result.current.cotizar()
    })
    expect(result.current.resultado).toEqual({ tipo: 'perdida' })
    await act(async () => {
      await result.current.cotizar()
    })
    expect(ejecutar.mock.calls[0]?.[0]).toMatchObject({ anterior: ANTERIOR })
    expect(intentoDe(1)).toBe(intentoDe(0))
  })

  it('un servidor que no responde también es una pérdida: conserva el intento', async () => {
    ejecutar.mockResolvedValueOnce(undefined)
    ejecutar.mockResolvedValueOnce(respuesta(creada()))
    const { result } = renderHook(() => useCotizarEncima({ anterior: ANTERIOR }))
    await act(async () => {
      await result.current.cotizar()
    })
    expect(result.current.resultado).toEqual({ tipo: 'perdida' })
    await act(async () => {
      await result.current.cotizar()
    })
    expect(intentoDe(1)).toBe(intentoDe(0))
  })

  it('con cualquier otra respuesta el intento se olvida y el próximo es nuevo', async () => {
    ejecutar.mockResolvedValueOnce(respuesta({ tipo: 'reintentar' }))
    ejecutar.mockResolvedValueOnce(respuesta({ tipo: 'reintentar' }))
    const { result } = renderHook(() => useCotizarEncima({ anterior: ANTERIOR }))
    await act(async () => {
      await result.current.cotizar()
    })
    await act(async () => {
      await result.current.cotizar()
    })
    expect(intentoDe(1)).not.toBe(intentoDe(0))
  })

  it('un envío a la vez', async () => {
    let terminar: (r: unknown) => void = () => {}
    ejecutar.mockReturnValueOnce(new Promise((resolver) => (terminar = resolver)))
    const { result } = renderHook(() => useCotizarEncima({ anterior: ANTERIOR }))
    let primero: Promise<void> = Promise.resolve()
    act(() => {
      primero = result.current.cotizar()
      void result.current.cotizar()
    })
    expect(ejecutar).toHaveBeenCalledTimes(1)
    expect(result.current.enviando).toBe(true)
    await act(async () => {
      terminar(respuesta(creada()))
      await primero
    })
  })
})

describe('useCotizarEncima: la nueva y «Recargar»', () => {
  it('creada: avisa «Versión W creada (n.º M).» y navega a la nueva', async () => {
    ejecutar.mockResolvedValueOnce(respuesta(creada()))
    const { result } = renderHook(() => useCotizarEncima({ anterior: ANTERIOR }))
    await act(async () => {
      await result.current.cotizar()
    })
    expect(avisarExito).toHaveBeenCalledWith('Versión 2 creada (n.º 42).')
    expect(push).toHaveBeenCalledWith(`/cotizaciones/${NUEVA}`)
  })

  it('lo descartado se dice: uno y varios', async () => {
    for (const [descartados, texto] of [
      [1, 'Versión 2 creada (n.º 42). 1 dato que tipeaste no sigue en la versión de hoy.'],
      [4, 'Versión 2 creada (n.º 42). 4 datos que tipeaste no siguen en la versión de hoy.'],
    ] as const) {
      ejecutar.mockResolvedValueOnce(respuesta(creada(descartados)))
      const { result } = renderHook(() => useCotizarEncima({ anterior: ANTERIOR }))
      await act(async () => {
        await result.current.cotizar()
      })
      expect(avisarExito).toHaveBeenLastCalledWith(texto)
    }
  })

  it('«Recargar» pide la página al servidor y olvida el mensaje de antes', async () => {
    ejecutar.mockResolvedValueOnce(respuesta({ tipo: 'sin_acceso' }))
    const { result } = renderHook(() => useCotizarEncima({ anterior: ANTERIOR }))
    await act(async () => {
      await result.current.cotizar()
    })
    expect(result.current.resultado).toEqual({ tipo: 'sin_acceso' })
    act(() => {
      result.current.recargar()
    })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(result.current.resultado).toBeNull()
  })
})
