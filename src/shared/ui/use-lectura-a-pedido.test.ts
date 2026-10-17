import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { useLecturaAPedido } from './use-lectura-a-pedido'

function prometida<T>() {
  let resolver: (valor: Resultado<T>) => void = () => undefined
  const promesa = new Promise<Resultado<T>>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

describe('useLecturaAPedido', () => {
  it('no lee hasta que se pide, y dice que está leyendo', async () => {
    const p = prometida<number>()
    const { result } = renderHook(() => useLecturaAPedido(() => p.promesa, 'v1'))
    expect(result.current.lectura).toEqual({ estado: 'sin_pedir' })
    let pedido: Promise<void> = Promise.resolve()
    act(() => {
      pedido = result.current.pedir()
    })
    expect(result.current.lectura).toEqual({ estado: 'leyendo' })
    await act(async () => {
      p.resolver(ok(200))
      await pedido
    })
    expect(result.current.lectura).toEqual({ estado: 'leido', dato: 200 })
  })

  it('un fallo queda con su error', async () => {
    const { result } = renderHook(() =>
      useLecturaAPedido(
        () => Promise.resolve(fallo('no_encontrado', 'Ese lote ya no está en la papelera.')),
        'v1',
      ),
    )
    await act(async () => {
      await result.current.pedir()
    })
    expect(result.current.lectura).toEqual({
      estado: 'fallo',
      error: { codigo: 'no_encontrado', mensaje: 'Ese lote ya no está en la papelera.' },
    })
  })

  it('si cambia la versión, lo leído deja de valer y una respuesta tardía no lo pisa', async () => {
    const p = prometida<number>()
    let version = 'v1'
    const { result, rerender } = renderHook(() => useLecturaAPedido(() => p.promesa, version))
    let pedido: Promise<void> = Promise.resolve()
    act(() => {
      pedido = result.current.pedir()
    })
    version = 'v2'
    rerender()
    expect(result.current.lectura).toEqual({ estado: 'sin_pedir' })
    await act(async () => {
      p.resolver(ok(200))
      await pedido
    })
    expect(result.current.lectura).toEqual({ estado: 'sin_pedir' })
  })
})
