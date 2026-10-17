import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCambiosSinGuardar } from './cambios-del-panel'
import { Drawer } from './drawer'
import { PieDelPanel } from './pie-del-panel'
import { salirSinPerder } from './salida-con-cambios'

afterEach(cleanup)

// Un formulario que dice si tiene algo escrito, como los de cada panel.
function Formulario({ alDescartar }: { alDescartar?: () => void }) {
  const [texto, setTexto] = useState('')
  useCambiosSinGuardar(texto !== '', alDescartar)
  return (
    <input
      aria-label="Valor"
      value={texto}
      onChange={(evento) => {
        setTexto(evento.target.value)
      }}
    />
  )
}

function conPieEnLaRanura(alCerrar = vi.fn(), alDescartar = vi.fn()) {
  render(
    <Drawer abierto alCerrar={alCerrar} titulo="Panel" pie={<button type="button">Guardar</button>}>
      <Formulario alDescartar={alDescartar} />
    </Drawer>,
  )
  return { alCerrar, alDescartar }
}

const escribir = (valor: string) => {
  fireEvent.change(screen.getByLabelText('Valor'), { target: { value: valor } })
}

describe('un Drawer con un formulario que dice que tiene cambios', () => {
  it('sin nada escrito, la salida de un aviso sigue sin preguntar', () => {
    conPieEnLaRanura()
    const salir = vi.fn()
    act(() => {
      salirSinPerder(salir)
    })
    expect(salir).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Tienes cambios sin guardar.')).not.toBeInTheDocument()
  })

  it('con algo escrito pregunta en el pie y no sale todavía', () => {
    conPieEnLaRanura()
    escribir('algo')
    const salir = vi.fn()
    act(() => {
      salirSinPerder(salir)
    })
    expect(salir).not.toHaveBeenCalled()
    expect(screen.getByText('Tienes cambios sin guardar.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
  })

  it('«Seguir editando» vuelve al formulario y no sale', () => {
    conPieEnLaRanura()
    escribir('algo')
    const salir = vi.fn()
    act(() => {
      salirSinPerder(salir)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(salir).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
    expect(screen.getByLabelText('Valor')).toHaveValue('algo')
  })

  it('«Descartar» tira el borrador y sigue la salida, sin cerrar el panel', () => {
    const { alCerrar, alDescartar } = conPieEnLaRanura()
    escribir('algo')
    const salir = vi.fn()
    act(() => {
      salirSinPerder(salir)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(alDescartar).toHaveBeenCalledTimes(1)
    expect(salir).toHaveBeenCalledTimes(1)
    expect(alCerrar).not.toHaveBeenCalled()
  })

  it('si lo escrito se borra mientras pregunta, ya no pregunta', () => {
    conPieEnLaRanura()
    escribir('algo')
    act(() => {
      salirSinPerder(vi.fn())
    })
    expect(screen.getByText('Tienes cambios sin guardar.')).toBeInTheDocument()
    // El foco está en «Seguir editando»; la persona sigue, borra y vuelve a intentar.
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
    escribir('')
    const salir = vi.fn()
    act(() => {
      salirSinPerder(salir)
    })
    expect(salir).toHaveBeenCalledTimes(1)
  })

  it('cerrar el panel con algo escrito no pregunta (queda el borrador)', () => {
    const { alCerrar } = conPieEnLaRanura()
    escribir('algo')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(alCerrar).toHaveBeenCalled()
    expect(screen.queryByText('Tienes cambios sin guardar.')).not.toBeInTheDocument()
  })
})

describe('un Drawer con el pie en otro lugar o con el formulario que se va', () => {
  it('con el pie dentro del cuerpo, <PieDelPanel> hace la pregunta', () => {
    render(
      <Drawer abierto alCerrar={vi.fn()} titulo="Panel">
        <Formulario />
        <PieDelPanel idFormulario="f" enCurso={false} alCancelar={vi.fn()} />
      </Drawer>,
    )
    escribir('algo')
    const salir = vi.fn()
    act(() => {
      salirSinPerder(salir)
    })
    expect(salir).not.toHaveBeenCalled()
    expect(screen.getByText('Tienes cambios sin guardar.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(salir).toHaveBeenCalledTimes(1)
  })

  it('al cerrarse y desmontarse el formulario, ya no está anotado', () => {
    const { rerender } = render(
      <Drawer
        abierto
        alCerrar={vi.fn()}
        titulo="Panel"
        pie={<button type="button">Guardar</button>}
      >
        <Formulario />
      </Drawer>,
    )
    escribir('algo')
    rerender(
      <Drawer
        abierto
        alCerrar={vi.fn()}
        titulo="Panel"
        pie={<button type="button">Guardar</button>}
      >
        {null}
      </Drawer>,
    )
    const salir = vi.fn()
    act(() => {
      salirSinPerder(salir)
    })
    expect(salir).toHaveBeenCalledTimes(1)
  })
})
