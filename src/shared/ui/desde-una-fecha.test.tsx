import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DesdeUnaFecha } from './desde-una-fecha'

afterEach(cleanup)

const VOLVER = 'Volver a los más recientes'

function montar(dia: string, zona: string, ocupado = false) {
  const alVolver = vi.fn()
  render(
    <DesdeUnaFecha dia={dia} zona={zona} ocupado={ocupado} volver={VOLVER} alVolver={alVolver} />,
  )
  return { alVolver, volver: screen.getByRole('button', { name: VOLVER }) }
}

describe('<DesdeUnaFecha>', () => {
  it.each(['America/La_Paz', 'Asia/Tokyo', 'America/Los_Angeles'])(
    'dice el día elegido, sin correrse con la zona (%s)',
    (zona) => {
      montar('2026-10-13', zona)
      expect(screen.getByText('Desde el 13 oct 2026')).toBeDefined()
    },
  )

  it('el botón vuelve una vez y se apaga ocupado', () => {
    const libre = montar('2026-10-13', 'America/La_Paz')
    expect((libre.volver as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(libre.volver)
    expect(libre.alVolver).toHaveBeenCalledTimes(1)
    cleanup()
    const ocupado = montar('2026-10-13', 'America/La_Paz', true)
    expect((ocupado.volver as HTMLButtonElement).disabled).toBe(true)
  })
})
