import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Envio } from '@/shared/lib/enviar-accion'
import { useDescarteDeLaPlantilla } from './use-descarte-de-la-plantilla'

const refrescar = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refrescar }) }))

const V1 = '2026-11-07T10:00:00.123456+00:00'
const V2 = '2026-11-07T11:00:00.654321+00:00'

beforeEach(() => {
  refrescar.mockReset()
})

type Props = { esperada: string | null }

function montar(pedir: (esperada: string) => Promise<Envio<null>>) {
  const alDescartar = vi.fn()
  const hook = renderHook(
    ({ esperada }: Props) => useDescarteDeLaPlantilla({ esperada, pedir, alDescartar }),
    { initialProps: { esperada: V1 } as Props },
  )
  return { ...hook, alDescartar }
}

const confirmar = async (result: { current: { confirmar: () => Promise<void> } }) => {
  await act(async () => {
    await result.current.confirmar()
  })
}

describe('useDescarteDeLaPlantilla', () => {
  it('entró: pide con la esperada de ahora, avisa una vez y no deja aviso', async () => {
    const pedir = vi.fn().mockResolvedValue({ ok: true, data: null })
    const { result, alDescartar } = montar(pedir)
    await confirmar(result)
    expect(pedir).toHaveBeenCalledWith(V1)
    expect(alDescartar).toHaveBeenCalledTimes(1)
    expect(result.current.aviso).toBeNull()
    expect(result.current.descartado).toBe(true)
  })

  it('un PT409 queda como conflicto, no vuelve a pedir y se va al CAMBIAR la esperada; «Recargar» refresca', async () => {
    const pedir = vi.fn().mockResolvedValue({
      ok: false,
      error: {
        codigo: 'conflicto',
        mensaje: 'El borrador de esta plantilla cambió hace 1 min, mientras lo editabas.',
      },
    })
    const { result, rerender, alDescartar } = montar(pedir)
    await confirmar(result)
    expect(result.current.conflicto).toBe(
      'El borrador de esta plantilla cambió hace 1 min, mientras lo editabas.',
    )
    expect(alDescartar).not.toHaveBeenCalled()
    await confirmar(result)
    expect(pedir).toHaveBeenCalledTimes(1)
    act(() => {
      result.current.recargar()
    })
    expect(refrescar).toHaveBeenCalledTimes(1)
    expect(result.current.conflicto).not.toBeNull()
    rerender({ esperada: V2 })
    expect(result.current.conflicto).toBeNull()
  })
})

describe('useDescarteDeLaPlantilla: lo que no entra', () => {
  it('otro error deja su mensaje en el aviso y no cierra; volver a confirmar lo borra', async () => {
    const pedir = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        error: {
          codigo: 'sin_permiso',
          mensaje: 'No tienes permiso para configurar la plantilla de este origen.',
        },
      })
      .mockReturnValueOnce(new Promise(() => {}))
    const { result, alDescartar } = montar(pedir)
    await confirmar(result)
    expect(result.current.aviso).toBe(
      'No tienes permiso para configurar la plantilla de este origen.',
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

  it('con esperada nula no pide', async () => {
    const pedir = vi.fn()
    const { result, rerender } = montar(pedir)
    rerender({ esperada: null })
    await confirmar(result)
    expect(pedir).not.toHaveBeenCalled()
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
