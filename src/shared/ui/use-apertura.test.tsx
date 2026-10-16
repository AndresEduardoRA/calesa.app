import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useApertura } from './use-apertura'

describe('useApertura', () => {
  it('cuenta las aperturas y no cambia al cerrar', () => {
    const { result, rerender } = renderHook(({ abierto }) => useApertura(abierto), {
      initialProps: { abierto: false },
    })
    expect(result.current).toBe(0)
    rerender({ abierto: true })
    expect(result.current).toBe(1)
    rerender({ abierto: false })
    expect(result.current).toBe(1)
    rerender({ abierto: true })
    expect(result.current).toBe(2)
  })

  it('abierto desde el principio (la URL lo trae al recargar) ya es la primera', () => {
    const { result } = renderHook(() => useApertura(true))
    expect(result.current).toBe(1)
  })
})
