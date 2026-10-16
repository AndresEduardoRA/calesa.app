import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { CuandoFue } from './cuando-fue'

function Caja({ nuevo = true, valor = '' }: { nuevo?: boolean; valor?: string }) {
  const [actual, setActual] = useState(valor)
  return (
    <CuandoFue
      nombre="x-ocurrido"
      valor={actual}
      alCambiar={setActual}
      deshabilitado={false}
      nuevo={nuevo}
    />
  )
}

afterEach(cleanup)

describe('CuandoFue', () => {
  it('al anotar dice «Ahora» y «Otra fecha» abre el campo con el foco', () => {
    render(<Caja />)
    expect(screen.getByText('Ahora')).toBeInTheDocument()
    expect(screen.queryByLabelText('Cuándo fue')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Otra fecha' }))
    expect(screen.getByLabelText('Cuándo fue')).toHaveFocus()
  })

  it('un campo abierto no se pliega aunque se borre lo escrito', () => {
    render(<Caja />)
    fireEvent.click(screen.getByRole('button', { name: 'Otra fecha' }))
    const campo = screen.getByLabelText('Cuándo fue')
    fireEvent.change(campo, { target: { value: '2020-01-01T09:00' } })
    fireEvent.change(campo, { target: { value: '' } })
    expect(screen.getByLabelText('Cuándo fue')).toBeInTheDocument()
  })

  it('al editar, o con una fecha repuesta, nace abierto', () => {
    const { unmount } = render(<Caja nuevo={false} valor="2020-01-01T09:00" />)
    expect(screen.getByLabelText('Cuándo fue')).toHaveValue('2020-01-01T09:00')
    unmount()
    render(<Caja valor="2020-01-01T09:00" />)
    expect(screen.getByLabelText('Cuándo fue')).toHaveValue('2020-01-01T09:00')
  })
})
