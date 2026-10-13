import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ZonaDeArchivos } from './zona-de-archivos'

afterEach(cleanup)

const foto = (nombre: string) => new File(['x'], nombre, { type: 'image/jpeg' })

function entrada(selector: string): HTMLInputElement {
  const encontrada = document.querySelector<HTMLInputElement>(selector)
  if (!encontrada) {
    throw new Error(`No hay ${selector}`)
  }
  return encontrada
}

function montar(extra: Partial<Parameters<typeof ZonaDeArchivos>[0]> = {}) {
  const alElegir = vi.fn()
  render(
    <ZonaDeArchivos
      aceptar="image/*"
      alElegir={alElegir}
      etiquetaDeElegir="Elegir fotos"
      etiquetaDeCamara="Tomar una foto"
      ayuda="O suéltalas acá."
      {...extra}
    />,
  )
  return alElegir
}

describe('ZonaDeArchivos', () => {
  it('entrega los archivos del selector, y deja elegir varios', () => {
    const alElegir = montar()
    const selector = entrada('input[type=file]:not([capture])')
    expect(selector.multiple).toBe(true)
    fireEvent.change(selector, { target: { files: [foto('a.jpg'), foto('b.jpg')] } })
    expect(alElegir).toHaveBeenCalledTimes(1)
    expect(alElegir.mock.calls[0]?.[0]).toHaveLength(2)
  })

  it('entrega lo que se suelta encima', () => {
    const alElegir = montar()
    fireEvent.drop(screen.getByRole('group', { name: 'Elegir fotos' }), {
      dataTransfer: { files: [foto('a.jpg')] },
    })
    expect(alElegir).toHaveBeenCalledTimes(1)
  })

  it('la cámara es un selector aparte que pide la cámara de atrás', () => {
    montar()
    expect(entrada('input[type=file][capture]').getAttribute('capture')).toBe('environment')
  })

  it('para un lector de pantalla hay un solo control por acción: el botón', () => {
    montar()
    expect(screen.getAllByRole('button').map((boton) => boton.textContent)).toEqual([
      'Elegir fotos',
      'Tomar una foto',
    ])
  })

  it('sin etiqueta de cámara no hay botón de cámara', () => {
    render(<ZonaDeArchivos aceptar="image/*" alElegir={vi.fn()} etiquetaDeElegir="Elegir" />)
    expect(screen.queryByText('Tomar una foto')).toBeNull()
  })

  it('deshabilitada no entrega lo que se suelta', () => {
    const alElegir = montar({ deshabilitada: true })
    fireEvent.drop(screen.getByRole('group', { name: 'Elegir fotos' }), {
      dataTransfer: { files: [foto('a.jpg')] },
    })
    expect(alElegir).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Elegir fotos' })).toHaveProperty('disabled', true)
  })
})
