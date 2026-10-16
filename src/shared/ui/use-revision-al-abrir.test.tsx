import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRevisionAlAbrir } from './use-revision-al-abrir'

const avisarError = vi.fn()
vi.mock('./toasts', () => ({ avisarError: (e: unknown) => avisarError(e) }))

beforeEach(() => {
  avisarError.mockReset()
})

describe('useRevisionAlAbrir', () => {
  it('lo que no se puede abrir se rechaza, se avisa una vez y se cierra', () => {
    const cerrar = vi.fn()
    const { result, rerender } = renderHook(
      ({ clave, motivo }) => useRevisionAlAbrir(clave, motivo, cerrar),
      { initialProps: { clave: '1:x' as string | null, motivo: 'No está.' as string | null } },
    )
    expect(result.current).toBe(true)
    rerender({ clave: '1:x', motivo: 'No está.' })
    expect(avisarError).toHaveBeenCalledTimes(1)
    expect(avisarError).toHaveBeenCalledWith({ codigo: 'no_encontrado', mensaje: 'No está.' })
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('lo aceptado al abrir no se rechaza después aunque deje de poder abrirse', () => {
    const cerrar = vi.fn()
    const { result, rerender } = renderHook(
      ({ clave, motivo }) => useRevisionAlAbrir(clave, motivo, cerrar),
      { initialProps: { clave: '1:x' as string | null, motivo: null as string | null } },
    )
    expect(result.current).toBe(false)
    rerender({ clave: '1:x', motivo: 'Ya está completado.' })
    expect(result.current).toBe(false)
    expect(cerrar).not.toHaveBeenCalled()
    // Otra apertura (otra clave) se vuelve a revisar.
    rerender({ clave: '2:x', motivo: 'Ya está completado.' })
    expect(result.current).toBe(true)
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('sin clave no hay nada que revisar', () => {
    const cerrar = vi.fn()
    const { result } = renderHook(() => useRevisionAlAbrir(null, 'No está.', cerrar))
    expect(result.current).toBe(false)
    expect(cerrar).not.toHaveBeenCalled()
  })
})
