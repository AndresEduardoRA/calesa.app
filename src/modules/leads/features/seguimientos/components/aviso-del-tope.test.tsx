import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import type { Seguimientos } from '../hooks/use-seguimientos'
import { AvisoDelTope } from './ventana-de-la-linea'

afterEach(cleanup)

const ZONA = 'America/La_Paz'
const tope = String(TOPE_DE_LO_CARGADO)

function aviso(desde: string | null) {
  const seguimientos = { desde } as unknown as Seguimientos
  render(<AvisoDelTope seguimientos={seguimientos} zona={ZONA} />)
  return screen.getByRole('status').textContent
}

describe('<AvisoDelTope>', () => {
  it('sin fecha, cuenta los más recientes', () => {
    expect(aviso(null)).toBe(
      `Mostrando los ${tope} más recientes. Para ver anteriores, ve a una fecha.`,
    )
  })

  it('desde una fecha, la nombra en la zona', () => {
    expect(aviso('2026-10-13')).toBe(
      `Mostrando ${tope} desde el 13 oct 2026. Para ver anteriores, ve a una fecha.`,
    )
  })
})
