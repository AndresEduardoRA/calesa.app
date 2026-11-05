import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Paginacion } from './paginacion'

vi.mock('next/navigation', () => ({
  usePathname: () => '/leads',
  useSearchParams: () => new URLSearchParams('q=ana'),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Paginacion', () => {
  it('con red, Siguiente es un enlace a la misma URL con su cursor', () => {
    render(<Paginacion siguiente="abc" anterior={null} />)
    const enlace = screen.getByRole('link', { name: /Siguiente/ })
    expect(enlace.getAttribute('href')).toBe('/leads?q=ana&cursor=abc')
    expect(fireEvent.click(enlace)).toBe(true)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('sin red no navega y lo dice en el lugar', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    render(<Paginacion siguiente="abc" anterior="def" />)
    const sinPrevenir = fireEvent.click(screen.getByRole('link', { name: /Siguiente/ }))
    expect(sinPrevenir).toBe(false)
    expect(screen.getByRole('status').textContent).toContain('Sin conexión')
    expect(fireEvent.click(screen.getByRole('link', { name: /Anterior/ }))).toBe(false)
  })

  it('sin cursores no dibuja nada', () => {
    const { container } = render(<Paginacion siguiente={null} anterior={null} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('Paginacion con alIr', () => {
  it('son botones que llaman a alIr con el cursor de cada lado, sin enlaces', () => {
    const alIr = vi.fn()
    render(<Paginacion siguiente="abc" anterior="def" alIr={alIr} />)
    expect(screen.queryByRole('link')).toBeNull()
    const siguiente = screen.getByRole('button', { name: /Siguiente/ })
    expect(siguiente.getAttribute('type')).toBe('button')
    fireEvent.click(siguiente)
    expect(alIr).toHaveBeenLastCalledWith('abc')
    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }))
    expect(alIr).toHaveBeenLastCalledWith('def')
    expect(alIr).toHaveBeenCalledTimes(2)
  })

  it('apagado no llama y lo dice como hoy', () => {
    const alIr = vi.fn()
    render(<Paginacion siguiente="abc" anterior={null} alIr={alIr} />)
    const anterior = screen.getByText('Anterior').closest('[aria-disabled]')
    expect(anterior?.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(screen.getByText('Anterior'))
    expect(alIr).not.toHaveBeenCalled()
  })

  it('sin red no llama y dice el aviso', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const alIr = vi.fn()
    render(<Paginacion siguiente="abc" anterior="def" alIr={alIr} />)
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }))
    expect(alIr).not.toHaveBeenCalled()
    expect(screen.getByRole('status').textContent).toContain('Sin conexión')
  })
})
