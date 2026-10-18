import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const ejecutar = vi.fn()
vi.mock('next-safe-action/hooks', () => ({ useAction: () => ({ executeAsync: ejecutar }) }))
vi.mock('../actions/crear-rol', () => ({ crearRol: {} }))
vi.mock('@/shared/ui/toasts', () => ({ avisarExito: vi.fn() }))

const { useFormularioDeRol } = await import('./use-formulario-de-rol')

beforeEach(() => {
  ejecutar.mockReset()
})

describe('useFormularioDeRol', () => {
  it('sin nada escrito no hay cambios; con un nombre o con otro color, sí', () => {
    const { result } = renderHook(() => useFormularioDeRol({ abierto: true, alCrear: vi.fn() }))
    expect(result.current.hayCambios).toBe(false)
    act(() => {
      result.current.escribir('  ')
    })
    expect(result.current.hayCambios).toBe(false)
    act(() => {
      result.current.escribir('Ventas')
    })
    expect(result.current.hayCambios).toBe(true)
  })

  it('un nombre sin letras no pide nada y se dice junto al campo', async () => {
    const { result } = renderHook(() => useFormularioDeRol({ abierto: true, alCrear: vi.fn() }))
    act(() => {
      result.current.escribir('1234')
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(ejecutar).not.toHaveBeenCalled()
    expect(result.current.errores['nombre']).toBe(
      'Usa un nombre con letras, como «Ventas» o «Logística».',
    )
  })

  it('crea y devuelve el id; un nombre repetido que rechaza la base va junto al campo', async () => {
    const alCrear = vi.fn()
    ejecutar.mockResolvedValueOnce({ data: { ok: true, data: { id: 'rol-1' } } })
    const { result } = renderHook(() => useFormularioDeRol({ abierto: true, alCrear }))
    act(() => {
      result.current.escribir('Ventas')
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(alCrear).toHaveBeenCalledWith('rol-1')

    ejecutar.mockResolvedValueOnce({
      data: { ok: false, error: { codigo: 'duplicado', mensaje: 'Ya existe un rol «Ventas».' } },
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.errores['nombre']).toBe('Ya existe un rol «Ventas».')
    expect(result.current.aviso).toBeNull()
  })

  it('un rechazo de permiso se dice arriba, no junto al campo', async () => {
    ejecutar.mockResolvedValueOnce({
      data: {
        ok: false,
        error: { codigo: 'sin_permiso', mensaje: 'No tienes permiso para crear roles.' },
      },
    })
    const { result } = renderHook(() => useFormularioDeRol({ abierto: true, alCrear: vi.fn() }))
    act(() => {
      result.current.escribir('Ventas')
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.errores).toEqual({})
    expect(result.current.aviso).toBe('No tienes permiso para crear roles.')
  })
})
