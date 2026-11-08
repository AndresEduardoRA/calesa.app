import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DescartarLaPlantilla } from './descartar-la-plantilla'

const refrescar = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refrescar }) }))
const descartarBorrador = vi.fn()
vi.mock('../actions/descartar-borrador', () => ({
  descartarBorrador: (entrada: unknown) => descartarBorrador(entrada) as Promise<unknown>,
}))
const avisarExito = vi.fn()
vi.mock('@/shared/ui/toasts', () => ({
  avisarExito: (t: string) => avisarExito(t),
  avisarError: vi.fn(),
}))

const HORA = '2026-11-07T15:00:00.123456+00:00'
const OTRA = '2026-11-07T16:00:00.654321+00:00'
const ORIGEN = { id: '00000000-0000-4000-8000-000000000001', nombre: 'Mini' }

beforeEach(() => {
  descartarBorrador.mockReset()
  refrescar.mockReset()
})
afterEach(cleanup)

function Prueba({ esperada = HORA as string | null, alCerrar = vi.fn() }) {
  return (
    <DescartarLaPlantilla
      abierto
      alCerrar={alCerrar}
      origen={ORIGEN}
      esperada={esperada}
      nombrado={HORA}
    />
  )
}

const confirmar = () =>
  screen.getByRole('button', { name: 'Descartar borrador' }) as HTMLButtonElement

describe('DescartarLaPlantilla', () => {
  it('el título nombra el origen y no a una persona; dice que no se deshace y que la publicada no cambia', () => {
    render(<Prueba />)
    expect(screen.getByText('Descartar el borrador de la tarjeta de Mini')).toBeTruthy()
    expect(
      screen.getByText(/Se borra y no se puede deshacer; la tarjeta publicada no cambia/),
    ).toBeTruthy()
  })

  it('confirmar llama con { origenId, esperada }, avisa y cierra', async () => {
    descartarBorrador.mockResolvedValue({ data: { ok: true, data: null } })
    const alCerrar = vi.fn()
    render(<Prueba alCerrar={alCerrar} />)
    fireEvent.click(confirmar())
    await waitFor(() => {
      expect(alCerrar).toHaveBeenCalledTimes(1)
    })
    expect(descartarBorrador).toHaveBeenCalledWith({ origenId: ORIGEN.id, esperada: HORA })
    expect(avisarExito).toHaveBeenCalledWith('Se descartó el borrador.')
  })

  it('tras descartar, que el borrador deje de estar no se dice mientras el diálogo se va', async () => {
    descartarBorrador.mockResolvedValue({ data: { ok: true, data: null } })
    const alCerrar = vi.fn()
    const { rerender } = render(<Prueba alCerrar={alCerrar} />)
    fireEvent.click(confirmar())
    await waitFor(() => {
      expect(alCerrar).toHaveBeenCalledTimes(1)
    })
    rerender(<Prueba alCerrar={alCerrar} esperada={null} />)
    expect(screen.queryByText(/El borrador ya no está/)).toBeNull()
  })

  it('un PT409 apaga «Descartar borrador», muestra «Recargar» y se va al llegar la versión nueva', async () => {
    descartarBorrador.mockResolvedValue({
      data: {
        ok: false,
        error: {
          codigo: 'conflicto',
          mensaje: 'El borrador de esta plantilla cambió hace 1 min, mientras lo editabas.',
        },
      },
    })
    const { rerender } = render(<Prueba />)
    fireEvent.click(confirmar())
    await waitFor(() => {
      expect(screen.getByText(/El borrador de esta plantilla cambió hace 1 min/)).toBeTruthy()
    })
    expect(confirmar().disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Recargar' }))
    expect(refrescar).toHaveBeenCalled()
    rerender(<Prueba esperada={OTRA} />)
    expect(screen.queryByText(/cambió hace 1 min/)).toBeNull()
    expect(confirmar().disabled).toBe(false)
  })

  it('con esperada nula dice que el borrador ya no está y apaga «Descartar borrador»', () => {
    render(<Prueba esperada={null} />)
    expect(
      screen.getByText('El borrador ya no está: otra persona lo publicó o lo descartó.'),
    ).toBeTruthy()
    expect(confirmar().disabled).toBe(true)
  })
})
