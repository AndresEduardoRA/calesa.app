import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReintentoAlVolver } from './use-reintento-al-volver'

let enLinea = true

function cambiarConexion(conectado: boolean) {
  enLinea = conectado
  act(() => {
    window.dispatchEvent(new Event(conectado ? 'online' : 'offline'))
  })
}

function Formulario({
  pendiente,
  enviar,
}: {
  pendiente: string | null
  enviar: (pendiente: string) => Promise<boolean>
}) {
  useReintentoAlVolver(pendiente, enviar)
  return null
}

describe('useReintentoAlVolver', () => {
  beforeEach(() => {
    enLinea = true
    vi.spyOn(window.navigator, 'onLine', 'get').mockImplementation(() => enLinea)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lo que quedó esperando sin conexión sale solo al volver, una vez', () => {
    const enviar = vi.fn(() => Promise.resolve(true))
    const { rerender } = render(<Formulario pendiente={null} enviar={enviar} />)
    cambiarConexion(false)
    rerender(<Formulario pendiente="intento" enviar={enviar} />)
    expect(enviar).not.toHaveBeenCalled()
    cambiarConexion(true)
    expect(enviar).toHaveBeenCalledTimes(1)
    expect(enviar).toHaveBeenCalledWith('intento')
    rerender(<Formulario pendiente="intento" enviar={enviar} />)
    expect(enviar).toHaveBeenCalledTimes(1)
  })

  it('si falló con la red presente no se reenvía solo: espera «Reintentar»', () => {
    const enviar = vi.fn(() => Promise.resolve(true))
    const { rerender } = render(<Formulario pendiente={null} enviar={enviar} />)
    rerender(<Formulario pendiente="intento" enviar={enviar} />)
    rerender(<Formulario pendiente="intento" enviar={enviar} />)
    expect(enviar).not.toHaveBeenCalled()
  })

  it('lo que esperaba con red sale si después la red se corta y vuelve', () => {
    const enviar = vi.fn(() => Promise.resolve(true))
    render(<Formulario pendiente="intento" enviar={enviar} />)
    cambiarConexion(false)
    cambiarConexion(true)
    expect(enviar).toHaveBeenCalledTimes(1)
  })

  it('volver la conexión sin nada pendiente no envía', () => {
    const enviar = vi.fn(() => Promise.resolve(true))
    const { rerender } = render(<Formulario pendiente={null} enviar={enviar} />)
    cambiarConexion(false)
    cambiarConexion(true)
    rerender(<Formulario pendiente="intento" enviar={enviar} />)
    expect(enviar).not.toHaveBeenCalled()
  })
})
