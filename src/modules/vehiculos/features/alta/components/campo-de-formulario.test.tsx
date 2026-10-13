import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ValorDeFormulario } from '../../../entities/formulario'
import type { CampoDeFormulario as Campo, Control } from '../controles'
import { CampoDeFormulario } from './campo-de-formulario'

afterEach(cleanup)

function montar(
  control: Control,
  valor: ValorDeFormulario,
  extra: Partial<Campo> = {},
  error?: string,
) {
  const alCambiar = vi.fn<(valor: ValorDeFormulario) => void>()
  const campo: Campo = { clave: 'a.dato', etiqueta: 'Dato', requerido: false, control, ...extra }
  render(
    <CampoDeFormulario
      campo={campo}
      valor={valor}
      error={error}
      alCambiar={alCambiar}
      deshabilitado={false}
    />,
  )
  return alCambiar
}

const OPCIONES = [
  { valor: 'automatica', etiqueta: 'Automática' },
  { valor: 'manual', etiqueta: 'Manual' },
]

describe('CampoDeFormulario', () => {
  it('un texto avisa lo que se escribe, y un requerido lo dice en su etiqueta', () => {
    const alCambiar = montar({ tipo: 'texto', largo: 160 }, '', { requerido: true })
    fireEvent.change(screen.getByLabelText('Dato (obligatorio)'), { target: { value: 'Gris' } })
    expect(alCambiar).toHaveBeenCalledWith('Gris')
  })

  it('el motivo queda junto al campo y lo marca como inválido', () => {
    montar({ tipo: 'numero', entero: true, unidad: 'km' }, 'abc', {}, 'Tiene que ser un número.')
    const campo = screen.getByLabelText('Dato (km)')
    expect(campo.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Tiene que ser un número.')).toBeDefined()
    // Texto y no `number`: se puede escribir la coma decimal.
    expect(campo.getAttribute('type')).toBe('text')
    expect(campo.getAttribute('inputmode')).toBe('numeric')
  })

  it('un sí o no tiene tres estados: sin dato, sí y no', () => {
    const alCambiar = montar({ tipo: 'si_no' }, null)
    const selector = screen.getByLabelText('Dato')
    fireEvent.change(selector, { target: { value: 'no' } })
    expect(alCambiar).toHaveBeenLastCalledWith(false)
    fireEvent.change(selector, { target: { value: '' } })
    expect(alCambiar).toHaveBeenLastCalledWith(null)
  })

  it('una opción se elige de la lista; sin opciones lo dice y no deja elegir', () => {
    const alCambiar = montar({ tipo: 'opcion', opciones: OPCIONES }, '')
    fireEvent.change(screen.getByLabelText('Dato'), { target: { value: 'manual' } })
    expect(alCambiar).toHaveBeenCalledWith('manual')
    cleanup()
    montar({ tipo: 'opcion', opciones: [] }, '')
    expect(screen.getByLabelText('Dato').hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('Este campo todavía no tiene opciones para elegir.')).toBeDefined()
  })

  it('varias opciones se marcan y desmarcan de a una', () => {
    const alCambiar = montar({ tipo: 'varias', opciones: OPCIONES }, ['manual'])
    fireEvent.click(screen.getByRole('checkbox', { name: 'Automática' }))
    expect(alCambiar).toHaveBeenLastCalledWith(['manual', 'automatica'])
    fireEvent.click(screen.getByRole('checkbox', { name: 'Manual' }))
    expect(alCambiar).toHaveBeenLastCalledWith([])
  })

  it('la fecha y la fecha con hora usan el control del navegador', () => {
    montar({ tipo: 'fecha' }, '2026-10-13')
    expect(screen.getByLabelText('Dato').getAttribute('type')).toBe('date')
    cleanup()
    montar({ tipo: 'fecha_hora' }, '2026-10-13T14:30')
    expect(screen.getByLabelText('Dato').getAttribute('type')).toBe('datetime-local')
  })

  it('un texto largo es un área de texto', () => {
    const alCambiar = montar({ tipo: 'texto_largo' }, '')
    const area = screen.getByLabelText('Dato')
    expect(area.tagName).toBe('TEXTAREA')
    fireEvent.change(area, { target: { value: 'Dos\nlíneas' } })
    expect(alCambiar).toHaveBeenCalledWith('Dos\nlíneas')
  })
})
