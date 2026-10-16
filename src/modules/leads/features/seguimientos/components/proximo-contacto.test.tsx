import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { ProximoContacto } from './proximo-contacto'

function Caja({ valor = '', error }: { valor?: string; error?: string }) {
  const [actual, setActual] = useState(valor)
  return (
    <ProximoContacto
      nombre="x-recordatorio"
      valor={actual}
      alCambiar={setActual}
      zona="America/La_Paz"
      error={error}
      deshabilitado={false}
    />
  )
}

afterEach(cleanup)

describe('ProximoContacto', () => {
  it('nace plegado: sólo el botón que lo programa, sin fecha ni atajos', () => {
    render(<Caja />)
    const boton = screen.getByRole('button', { name: 'Programar próximo contacto' })
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Fecha y hora')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Mañana/ })).toBeNull()
  })

  it('al abrirlo se explica y el foco va al primer atajo', () => {
    render(<Caja />)
    fireEvent.click(screen.getByRole('button', { name: 'Programar próximo contacto' }))
    expect(screen.getByRole('group', { name: 'Próximo contacto' })).toBeInTheDocument()
    expect(
      screen.getByText('Un recordatorio para ti: cuándo volver a contactar a este lead.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha y hora')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Mañana/ })).toHaveFocus()
  })

  it('«Quitar» vacía la fecha, lo pliega y devuelve el foco al botón', () => {
    render(<Caja />)
    fireEvent.click(screen.getByRole('button', { name: 'Programar próximo contacto' }))
    fireEvent.click(screen.getByRole('button', { name: /^Mañana/ }))
    expect(screen.getByLabelText('Fecha y hora')).not.toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    expect(screen.queryByLabelText('Fecha y hora')).toBeNull()
    expect(screen.getByRole('button', { name: 'Programar próximo contacto' })).toHaveFocus()
  })

  it('«Quitar» también pliega uno abierto y vacío', () => {
    render(<Caja />)
    fireEvent.click(screen.getByRole('button', { name: 'Programar próximo contacto' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    expect(screen.getByRole('button', { name: 'Programar próximo contacto' })).toBeInTheDocument()
  })

  it('con una fecha (un borrador) o un motivo nace abierto', () => {
    const { unmount } = render(<Caja valor="2030-01-01T09:00" />)
    expect(screen.getByLabelText('Fecha y hora')).toHaveValue('2030-01-01T09:00')
    unmount()
    render(<Caja error="El recordatorio tiene que ser en el futuro." />)
    expect(screen.getByText('El recordatorio tiene que ser en el futuro.')).toBeInTheDocument()
  })
})
