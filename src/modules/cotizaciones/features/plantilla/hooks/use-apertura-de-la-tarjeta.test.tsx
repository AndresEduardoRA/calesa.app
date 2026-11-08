import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PanelDeLaTarjeta } from './use-panel-de-la-tarjeta'
import { useAperturaDeLaTarjeta } from './use-apertura-de-la-tarjeta'

const avisarError = vi.fn()
vi.mock('@/shared/ui/toasts', () => ({ avisarError: (e: unknown) => avisarError(e) }))

const BORRADOR = '2026-11-07T10:00:00.123456+00:00'
const OTRO = '2026-11-07T11:00:00.654321+00:00'

beforeEach(() => {
  avisarError.mockReset()
})

function panel(estado: Partial<PanelDeLaTarjeta>, cerrar = vi.fn()): PanelDeLaTarjeta {
  return {
    publicando: false,
    descartando: false,
    abrirPublicar: vi.fn(),
    abrirDescartar: vi.fn(),
    cerrar,
    ...estado,
  }
}

describe('useAperturaDeLaTarjeta', () => {
  it('publicar sin borrador no abre, avisa una vez y limpia la URL', () => {
    const cerrar = vi.fn()
    const { result, rerender } = renderHook(() =>
      useAperturaDeLaTarjeta(panel({ publicando: true }, cerrar), null),
    )
    expect(result.current.publicando).toBe(false)
    rerender()
    expect(avisarError).toHaveBeenCalledTimes(1)
    expect(avisarError).toHaveBeenCalledWith({
      codigo: 'no_encontrado',
      mensaje: 'No hay borrador para publicar.',
    })
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('descartar sin borrador no abre y avisa lo suyo', () => {
    const cerrar = vi.fn()
    const { result } = renderHook(() =>
      useAperturaDeLaTarjeta(panel({ descartando: true }, cerrar), null),
    )
    expect(result.current.descartando).toBe(false)
    expect(avisarError).toHaveBeenCalledWith({
      codigo: 'no_encontrado',
      mensaje: 'No hay borrador para descartar.',
    })
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('con borrador abre y no avisa', () => {
    const { result } = renderHook(() =>
      useAperturaDeLaTarjeta(panel({ publicando: true }), BORRADOR),
    )
    expect(result.current.publicando).toBe(true)
    expect(result.current.apertura).toBe(1)
    expect(avisarError).not.toHaveBeenCalled()
  })

  it('lo que cambia con el modal abierto no lo cierra', () => {
    const { result, rerender } = renderHook(
      ({ esperada }: { esperada: string | null }) =>
        useAperturaDeLaTarjeta(panel({ publicando: true }), esperada),
      { initialProps: { esperada: BORRADOR as string | null } },
    )
    expect(result.current.publicando).toBe(true)
    rerender({ esperada: null })
    expect(result.current.publicando).toBe(true)
    expect(avisarError).not.toHaveBeenCalled()
  })

  it('el borrador que se descarta se fija al abrir: tras irse, sigue nombrando el mismo', () => {
    const { result, rerender } = renderHook(
      ({ esperada, descartando }: { esperada: string | null; descartando: boolean }) =>
        useAperturaDeLaTarjeta(panel({ descartando }), esperada),
      { initialProps: { esperada: BORRADOR as string | null, descartando: true } },
    )
    expect(result.current.aDescartar).toBe(BORRADOR)
    rerender({ esperada: null, descartando: false })
    expect(result.current.aDescartar).toBe(BORRADOR)
    rerender({ esperada: OTRO, descartando: true })
    expect(result.current.aDescartar).toBe(OTRO)
  })
})
