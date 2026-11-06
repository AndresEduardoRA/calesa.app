import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Envio } from '@/shared/lib/enviar-accion'
import { useDescarteDelBorrador } from './use-descarte-del-borrador'

function montar(pedir: () => Promise<Envio<null>>) {
  const alDescartar = vi.fn()
  const hook = renderHook(() => useDescarteDelBorrador({ pedir, alDescartar }))
  return { ...hook, alDescartar }
}

const confirmar = async (result: { current: { confirmar: () => Promise<void> } }) => {
  await act(async () => {
    await result.current.confirmar()
  })
}

describe('useDescarteDelBorrador', () => {
  it('entró: avisa a quien lo usa una vez y no deja aviso', async () => {
    const pedir = vi.fn().mockResolvedValue({ ok: true, data: null })
    const { result, alDescartar } = montar(pedir)
    await confirmar(result)
    expect(pedir).toHaveBeenCalledTimes(1)
    expect(alDescartar).toHaveBeenCalledTimes(1)
    expect(result.current.aviso).toBeNull()
  })

  it('un error deja su mensaje en el aviso y no cierra; volver a confirmar lo borra', async () => {
    const pedir = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        error: {
          codigo: 'sin_permiso',
          mensaje: 'No tienes permiso para configurar la fórmula de este origen.',
        },
      })
      .mockReturnValueOnce(new Promise(() => {}))
    const { result, alDescartar } = montar(pedir)
    await confirmar(result)
    expect(result.current.aviso).toBe(
      'No tienes permiso para configurar la fórmula de este origen.',
    )
    expect(alDescartar).not.toHaveBeenCalled()
    act(() => {
      void result.current.confirmar()
    })
    expect(result.current.aviso).toBeNull()
    expect(result.current.enCurso).toBe(true)
  })

  it('sin respuesta no dice que el borrador sigue y no reintenta solo', async () => {
    const pedir = vi.fn().mockResolvedValue({
      ok: false,
      sinRed: true,
      error: { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' },
    })
    const { result, alDescartar } = montar(pedir)
    await confirmar(result)
    expect(result.current.aviso).toBe('No sabemos si se descartó: recarga para verlo.')
    expect(alDescartar).not.toHaveBeenCalled()
    await act(async () => {
      window.dispatchEvent(new Event('online'))
      await Promise.resolve()
    })
    expect(pedir).toHaveBeenCalledTimes(1)
  })

  it('dos confirmar seguidos mandan un solo pedido', async () => {
    let soltar: (envio: Envio<null>) => void = () => {}
    const pedir = vi.fn(
      () =>
        new Promise<Envio<null>>((resolver) => {
          soltar = resolver
        }),
    )
    const { result } = montar(pedir)
    await act(async () => {
      void result.current.confirmar()
      void result.current.confirmar()
      await Promise.resolve()
    })
    expect(pedir).toHaveBeenCalledTimes(1)
    await act(async () => {
      soltar({ ok: true, data: null })
      await Promise.resolve()
    })
  })
})
