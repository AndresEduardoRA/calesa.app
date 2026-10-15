import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useConsultaDeMedios } from './use-consulta-de-medios'

type Oyente = () => void

// Un `matchMedia` de mentira: dice si calza y deja avisar un cambio.
function simular(inicial: boolean) {
  const oyentes = new Set<Oyente>()
  let calza = inicial
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return calza
      },
      addEventListener: (_: string, oyente: Oyente) => oyentes.add(oyente),
      removeEventListener: (_: string, oyente: Oyente) => oyentes.delete(oyente),
    })),
  )
  return {
    cambiar: (valor: boolean) => {
      calza = valor
      oyentes.forEach((oyente) => {
        oyente()
      })
    },
    oyentes,
  }
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useConsultaDeMedios', () => {
  it('dice si la consulta se cumple y sigue sus cambios', () => {
    const medios = simular(false)
    const { result } = renderHook(() => useConsultaDeMedios('(min-width: 640px)'))
    expect(result.current).toBe(false)
    act(() => {
      medios.cambiar(true)
    })
    expect(result.current).toBe(true)
  })

  it('deja de escuchar al desmontarse', () => {
    const medios = simular(true)
    const { unmount } = renderHook(() => useConsultaDeMedios('(min-width: 640px)'))
    expect(medios.oyentes.size).toBe(1)
    unmount()
    expect(medios.oyentes.size).toBe(0)
  })
})
