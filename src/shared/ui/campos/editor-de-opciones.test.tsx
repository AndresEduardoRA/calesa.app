import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OpcionDeCampo } from '@/shared/lib/campos'
import { EditorDeOpciones } from './editor-de-opciones'

afterEach(cleanup)

function editor(opciones: OpcionDeCampo[], deshabilitado = false) {
  const alCambiar = vi.fn()
  render(
    <EditorDeOpciones opciones={opciones} alCambiar={alCambiar} deshabilitado={deshabilitado} />,
  )
  return alCambiar
}

describe('EditorDeOpciones', () => {
  it('agrega una opción con la clave que sale de su nombre', () => {
    const alCambiar = editor([{ clave: 'basico', etiqueta: 'Básico' }])
    fireEvent.change(screen.getByLabelText('Nueva opción'), { target: { value: 'Full equipo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(alCambiar).toHaveBeenCalledWith([
      { clave: 'basico', etiqueta: 'Básico' },
      { clave: 'full_equipo', etiqueta: 'Full equipo' },
    ])
  })

  it('Enter agrega la opción y no envía el formulario', () => {
    const alCambiar = editor([])
    const campo = screen.getByLabelText('Nueva opción')
    fireEvent.change(campo, { target: { value: 'Usado' } })
    const noEnviado = fireEvent.keyDown(campo, { key: 'Enter' })
    expect(noEnviado).toBe(false)
    expect(alCambiar).toHaveBeenCalledWith([{ clave: 'usado', etiqueta: 'Usado' }])
  })

  it('una opción con un nombre que da la misma clave recibe un sufijo', () => {
    const alCambiar = editor([{ clave: 'usado', etiqueta: 'Usado' }])
    fireEvent.change(screen.getByLabelText('Nueva opción'), { target: { value: 'USADO' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(alCambiar).toHaveBeenCalledWith([
      { clave: 'usado', etiqueta: 'Usado' },
      { clave: 'usado_2', etiqueta: 'USADO' },
    ])
  })

  it('cambiar el nombre de una opción no toca su clave', () => {
    const alCambiar = editor([{ clave: 'basico', etiqueta: 'Básico' }])
    fireEvent.change(screen.getByLabelText('Nombre de la opción 1'), {
      target: { value: 'Equipamiento básico' },
    })
    expect(alCambiar).toHaveBeenCalledWith([{ clave: 'basico', etiqueta: 'Equipamiento básico' }])
  })

  it('quita una opción de la lista', () => {
    const alCambiar = editor([
      { clave: 'a', etiqueta: 'A' },
      { clave: 'b', etiqueta: 'B' },
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Quitar la opción A' }))
    expect(alCambiar).toHaveBeenCalledWith([{ clave: 'b', etiqueta: 'B' }])
  })

  it('no agrega una opción vacía', () => {
    editor([])
    expect(screen.getByRole('button', { name: 'Agregar' })).toHaveProperty('disabled', true)
  })
})
