import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { salirSinPerder } from './salida-con-cambios'
import { useCierreConCambios } from './use-cierre-con-cambios'

afterEach(cleanup)

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

describe('useCierreConCambios: una salida desde afuera', () => {
  it('una salida desde afuera con cambios pregunta; «Descartar» tira lo escrito y sale sin cerrar', () => {
    const orden: string[] = []
    const { result } = renderHook(() =>
      useCierreConCambios({
        hayCambios: true,
        alCerrar: () => orden.push('cerrar'),
        alDescartar: () => orden.push('descartar'),
        abierto: true,
      }),
    )
    act(() => {
      salirSinPerder(() => orden.push('salir'))
    })
    expect(result.current.confirmando).toBe(true)
    expect(orden).toEqual([])
    act(() => {
      result.current.descartar()
    })
    expect(orden).toEqual(['descartar', 'salir'])
  })

  it('«Seguir editando» olvida la salida pedida', () => {
    const salir = vi.fn()
    const { result } = renderHook(() =>
      useCierreConCambios({ hayCambios: true, alCerrar: vi.fn(), abierto: true }),
    )
    act(() => {
      salirSinPerder(salir)
    })
    act(() => {
      result.current.seguir()
    })
    act(() => {
      result.current.intentarCerrar()
    })
    act(() => {
      result.current.descartar()
    })
    expect(salir).not.toHaveBeenCalled()
  })

  it('cerrado o sin cambios no se anota: la salida sigue directo', () => {
    const salir = vi.fn()
    const { rerender, unmount } = renderHook(
      ({ abierto, hayCambios }) => useCierreConCambios({ hayCambios, alCerrar: vi.fn(), abierto }),
      { initialProps: { abierto: false, hayCambios: true } },
    )
    salirSinPerder(salir)
    rerender({ abierto: true, hayCambios: false })
    salirSinPerder(salir)
    expect(salir).toHaveBeenCalledTimes(2)
    unmount()
  })
  it('si lo escrito se guarda o se deshace mientras pregunta, ya no pregunta', () => {
    const { result, rerender } = renderHook(
      ({ hayCambios }) => useCierreConCambios({ hayCambios, alCerrar: vi.fn() }),
      { initialProps: { hayCambios: true } },
    )
    act(() => {
      result.current.intentarCerrar()
    })
    expect(result.current.confirmando).toBe(true)
    rerender({ hayCambios: false })
    expect(result.current.confirmando).toBe(false)
  })
})
