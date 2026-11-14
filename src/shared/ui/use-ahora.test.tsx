import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAhora } from './use-ahora'

describe('useAhora', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-14T16:00:30Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('empieza en el instante que dio el servidor, no en el del navegador', () => {
    const { result } = renderHook(() => useAhora('2026-11-14T15:59:00.000Z'))
    expect(result.current.toISOString()).toBe('2026-11-14T15:59:00.000Z')
  })

  it('avanza cada minuto, sin recargar', () => {
    const { result } = renderHook(() => useAhora('2026-11-14T15:59:00.000Z'))
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(result.current.toISOString()).toBe('2026-11-14T16:01:30.000Z')
  })

  it('al desmontarse deja de contar', () => {
    const { unmount } = renderHook(() => useAhora('2026-11-14T15:59:00.000Z'))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
