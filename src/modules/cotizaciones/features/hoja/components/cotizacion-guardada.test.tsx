import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

import { CotizacionGuardada } from './cotizacion-guardada'

const ID = '00000000-0000-4000-8000-0000000000aa'

afterEach(cleanup)

describe('<CotizacionGuardada>', () => {
  it('después de «Abrir la cotización» ofrece «Descargar PDF», un enlace que baja el PDF de lo guardado', () => {
    render(
      <CotizacionGuardada
        cotizacion={{ id: ID, numero: 12, totalUsd: 100, repetido: false }}
        fueReenvio={false}
        alCotizarOtra={() => undefined}
      />,
    )
    const pdf = screen.getByRole('link', { name: 'Descargar PDF' })
    expect(pdf.getAttribute('href')).toBe(`/cotizaciones/${ID}/pdf`)
    expect(pdf.hasAttribute('download')).toBe(true)
    const enlaces = screen.getAllByRole('link').map((e) => e.textContent)
    expect(enlaces).toEqual(['Abrir la cotización', 'Descargar PDF'])
    expect(screen.getByRole('link', { name: 'Abrir la cotización' }).getAttribute('href')).toBe(
      `/cotizaciones/${ID}`,
    )
  })
})
