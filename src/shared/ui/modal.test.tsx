import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProveedorAtajos } from './atajos'
import { Modal } from './modal'

function Prueba({
  alCerrar,
  bloqueado = false,
  conAtajos = true,
}: {
  alCerrar: () => void
  bloqueado?: boolean
  conAtajos?: boolean
}) {
  const modal = (
    <Modal abierto alCerrar={alCerrar} titulo="Agregar teléfono" bloqueado={bloqueado}>
      <input aria-label="Teléfono extra" />
    </Modal>
  )
  return conAtajos ? <ProveedorAtajos>{modal}</ProveedorAtajos> : modal
}

afterEach(cleanup)

describe('Modal', () => {
  // Base UI detiene el Esc en el documento: el atajo de la pila no lo ve, así que no hay dos cierres.
  it('Esc cierra una sola vez, también con el foco en un campo y con atajos', () => {
    const cerrar = vi.fn()
    render(<Prueba alCerrar={cerrar} />)
    const campo = screen.getByLabelText('Teléfono extra')
    campo.focus()
    fireEvent.keyDown(campo, { key: 'Escape' })
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('fuera del proveedor de atajos, Esc lo cierra Base UI', () => {
    const cerrar = vi.fn()
    render(<Prueba alCerrar={cerrar} conAtajos={false} />)
    const campo = screen.getByLabelText('Teléfono extra')
    campo.focus()
    fireEvent.keyDown(campo, { key: 'Escape' })
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('la ✕ cierra', () => {
    const cerrar = vi.fn()
    render(<Prueba alCerrar={cerrar} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('bloqueado mientras guarda: ni Esc ni la ✕ lo cierran', () => {
    const cerrar = vi.fn()
    render(<Prueba alCerrar={cerrar} bloqueado />)
    const campo = screen.getByLabelText('Teléfono extra')
    campo.focus()
    fireEvent.keyDown(campo, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(cerrar).not.toHaveBeenCalled()
  })

  it('el título nombra al diálogo', () => {
    render(<Prueba alCerrar={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: 'Agregar teléfono' })).toBeInTheDocument()
  })
})
