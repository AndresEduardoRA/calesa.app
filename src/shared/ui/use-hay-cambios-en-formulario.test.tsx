import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useHayCambiosEnFormulario } from './use-hay-cambios-en-formulario'

afterEach(cleanup)

function Prueba() {
  const { formulario, hayCambios } = useHayCambiosEnFormulario(['valor', 'nombre'])
  return (
    <form ref={formulario}>
      <input aria-label="Valor" name="valor" defaultValue="6,96" />
      <input aria-label="Nombre" name="nombre" defaultValue="Oficial" />
      <p>{hayCambios ? 'con cambios' : 'sin cambios'}</p>
    </form>
  )
}

const cambiar = (etiqueta: string, valor: string) => {
  fireEvent.input(screen.getByLabelText(etiqueta), { target: { value: valor } })
}

describe('useHayCambiosEnFormulario', () => {
  it('nace sin cambios: lo que mandó el servidor no es algo escrito', () => {
    render(<Prueba />)
    expect(screen.getByText('sin cambios')).toBeInTheDocument()
  })

  it('escribir en un campo lo marca, y volver a lo guardado lo desmarca', () => {
    render(<Prueba />)
    cambiar('Valor', '7,10')
    expect(screen.getByText('con cambios')).toBeInTheDocument()
    cambiar('Valor', '6,96')
    expect(screen.getByText('sin cambios')).toBeInTheDocument()
  })

  it('cualquiera de los campos nombrados cuenta', () => {
    render(<Prueba />)
    cambiar('Nombre', 'Paralelo')
    expect(screen.getByText('con cambios')).toBeInTheDocument()
  })
})
