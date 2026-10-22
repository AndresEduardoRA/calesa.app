import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DefFiltro } from '@/shared/lib/filtros'
import { FiltroDeTexto } from './controles-de-texto'

afterEach(cleanup)

describe('FiltroDeTexto', () => {
  const MINIMO = { letras: 3, numerosLibres: false, aviso: 'Escribe al menos 3 letras' }
  const texto = (conMinimo: boolean): Extract<DefFiltro, { tipo: 'texto' }> => ({
    tipo: 'texto',
    clave: 'a.color',
    etiqueta: 'Color',
    ...(conMinimo ? { minimo: MINIMO } : {}),
  })
  const caja = () => screen.getByLabelText('Color') as HTMLInputElement

  it('sin mínimo avisa cada cambio, como siempre', () => {
    const alCambiar = vi.fn()
    render(<FiltroDeTexto def={texto(false)} valor={null} alCambiar={alCambiar} />)
    fireEvent.change(caja(), { target: { value: 'v' } })
    expect(alCambiar).toHaveBeenLastCalledWith({ tipo: 'texto', texto: 'v' }, { tipeando: true })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('con 1 o 2 letras dice la línea, deja lo escrito y no avisa nada', () => {
    const alCambiar = vi.fn()
    render(<FiltroDeTexto def={texto(true)} valor={null} alCambiar={alCambiar} />)
    fireEvent.change(caja(), { target: { value: 'a' } })
    fireEvent.change(caja(), { target: { value: 'ab' } })
    expect(alCambiar).not.toHaveBeenCalled()
    expect(caja().value).toBe('ab')
    expect(screen.getByRole('status').textContent).toBe('Escribe al menos 3 letras')
    expect(caja().getAttribute('aria-describedby')).toBe(screen.getByRole('status').id)
  })

  it('con 3 letras avisa el valor y la línea se va', () => {
    const alCambiar = vi.fn()
    render(<FiltroDeTexto def={texto(true)} valor={null} alCambiar={alCambiar} />)
    fireEvent.change(caja(), { target: { value: 'abc' } })
    expect(alCambiar).toHaveBeenCalledTimes(1)
    expect(alCambiar).toHaveBeenLastCalledWith({ tipo: 'texto', texto: 'abc' }, { tipeando: true })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('al volver a 2 letras quita el filtro una vez, y no vuelve a escribir un «nada»', () => {
    const alCambiar = vi.fn()
    render(
      <FiltroDeTexto
        def={texto(true)}
        valor={{ tipo: 'texto', texto: 'abc' }}
        alCambiar={alCambiar}
      />,
    )
    fireEvent.change(caja(), { target: { value: 'ab' } })
    expect(alCambiar).toHaveBeenCalledTimes(1)
    expect(alCambiar).toHaveBeenLastCalledWith(null, { tipeando: true })
    expect(caja().value).toBe('ab')
    expect(screen.getByRole('status').textContent).toBe('Escribe al menos 3 letras')
    fireEvent.change(caja(), { target: { value: 'a' } })
    expect(alCambiar).toHaveBeenCalledTimes(1)
  })
})
