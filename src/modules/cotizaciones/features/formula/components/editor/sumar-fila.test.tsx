import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ErrorDeFilaNueva } from '../../../../entities/formula/fila-nueva'
import { SumarFila } from './sumar-fila'

afterEach(cleanup)

const montar = (error: ErrorDeFilaNueva | null = null, ocupados: string[] = ['base']) => {
  const alCrear = vi.fn()
  const alCancelar = vi.fn()
  render(
    <SumarFila
      ocupados={new Set(ocupados)}
      error={error}
      alCrear={alCrear}
      alCancelar={alCancelar}
    />,
  )
  return { alCrear, alCancelar }
}
const etiqueta = () => screen.getByLabelText('Etiqueta')
const nombre = () => screen.getByLabelText('Nombre')
const texto = () => screen.getByLabelText('Texto')
const escribir = (campo: HTMLElement, valor: string) => {
  fireEvent.change(campo, { target: { value: valor } })
}

describe('SumarFila (T8)', () => {
  it('el nombre sigue a la etiqueta hasta que se toca, y luego ya no', () => {
    montar()
    escribir(etiqueta(), 'Seguro de carga')
    expect((nombre() as HTMLInputElement).value).toBe('seguro_de_carga')
    escribir(nombre(), 'mi_seguro')
    escribir(etiqueta(), 'Otro seguro')
    expect((nombre() as HTMLInputElement).value).toBe('mi_seguro')
  })

  it('el nombre propuesto no choca con uno ocupado', () => {
    montar(null, ['base', 'seguro'])
    escribir(etiqueta(), 'Seguro')
    expect((nombre() as HTMLInputElement).value).toBe('seguro_2')
  })

  it('«Constante» abre con 0 y muestra el aviso del diseño; volver a «Cálculo» vacía el texto', () => {
    montar()
    fireEvent.click(screen.getByRole('radio', { name: 'Constante' }))
    expect((texto() as HTMLTextAreaElement).value).toBe('0')
    expect(screen.getByText(/Una constante nueva aún no aparece en la hoja/)).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: 'Cálculo' }))
    expect((texto() as HTMLTextAreaElement).value).toBe('')
    expect(screen.queryByText(/Una constante nueva aún no aparece/)).toBeNull()
  })

  it('un texto escrito se conserva al cambiar de tipo', () => {
    montar()
    escribir(texto(), 'base*2')
    fireEvent.click(screen.getByRole('radio', { name: 'Constante' }))
    expect((texto() as HTMLTextAreaElement).value).toBe('base*2')
  })

  it.each([
    ['etiqueta', 'Escribe cómo se llama la fila.', 'Etiqueta'],
    ['id', 'Ya hay una fila llamada «base».', 'Nombre'],
    ['texto', 'Un número solo es una constante: elige «Constante».', 'Texto'],
  ] as const)(
    'el error de «%s» se dice junto a su campo, con aria',
    (campo, mensaje, etiquetaDelCampo) => {
      montar({ codigo: 'id_ocupado', mensaje, campo })
      const input = screen.getByLabelText(etiquetaDelCampo)
      expect(input.getAttribute('aria-invalid')).toBe('true')
      const descripcion = input.getAttribute('aria-describedby') ?? ''
      expect(document.getElementById(descripcion.split(' ')[0] ?? '')?.textContent).toBe(mensaje)
      expect(document.activeElement).toBe(input)
    },
  )

  it('«Crear fila» y Ctrl/Cmd+Enter crean con lo escrito; Esc cancela', () => {
    const { alCrear, alCancelar } = montar()
    escribir(etiqueta(), 'Seguro')
    escribir(texto(), 'a+b')
    fireEvent.click(screen.getByRole('button', { name: 'Crear fila' }))
    expect(alCrear).toHaveBeenLastCalledWith({
      etiqueta: 'Seguro',
      id: 'seguro',
      tipo: 'calculo',
      texto: 'a+b',
    })
    fireEvent.keyDown(texto(), { key: 'Enter', ctrlKey: true })
    expect(alCrear).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(texto(), { key: 'Enter', metaKey: true })
    expect(alCrear).toHaveBeenCalledTimes(3)
    fireEvent.keyDown(etiqueta(), { key: 'Escape' })
    expect(alCancelar).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(alCancelar).toHaveBeenCalledTimes(2)
  })
})
