import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LeadDeFicha } from '../../../entities/ficha'
import { AccionesDeLaFicha } from './acciones-de-la-ficha'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../../marcas/components/menu-de-lead', () => ({
  MenuDeLeadConMarcas: () => <button type="button">Más acciones</button>,
}))
vi.mock('./boton-editar-lead', () => ({
  BotonEditarLead: () => <button type="button">Editar</button>,
}))

afterEach(cleanup)

const ficha = { id: 'l-1', nombre: 'Ana Prieto', vehiculosVinculados: 0 } as unknown as LeadDeFicha
const RUTA = '/cotizaciones/nuevo?origen=o-1&lead=l-1'

function montar(paraCotizar: string | null, puedeEditar = true) {
  render(
    <AccionesDeLaFicha
      ficha={ficha}
      marcas={{} as never}
      etiquetas={{} as never}
      alGestionar={vi.fn()}
      puedeEditar={puedeEditar}
      puedeEnviarAPapelera={false}
      paraCotizar={paraCotizar}
      paraActividad={null}
    />,
  )
}

describe('AccionesDeLaFicha: «Cotizar»', () => {
  it('con la ruta de la hoja, un enlace «Cotizar» entre «Editar» y el menú', () => {
    montar(RUTA)
    const enlace = screen.getByRole('link', { name: 'Cotizar' })
    expect(enlace.getAttribute('href')).toBe(RUTA)
    const orden = screen.getAllByRole('button').map((b) => b.textContent)
    expect(orden).toEqual(['Editar', 'Más acciones'])
    const editar = screen.getByRole('button', { name: 'Editar' })
    const menu = screen.getByRole('button', { name: 'Más acciones' })
    expect(editar.compareDocumentPosition(enlace) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(enlace.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sin la ruta (quien no cotiza), no hay enlace', () => {
    montar(null)
    expect(screen.queryByRole('link', { name: 'Cotizar' })).toBeNull()
  })

  it('se ofrece también a quien no puede editar el lead: cotizar pide ver el lead, no editarlo', () => {
    montar(RUTA, false)
    expect(screen.getByRole('link', { name: 'Cotizar' }).getAttribute('href')).toBe(RUTA)
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
  })
})
