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
