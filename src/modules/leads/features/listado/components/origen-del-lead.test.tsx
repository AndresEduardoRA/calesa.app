import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { OrigenDelLead } from './origen-del-lead'

afterEach(cleanup)

describe('OrigenDelLead: el origen apagado (5a-22)', () => {
  it('se lee «Facebook (inactivo)» de corrido: el espacio es texto y no sólo el hueco entre cajas', () => {
    const { container } = render(<OrigenDelLead nombre="Facebook" icono={null} activo={false} />)
    expect(container.textContent).toBe('Facebook (inactivo)')
  })

  it('un origen activo, o sin decir si lo está, no lleva marca', () => {
    const { container, rerender } = render(<OrigenDelLead nombre="Facebook" icono={null} />)
    expect(container.textContent).toBe('Facebook')
    rerender(<OrigenDelLead nombre="Facebook" icono={null} activo />)
    expect(container.textContent).toBe('Facebook')
  })

  it('lo que cede es el nombre, con su texto entero en el `title`; la marca no cede', () => {
    const { container } = render(
      <OrigenDelLead nombre="Un origen de nombre larguísimo" icono={null} activo={false} />,
    )
    const nombre = container.querySelector('.truncate')
    expect(nombre?.textContent).toBe('Un origen de nombre larguísimo')
    expect(nombre?.className).toContain('min-w-0')
    expect(container.firstElementChild?.getAttribute('title')).toBe(
      'Un origen de nombre larguísimo',
    )
    const marca = [...container.querySelectorAll('span')].find(
      (e) => e.textContent === '(inactivo)',
    )
    expect(marca?.className).toContain('shrink-0')
  })
})
