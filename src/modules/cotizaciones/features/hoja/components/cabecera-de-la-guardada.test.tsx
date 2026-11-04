import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CabeceraDeLaGuardada } from './cabecera-de-la-guardada'
import { render } from './render-con-url.soporte'

vi.mock('../../revisiones/components/diferidos', () => ({
  PanelDeRevisionesDiferido: ({ abierto, numero }: { abierto: boolean; numero: number }) => (
    <div data-panel-de-revisiones={abierto ? 'abierto' : 'cerrado'}>Panel {numero}</div>
  ),
}))

const COTIZACION = '00000000-0000-4000-8000-0000000000aa'
const props = {
  id: COTIZACION,
  numero: 123,
  clase: 'preventa' as const,
  version: '2026-11-04T10:00:00.123456+00:00',
  venceEl: '2026-12-04',
  vencida: false,
  origen: 'Miami',
  cliente: null,
  vehiculo: null,
}

afterEach(cleanup)

describe('CabeceraDeLaGuardada: «Revisiones» (C1)', () => {
  it('el botón está para todo el que abre la página y abre el panel por su URL', () => {
    render(<CabeceraDeLaGuardada {...props} />)
    expect(document.querySelector('[data-panel-de-revisiones]')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Revisiones' }))
    expect(
      document
        .querySelector('[data-panel-de-revisiones]')
        ?.getAttribute('data-panel-de-revisiones'),
    ).toBe('abierto')
    expect(screen.getByText('Panel 123')).toBeTruthy()
  })

  it('recargar con ?panel=revisiones lo abre', () => {
    render(<CabeceraDeLaGuardada {...props} />, '?panel=revisiones')
    expect(
      document
        .querySelector('[data-panel-de-revisiones]')
        ?.getAttribute('data-panel-de-revisiones'),
    ).toBe('abierto')
  })
})
