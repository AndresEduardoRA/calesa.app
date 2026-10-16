import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useConflictoHastaLaVersion } from './use-conflicto-hasta-la-version'

describe('useConflictoHastaLaVersion', () => {
  it('el conflicto queda hasta que llega otra versión, y se va solo con ella', () => {
    const { result, rerender } = renderHook(({ version }) => useConflictoHastaLaVersion(version), {
      initialProps: { version: 'v1' as string | null },
    })
    act(() => {
      result.current[1]('Cambiaste esto hace 3 min desde otra ventana.')
    })
    rerender({ version: 'v1' })
    expect(result.current[0]).toBe('Cambiaste esto hace 3 min desde otra ventana.')
    rerender({ version: 'v2' })
    expect(result.current[0]).toBeNull()
  })
})
