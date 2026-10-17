import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFormularioDeMovida } from './use-formulario-de-movida'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function montar(alMover = vi.fn(() => Promise.resolve(true))) {
  const alCerrar = vi.fn()
  const hook = renderHook(() => useFormularioDeMovida({ alMover, alCerrar }))
  return { ...hook, alMover, alCerrar }
}

describe('useFormularioDeMovida: el envío', () => {
  it('mueve con el motivo recortado y cierra', async () => {
    const { result, alMover, alCerrar } = montar()
    act(() => {
      result.current.escribir('  Compró en otra parte  ')
    })
    let hecho = false
    await act(async () => {
      hecho = await result.current.enviar()
    })
    expect(hecho).toBe(true)
    expect(alMover).toHaveBeenCalledWith('Compró en otra parte')
    expect(alCerrar).toHaveBeenCalledTimes(1)
  })

  it('sin motivo mueve igual, con nulo', async () => {
    const { result, alMover } = montar()
    await act(async () => {
      await result.current.enviar()
    })
    expect(alMover).toHaveBeenCalledWith(null)
  })

  it('un motivo de más de 200 caracteres no se manda y dice por qué', async () => {
    const { result, alMover, alCerrar } = montar()
    act(() => {
      result.current.escribir('x'.repeat(201))
    })
    expect(result.current.error).toBe('El motivo lleva hasta 200 caracteres.')
    let hecho = true
    await act(async () => {
      hecho = await result.current.enviar()
    })
    expect(hecho).toBe(false)
    expect(alMover).not.toHaveBeenCalled()
    expect(alCerrar).not.toHaveBeenCalled()
  })

  it('si la base lo rechaza no cierra y conserva lo escrito', async () => {
    const { result, alCerrar } = montar(vi.fn(() => Promise.resolve(false)))
    act(() => {
      result.current.escribir('Se fue')
    })
    let hecho = true
    await act(async () => {
      hecho = await result.current.enviar()
    })
    expect(hecho).toBe(false)
    expect(alCerrar).not.toHaveBeenCalled()
    expect(result.current.motivo).toBe('Se fue')
    expect(result.current.enCurso).toBe(false)
  })
})

describe('useFormularioDeMovida: lo que lo frena', () => {
  it('sin conexión no manda nada', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
    const { result, alMover } = montar()
    expect(result.current.enLinea).toBe(false)
    let hecho = true
    await act(async () => {
      hecho = await result.current.enviar()
    })
    expect(hecho).toBe(false)
    expect(alMover).not.toHaveBeenCalled()
  })

  it('un segundo envío mientras el primero sigue en vuelo no manda otro', async () => {
    let terminar: (movida: boolean) => void = () => undefined
    const alMover = vi.fn(
      () =>
        new Promise<boolean>((listo) => {
          terminar = listo
        }),
    )
    const { result } = montar(alMover)
    let primero: Promise<boolean> = Promise.resolve(false)
    let segundo = true
    await act(async () => {
      primero = result.current.enviar()
      segundo = await result.current.enviar()
    })
    expect(segundo).toBe(false)
    expect(alMover).toHaveBeenCalledTimes(1)
    await act(async () => {
      terminar(true)
      await primero
    })
  })

  it('hay cambios sólo si se escribió algo (los espacios no cuentan)', () => {
    const { result } = montar()
    expect(result.current.hayCambios).toBe(false)
    act(() => {
      result.current.escribir('   ')
    })
    expect(result.current.hayCambios).toBe(false)
    act(() => {
      result.current.escribir('algo')
    })
    expect(result.current.hayCambios).toBe(true)
  })
})
