import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SelectorDePorPagina } from './selector-de-por-pagina'
import type { PorPaginaDelListado } from './use-por-pagina-del-listado'

afterEach(cleanup)

function estado(sobre: Partial<PorPaginaDelListado> = {}): PorPaginaDelListado {
  return {
    visto: 10,
    esperandoRed: false,
    sinGuardar: false,
    elegir: vi.fn(),
    reintentarGuardado: vi.fn(),
    ...sobre,
  }
}

describe('SelectorDePorPagina', () => {
  it('elegir uno de la lista lo pide', () => {
    const e = estado()
    render(<SelectorDePorPagina opciones={[10, 25, 50]} estado={e} />)
    fireEvent.change(screen.getByLabelText('Ítems por página'), { target: { value: '25' } })
    expect(e.elegir).toHaveBeenCalledWith(25)
  })

  it('un tamaño que no es de la lista (un option agregado a mano) no se pide y el selector vuelve a lo que se ve', () => {
    const e = estado()
    render(<SelectorDePorPagina opciones={[10, 25, 50]} estado={e} />)
    const select = screen.getByLabelText<HTMLSelectElement>('Ítems por página')
    select.add(new Option('7', '7'))
    fireEvent.change(select, { target: { value: '7' } })
    expect(e.elegir).not.toHaveBeenCalled()
    expect(select.value).toBe('10')
  })
})
