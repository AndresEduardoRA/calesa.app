import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const leer = vi.fn()
vi.mock('../../../composicion.client', () => ({
  leerLayoutActivo: (origenId: string) => leer(origenId),
}))

import { useLayoutActivo } from './use-layout-activo'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const LAYOUT = { campos: [], categorias: [] }

describe('useLayoutActivo', () => {
  it('lee el layout del origen al montarse: primero carga, después queda listo', async () => {
    leer.mockResolvedValue({ ok: true, data: LAYOUT })
    const { result } = renderHook(() => useLayoutActivo('o'))
    expect(result.current.leido.estado).toBe('cargando')
    await waitFor(() => expect(result.current.leido.estado).toBe('listo'))
    expect(leer).toHaveBeenCalledWith('o')
    expect(leer).toHaveBeenCalledTimes(1)
  })

  it('un error, o una lectura que revienta, queda como error y reintentar vuelve a leer', async () => {
    leer.mockRejectedValueOnce(new Error('red'))
    const { result } = renderHook(() => useLayoutActivo('o'))
    await waitFor(() => expect(result.current.leido.estado).toBe('error'))
    leer.mockResolvedValue({ ok: true, data: LAYOUT })
    act(() => {
      result.current.reintentar()
    })
    expect(result.current.leido.estado).toBe('cargando')
    await waitFor(() => expect(result.current.leido.estado).toBe('listo'))
    expect(leer).toHaveBeenCalledTimes(2)
  })

  it('al cambiar de origen vuelve a leer y no muestra el layout del anterior', async () => {
    leer.mockResolvedValue({ ok: true, data: LAYOUT })
    const { result, rerender } = renderHook(({ id }) => useLayoutActivo(id), {
      initialProps: { id: 'o1' },
    })
    await waitFor(() => expect(result.current.leido.estado).toBe('listo'))
    rerender({ id: 'o2' })
    expect(result.current.leido.estado).toBe('cargando')
    await waitFor(() => expect(result.current.leido.estado).toBe('listo'))
    expect(leer).toHaveBeenLastCalledWith('o2')
  })
})
