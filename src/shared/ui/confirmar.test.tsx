import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Confirmar } from './confirmar'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function montar(cambios: Partial<Parameters<typeof Confirmar>[0]> = {}) {
  const alCerrar = vi.fn()
  const alConfirmar = vi.fn<() => Promise<unknown> | void>()
  render(
    <Confirmar
      abierto
      alCerrar={alCerrar}
      alConfirmar={alConfirmar}
      titulo="Purgar «Ana»"
      descripcion="Se borra para siempre."
      etiquetaConfirmar="Purgar"
      {...cambios}
    />,
  )
  return { alCerrar, alConfirmar }
}

describe('Confirmar', () => {
  it('confirmar llama una vez a quien lo usa', () => {
    const { alConfirmar } = montar()
    fireEvent.click(screen.getByRole('button', { name: 'Purgar' }))
    expect(alConfirmar).toHaveBeenCalledTimes(1)
  })

  it('un segundo clic antes de que termine la acción no la repite', async () => {
    let terminar: () => void = () => undefined
    const alConfirmar = vi.fn(
      () =>
        new Promise<void>((listo) => {
          terminar = listo
        }),
    )
    montar({ alConfirmar })
    const boton = screen.getByRole('button', { name: 'Purgar' })
    fireEvent.click(boton)
    fireEvent.click(boton)
    fireEvent.click(boton)
    expect(alConfirmar).toHaveBeenCalledTimes(1)
    await act(async () => {
      terminar()
      await Promise.resolve()
    })
  })

  it('después de terminar la acción se puede volver a confirmar', async () => {
    const alConfirmar = vi.fn(() => Promise.resolve())
    montar({ alConfirmar })
    const boton = screen.getByRole('button', { name: 'Purgar' })
    fireEvent.click(boton)
    await waitFor(() => {
      expect(alConfirmar).toHaveBeenCalledTimes(1)
    })
    await act(async () => {
      await Promise.resolve()
    })
    fireEvent.click(boton)
    expect(alConfirmar).toHaveBeenCalledTimes(2)
  })

  it('mientras actúa no se cierra con Esc ni con Cancelar', () => {
    const { alCerrar } = montar({ enCurso: true })
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(alCerrar).not.toHaveBeenCalled()
  })

  it('sin conexión lo dice adentro y no deja confirmar', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
    const { alConfirmar } = montar()
    expect(screen.getByText(/No hay conexión/)).toBeInTheDocument()
    const boton = screen.getByRole('button', { name: 'Purgar' })
    expect(boton).toBeDisabled()
    fireEvent.click(boton)
    expect(alConfirmar).not.toHaveBeenCalled()
  })

  it('con palabra clave, el botón espera a que se tipee', () => {
    montar({ palabraClave: 'PURGAR' })
    const boton = screen.getByRole('button', { name: 'Purgar' })
    expect(boton).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Para confirmar/), { target: { value: 'PURGAR' } })
    expect(boton).toBeEnabled()
  })
})
