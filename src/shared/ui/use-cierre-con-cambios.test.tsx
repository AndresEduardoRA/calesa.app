import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCierreConCambios } from './use-cierre-con-cambios'

describe('useCierreConCambios', () => {
  it('sin cambios cierra directo', () => {
    const alCerrar = vi.fn()
    const { result } = renderHook(() => useCierreConCambios({ hayCambios: false, alCerrar }))
    act(() => {
      result.current.intentarCerrar()
    })
    expect(alCerrar).toHaveBeenCalledTimes(1)
    expect(result.current.confirmando).toBe(false)
  })

  it('con cambios pregunta, y un segundo intento vuelve al formulario sin cerrar', () => {
    const alCerrar = vi.fn()
    const { result } = renderHook(() => useCierreConCambios({ hayCambios: true, alCerrar }))
    act(() => {
      result.current.intentarCerrar()
    })
    expect(result.current.confirmando).toBe(true)
    act(() => {
      result.current.intentarCerrar()
    })
    expect(result.current.confirmando).toBe(false)
    expect(alCerrar).not.toHaveBeenCalled()
  })

  it('«Seguir editando» vuelve sin cerrar', () => {
    const alCerrar = vi.fn()
    const { result } = renderHook(() => useCierreConCambios({ hayCambios: true, alCerrar }))
    act(() => {
      result.current.intentarCerrar()
    })
    act(() => {
      result.current.seguir()
    })
    expect(result.current.confirmando).toBe(false)
    expect(alCerrar).not.toHaveBeenCalled()
  })

  it('«Descartar» tira lo escrito y cierra, en ese orden', () => {
    const orden: string[] = []
    const { result } = renderHook(() =>
      useCierreConCambios({
        hayCambios: true,
        alCerrar: () => orden.push('cerrar'),
        alDescartar: () => orden.push('descartar'),
      }),
    )
    act(() => {
      result.current.intentarCerrar()
    })
    act(() => {
      result.current.descartar()
    })
    expect(orden).toEqual(['descartar', 'cerrar'])
    expect(result.current.confirmando).toBe(false)
  })
})
