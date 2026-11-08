import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PanelDeLaTarjeta } from '../hooks/use-panel-de-la-tarjeta'
import { AccionesDeLaPlantilla } from './acciones-de-la-plantilla'

const avisarError = vi.fn()
vi.mock('@/shared/ui/toasts', () => ({ avisarError: (e: unknown) => avisarError(e) }))
vi.mock('./diferidos', () => ({
  ModalDePublicarLaTarjetaDiferido: (p: { abierto: boolean; esperada: string | null }) => (
    <div
      data-testid="modal-publicar"
      data-abierto={String(p.abierto)}
      data-esperada={p.esperada ?? ''}
    />
  ),
}))

const HORA = '2026-11-07T15:00:00.123456+00:00'
const ORIGEN = { id: 'o', nombre: 'Mini' }

beforeEach(() => {
  avisarError.mockReset()
})
afterEach(cleanup)

const panel = (cambios: Partial<PanelDeLaTarjeta>, cerrar = vi.fn()): PanelDeLaTarjeta => ({
  publicando: false,
  descartando: false,
  abrirPublicar: vi.fn(),
  abrirDescartar: vi.fn(),
  cerrar,
  ...cambios,
})

describe('AccionesDeLaPlantilla', () => {
  it('no monta nada mientras ningún panel se abrió', () => {
    render(<AccionesDeLaPlantilla panel={panel({})} origen={ORIGEN} esperada={HORA} />)
    expect(screen.queryByTestId('modal-publicar')).toBeNull()
  })

  it('?panel=publicar-tarjeta sin borrador no monta el modal, avisa y limpia la URL', () => {
    const cerrar = vi.fn()
    render(
      <AccionesDeLaPlantilla
        panel={panel({ publicando: true }, cerrar)}
        origen={ORIGEN}
        esperada={null}
      />,
    )
    expect(screen.queryByTestId('modal-publicar')).toBeNull()
    expect(avisarError).toHaveBeenCalledWith({
      codigo: 'no_encontrado',
      mensaje: 'No hay borrador para publicar.',
    })
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('con borrador monta el modal abierto con la esperada', () => {
    render(
      <AccionesDeLaPlantilla panel={panel({ publicando: true })} origen={ORIGEN} esperada={HORA} />,
    )
    const modal = screen.getByTestId('modal-publicar')
    expect(modal.getAttribute('data-abierto')).toBe('true')
    expect(modal.getAttribute('data-esperada')).toBe(HORA)
    expect(avisarError).not.toHaveBeenCalled()
  })
})
