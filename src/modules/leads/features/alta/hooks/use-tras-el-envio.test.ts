import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSoltarTrasElEnvio, useTrasElEnvio } from './use-tras-el-envio'

// 9-7: lo que sigue a guardar (el aviso) sale cuando `isPending` volvió a falso, no al resolver la promesa.
function dibujar(enCurso: boolean) {
  return renderHook(
    ({ enCurso: e }: { enCurso: boolean }) => {
      const tras = useTrasElEnvio()
      useSoltarTrasElEnvio(tras, e)
      return tras
    },
    { initialProps: { enCurso } },
  )
}

describe('useTrasElEnvio', () => {
  it('con el envío en curso lo encolado espera, y al terminar sale una vez', () => {
    const avisar = vi.fn()
    const { result, rerender } = dibujar(true)
    act(() => {
      result.current.despues(avisar)
    })
    rerender({ enCurso: true })
    expect(avisar).not.toHaveBeenCalled()
    rerender({ enCurso: false })
    expect(avisar).toHaveBeenCalledTimes(1)
    rerender({ enCurso: false })
    rerender({ enCurso: true })
    rerender({ enCurso: false })
    expect(avisar).toHaveBeenCalledTimes(1)
  })

  it('encolado sin envío en curso sale en el render siguiente', () => {
    const avisar = vi.fn()
    const { result } = dibujar(false)
    act(() => {
      result.current.despues(avisar)
    })
    expect(avisar).toHaveBeenCalledTimes(1)
  })

  it('varias encoladas salen en orden', () => {
    const orden: string[] = []
    const { result, rerender } = dibujar(true)
    act(() => {
      result.current.despues(() => orden.push('aviso'))
      result.current.despues(() => orden.push('cerrar'))
    })
    rerender({ enCurso: false })
    expect(orden).toEqual(['aviso', 'cerrar'])
  })

  it('desmontado con algo en la cola (lo vuelve a montar la versión nueva), sale una vez al desmontarse', () => {
    const avisar = vi.fn()
    const { result, unmount } = dibujar(true)
    act(() => {
      result.current.despues(avisar)
    })
    expect(avisar).not.toHaveBeenCalled()
    unmount()
    expect(avisar).toHaveBeenCalledTimes(1)
  })

  it('desmontado con la cola vacía, no corre nada', () => {
    const avisar = vi.fn()
    const { result, rerender, unmount } = dibujar(true)
    act(() => {
      result.current.despues(avisar)
    })
    rerender({ enCurso: false })
    unmount()
    expect(avisar).toHaveBeenCalledTimes(1)
  })
})
