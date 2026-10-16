import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AvisoDeVencidos, textoDeVencidos } from './aviso-de-vencidos'

describe('AvisoDeVencidos', () => {
  it('dice cuántos y lleva a «Seguimientos»; sin vencidos no ocupa lugar', () => {
    expect(textoDeVencidos(1)).toBe('Tienes 1 recordatorio vencido sobre este lead.')
    expect(textoDeVencidos(3)).toBe('Tienes 3 recordatorios vencidos sobre este lead.')
    expect(textoDeVencidos(20)).toBe('Tienes 20 recordatorios vencidos sobre este lead.')
    // La base cuenta hasta 21: no se dice un número que no sabe.
    expect(textoDeVencidos(21)).toBe('Tienes más de 20 recordatorios vencidos sobre este lead.')
    const { container, rerender } = render(
      <AvisoDeVencidos leadId="x" vencidos={2} seccion="datos" />,
    )
    expect(screen.getByRole('link', { name: 'Verlos' }).getAttribute('href')).toBe(
      '/leads/x?seccion=seguimientos',
    )
    rerender(<AvisoDeVencidos leadId="x" vencidos={2} seccion="seguimientos" />)
    expect(screen.queryByRole('link')).toBeNull()
    rerender(<AvisoDeVencidos leadId="x" vencidos={0} seccion="datos" />)
    expect(container.textContent).toBe('')
  })
})
