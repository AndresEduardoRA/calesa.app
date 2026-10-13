import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AvisoDeConflicto } from './aviso-de-conflicto'

afterEach(cleanup)

describe('AvisoDeConflicto', () => {
  it('dice quién lo cambió, deja ver cómo quedó en otra pestaña y recargar', () => {
    const alRecargar = vi.fn()
    render(
      <AvisoDeConflicto
        mensaje="Rosa Mamani cambió este vehículo hace 3 min."
        hrefVer="/vehiculos/1"
        alRecargar={alRecargar}
      />,
    )
    expect(screen.getByText('Rosa Mamani cambió este vehículo hace 3 min.')).toBeDefined()
    const ver = screen.getByRole('link', { name: 'Ver cómo quedó' })
    expect(ver.getAttribute('href')).toBe('/vehiculos/1')
    expect(ver.getAttribute('target')).toBe('_blank')
    fireEvent.click(screen.getByRole('button', { name: 'Recargar' }))
    expect(alRecargar).toHaveBeenCalledOnce()
  })

  it('sin dónde verlo sólo ofrece recargar, y no deja recargar dos veces', () => {
    render(<AvisoDeConflicto mensaje="Otra persona cambió esto." alRecargar={vi.fn()} enCurso />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByRole('button', { name: 'Recargar' }).hasAttribute('disabled')).toBe(true)
  })
})
