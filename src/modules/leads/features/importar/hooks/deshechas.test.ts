import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { ResultadoDeDeshacer } from '../../../entities/importacion/deshacer'
import { anotarDeshecha, useDeshecha } from './deshechas'

afterEach(cleanup)

const resultado = { movidos: 14 } as unknown as ResultadoDeDeshacer

describe('useDeshecha', () => {
  it('los dos «Deshacer» de una importación se enteran cuando uno la deshace', () => {
    const delResultado = renderHook(() => useDeshecha('imp-1'))
    const deLaLista = renderHook(() => useDeshecha('imp-1'))
    const deOtra = renderHook(() => useDeshecha('imp-2'))
    expect(delResultado.result.current).toBeNull()
    act(() => {
      anotarDeshecha('imp-1', resultado)
    })
    expect(delResultado.result.current).toBe(resultado)
    expect(deLaLista.result.current).toBe(resultado)
    expect(deOtra.result.current).toBeNull()
  })
})
