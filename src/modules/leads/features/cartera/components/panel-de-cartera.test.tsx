import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'
import type { CarteraDelLead } from '../hooks/use-cartera'
import { PanelDeCartera } from './panel-de-cartera'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('../hooks/use-candidatos', () => ({
  useCandidatos: () => ({
    estado: {
      fase: 'lista',
      candidatos: [
        { id: 'p-1', nombre: 'Berta Pérez' },
        { id: 'p-2', nombre: 'Carlos Soto' },
      ],
    },
    reintentar: vi.fn(),
  }),
}))

// Un `matchMedia` de mentira: la pantalla es ancha (el panel entra al costado).
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const cartera = {
  cartera: [],
  compartir: vi.fn(),
  transferir: vi.fn(),
} as unknown as CarteraDelLead
const lead = {
  id: 'l-1',
  nombre: 'Ana Prieto',
  numeros: { numero: null, numeroPropio: 3, creadorDelPropio: null },
  vehiculosVinculados: 0,
  vePortal: false,
}

function pulsarAviso() {
  const salir = vi.fn()
  act(() => {
    salirSinPerder(salir)
  })
  return salir
}

describe('PanelDeCartera: salir desde un aviso', () => {
  function montar() {
    render(
      <PanelDeCartera modo="compartir" abierto alCerrar={vi.fn()} lead={lead} cartera={cartera} />,
    )
  }

  it('sin elegir a nadie, el aviso sale directo', () => {
    montar()
    expect(pulsarAviso()).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Tienes cambios sin guardar.')).not.toBeInTheDocument()
  })

  it('con una persona elegida y sin dar, pregunta en el pie; «Descartar» sigue', () => {
    montar()
    fireEvent.click(screen.getByRole('radio', { name: 'Berta Pérez' }))
    const salir = pulsarAviso()
    expect(salir).not.toHaveBeenCalled()
    expect(screen.getByText('Tienes cambios sin guardar.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Compartir' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(salir).toHaveBeenCalledTimes(1)
  })
})
