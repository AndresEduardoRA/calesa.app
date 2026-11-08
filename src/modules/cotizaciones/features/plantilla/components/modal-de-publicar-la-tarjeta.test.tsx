import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProveedorAtajos } from '@/shared/ui/atajos'
import { ModalDePublicarLaTarjeta } from './modal-de-publicar-la-tarjeta'

const refrescar = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refrescar }) }))
const publicarBorrador = vi.fn()
vi.mock('../actions/publicar-borrador', () => ({
  publicarBorrador: (entrada: unknown) => publicarBorrador(entrada) as Promise<unknown>,
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
  publicarBorrador.mockReset()
  refrescar.mockReset()
})
afterEach(cleanup)

function Prueba({ esperada = HORA as string | null, alCerrar = vi.fn() }) {
  return (
    <ProveedorAtajos>
      <ModalDePublicarLaTarjeta abierto alCerrar={alCerrar} origen={ORIGEN} esperada={esperada} />
    </ProveedorAtajos>
  )
}

const nota = () => screen.getByLabelText('Nota de la versión') as HTMLTextAreaElement
const escribir = (valor: string) => {
  fireEvent.change(nota(), { target: { value: valor } })
}
const publicar = () => screen.getByRole('button', { name: 'Publicar' }) as HTMLButtonElement

describe('ModalDePublicarLaTarjeta', () => {
  it('dice el título, la fecha del borrador y que lo sin guardar no se publica', () => {
    render(<Prueba />)
    expect(screen.getByText('Publicar la tarjeta de Mini')).toBeTruthy()
    expect(screen.getByText(/Se publica el borrador guardado el .*2026/)).toBeTruthy()
    expect(screen.getByText(/sin guardar en el editor no se publica/)).toBeTruthy()
    expect(screen.getByText('0 de 2000')).toBeTruthy()
  })

  it('sin nota dice «Publicar pide una nota.» junto al campo y no llama a la action', async () => {
    render(<Prueba />)
    fireEvent.click(publicar())
    await waitFor(() => {
      expect(screen.getByText('Publicar pide una nota.')).toBeTruthy()
    })
    expect(publicarBorrador).not.toHaveBeenCalled()
  })

  it('con nota llama con { origenId, esperada, nota }, avisa y cierra', async () => {
    publicarBorrador.mockResolvedValue({ data: { ok: true, data: 'id-publicada' } })
    const alCerrar = vi.fn()
    render(<Prueba alCerrar={alCerrar} />)
    escribir('  Subo el flete ')
    fireEvent.click(publicar())
    await waitFor(() => {
      expect(alCerrar).toHaveBeenCalledTimes(1)
    })
    expect(publicarBorrador).toHaveBeenCalledWith({
      origenId: ORIGEN.id,
      esperada: HORA,
      nota: 'Subo el flete',
    })
    expect(avisarExito).toHaveBeenCalledWith('Se publicó la tarjeta.')
  })

  it('con esperada nula dice que el borrador ya no está y no deja publicar', () => {
    render(<Prueba esperada={null} />)
    expect(
      screen.getByText(/El borrador ya no está: otra persona lo publicó o lo descartó\./),
    ).toBeTruthy()
    expect(publicar().disabled).toBe(true)
  })

  it('un PT409 muestra el mensaje de la base con «Recargar», conserva la nota y apaga «Publicar»', async () => {
    publicarBorrador.mockResolvedValue({
      data: {
        ok: false,
        error: {
          codigo: 'conflicto',
          mensaje: 'El borrador de esta plantilla cambió hace 1 min, mientras lo editabas.',
        },
      },
    })
    const { rerender } = render(<Prueba />)
    escribir('Mi nota')
    fireEvent.click(publicar())
    await waitFor(() => {
      expect(screen.getByText(/El borrador de esta plantilla cambió hace 1 min/)).toBeTruthy()
    })
    expect(screen.getByText(/La nota que escribiste sigue aquí/)).toBeTruthy()
    expect(nota().value).toBe('Mi nota')
    expect(publicar().disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Recargar' }))
    expect(refrescar).toHaveBeenCalled()
    // Llega la versión nueva: el conflicto se va, la nota queda.
    rerender(<Prueba esperada={OTRA} />)
    expect(screen.queryByText(/cambió hace 1 min/)).toBeNull()
    expect(nota().value).toBe('Mi nota')
    expect(publicar().disabled).toBe(false)
  })
})
