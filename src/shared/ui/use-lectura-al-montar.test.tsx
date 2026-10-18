import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fallo, ok } from '../lib/errores'
import { useLecturaAlMontar } from './use-lectura-al-montar'

afterEach(cleanup)

describe('useLecturaAlMontar', () => {
  it('lee al montarse, una vez, y entrega lo leído', async () => {
    const leer = vi.fn(() => Promise.resolve(ok('fotos')))
    const { result } = renderHook(() => useLecturaAlMontar(leer, 'a'))
    expect(result.current.lectura).toEqual({ estado: 'leyendo' })
    await waitFor(() => {
      expect(result.current.lectura).toEqual({ estado: 'leido', dato: 'fotos' })
    })
    expect(leer).toHaveBeenCalledTimes(1)
  })

  it('un fallo se dice y «reintentar» vuelve a leer', async () => {
    const leer = vi
      .fn<() => Promise<ReturnType<typeof ok<string>> | ReturnType<typeof fallo>>>()
      .mockResolvedValueOnce(fallo('inesperado', 'No se pudo.'))
      .mockResolvedValueOnce(ok('bien'))
    const { result } = renderHook(() => useLecturaAlMontar(leer, 'a'))
    await waitFor(() => {
      expect(result.current.lectura.estado).toBe('fallo')
    })
    act(() => {
      result.current.reintentar()
    })
    await waitFor(() => {
      expect(result.current.lectura).toEqual({ estado: 'leido', dato: 'bien' })
    })
    expect(leer).toHaveBeenCalledTimes(2)
  })

  it('al cambiar de clave vuelve a leer, y una respuesta tardía de la anterior se descarta', async () => {
    let soltarLaPrimera: (valor: ReturnType<typeof ok<string>>) => void = () => undefined
    const leer = vi
      .fn<() => Promise<ReturnType<typeof ok<string>>>>()
      .mockImplementationOnce(
        () =>
          new Promise((listo) => {
            soltarLaPrimera = listo
          }),
      )
      .mockResolvedValueOnce(ok('segunda'))
    const { result, rerender } = renderHook(({ clave }) => useLecturaAlMontar(leer, clave), {
      initialProps: { clave: 'a' },
    })
    rerender({ clave: 'b' })
    await waitFor(() => {
      expect(result.current.lectura).toEqual({ estado: 'leido', dato: 'segunda' })
    })
    act(() => {
      soltarLaPrimera(ok('primera'))
    })
    await Promise.resolve()
    expect(result.current.lectura).toEqual({ estado: 'leido', dato: 'segunda' })
  })
})
