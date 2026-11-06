import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Seguimientos } from '../hooks/use-seguimientos'
import { DesdeUnaFecha } from './ventana-de-la-linea'

afterEach(cleanup)

const VOLVER = 'Volver a los más recientes'

function montar(dia: string, zona: string, ocupado = false) {
  const alVolver = vi.fn()
  const seguimientos = {
    desde: dia,
    cargando: ocupado,
    volverAlPrincipio: alVolver,
  } as unknown as Seguimientos
  render(<DesdeUnaFecha seguimientos={seguimientos} zona={zona} />)
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

  it('sin día no dibuja nada', () => {
    const seguimientos = { desde: null, cargando: false } as unknown as Seguimientos
    const { container } = render(<DesdeUnaFecha seguimientos={seguimientos} zona="UTC" />)
    expect(container.innerHTML).toBe('')
  })
})
