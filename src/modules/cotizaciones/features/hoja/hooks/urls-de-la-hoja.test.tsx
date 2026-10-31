import { act, renderHook } from '@testing-library/react'
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useSoltarLoAbierto } from './urls-de-la-hoja'

async function soltarDe(busqueda: string) {
  const alActualizar = vi.fn<OnUrlUpdateFunction>()
  const envoltura = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter searchParams={busqueda} onUrlUpdate={alActualizar}>
      {children}
    </NuqsTestingAdapter>
  )
  const { result } = renderHook(() => useSoltarLoAbierto(), { wrapper: envoltura })
  act(() => {
    result.current()
  })
  // Si no hay nada que soltar, la URL no se escribe.
  await new Promise((resolver) => setTimeout(resolver, 150))
  return alActualizar.mock.calls.at(-1)?.[0].searchParams.toString() ?? null
}

describe('useSoltarLoAbierto: guardada, la hoja suelta lo que tenía abierto', () => {
  it('suelta «Avanzado»', async () => {
    expect(await soltarDe('?panel=avanzado')).toBe('')
  })

  it('suelta la ayuda de texto y su nodo', async () => {
    expect(await soltarDe('?ayuda=texto&nodo=b1')).toBe('')
  })

  it('suelta la ayuda de una tabla y su nodo', async () => {
    expect(await soltarDe('?ayuda=tabla&nodo=b2')).toBe('')
  })

  it('el modal y una ayuda de tabla abiertos a la vez se sueltan juntos', async () => {
    expect(await soltarDe('?panel=avanzado&ayuda=tabla&nodo=y1')).toBe('')
  })

  it('no toca otro panel ni otra ayuda', async () => {
    expect(await soltarDe('?panel=otro&ayuda=otra&nodo=b2')).toBeNull()
  })
})
