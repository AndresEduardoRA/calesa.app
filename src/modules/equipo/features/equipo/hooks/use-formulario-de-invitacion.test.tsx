import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MOTIVO_ROL_NO_DOMINADO } from '../../../entities/dominancia'

const ejecutar = vi.fn()
vi.mock('next-safe-action/hooks', () => ({ useAction: () => ({ executeAsync: ejecutar }) }))
vi.mock('../actions/invitar', () => ({ invitar: {} }))

const { useFormularioDeInvitacion } = await import('./use-formulario-de-invitacion')

const ROL = '0b1f2d3c-4e5f-4a6b-8c7d-9e0f1a2b3c4d'

function llenar(hook: { current: ReturnType<typeof useFormularioDeInvitacion> }) {
  act(() => {
    hook.current.escribir('email', ' Ana@Ejemplo.com ')
    hook.current.escribir('rolId', ROL)
  })
}

beforeEach(() => {
  ejecutar.mockReset()
})

describe('useFormularioDeInvitacion', () => {
  it('con un correo o un rol elegido hay cambios; vacío, no', () => {
    const { result } = renderHook(() =>
      useFormularioDeInvitacion({ abierto: true, alInvitar: vi.fn() }),
    )
    expect(result.current.hayCambios).toBe(false)
    act(() => {
      result.current.escribir('rolId', ROL)
    })
    expect(result.current.hayCambios).toBe(true)
  })

  it('sin correo válido ni rol, dice cada motivo junto a su campo y no pide nada', async () => {
    const { result } = renderHook(() =>
      useFormularioDeInvitacion({ abierto: true, alInvitar: vi.fn() }),
    )
    await act(async () => {
      await result.current.enviar()
    })
    expect(ejecutar).not.toHaveBeenCalled()
    expect(result.current.errores['email']).toBe('Escribe un correo válido.')
    expect(result.current.errores['rolId']).toBe('Elige el rol con el que entra.')
  })

  it('al invitar entrega lo hecho con el correo normalizado', async () => {
    const alInvitar = vi.fn()
    ejecutar.mockResolvedValueOnce({
      data: { ok: true, data: { personaId: 'p-1', correoEnviado: true, enlace: null } },
    })
    const { result } = renderHook(() => useFormularioDeInvitacion({ abierto: true, alInvitar }))
    llenar(result)
    await act(async () => {
      await result.current.enviar()
    })
    expect(alInvitar).toHaveBeenCalledWith({
      personaId: 'p-1',
      correoEnviado: true,
      enlace: null,
      email: 'ana@ejemplo.com',
    })
  })

  it('el rol que no domina va junto al rol; el correo que ya aceptó, junto al correo; lo demás, arriba', async () => {
    const { result } = renderHook(() =>
      useFormularioDeInvitacion({ abierto: true, alInvitar: vi.fn() }),
    )
    llenar(result)
    ejecutar.mockResolvedValueOnce({
      data: { ok: false, error: { codigo: 'sin_permiso', mensaje: MOTIVO_ROL_NO_DOMINADO } },
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.errores).toEqual({ rolId: MOTIVO_ROL_NO_DOMINADO })

    ejecutar.mockResolvedValueOnce({
      data: {
        ok: false,
        error: { codigo: 'regla', mensaje: 'Esa persona ya aceptó su invitación.' },
      },
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.errores).toEqual({ email: 'Esa persona ya aceptó su invitación.' })

    ejecutar.mockResolvedValueOnce({
      data: {
        ok: false,
        error: { codigo: 'sin_permiso', mensaje: 'No tienes permiso para invitar.' },
      },
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.errores).toEqual({})
    expect(result.current.aviso).toBe('No tienes permiso para invitar.')
  })
})
