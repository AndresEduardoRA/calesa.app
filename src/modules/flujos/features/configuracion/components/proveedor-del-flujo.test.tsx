import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useVersionDelFlujo } from '../hooks/use-version-del-flujo'
import { ProveedorDelFlujo } from './proveedor-del-flujo'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

afterEach(() => {
  cleanup()
  refresh.mockClear()
})

function Sonda() {
  const { version, avisarConflicto } = useVersionDelFlujo()
  return (
    <>
      <p>versión {version}</p>
      <button
        type="button"
        onClick={() => {
          avisarConflicto()
        }}
      >
        chocar
      </button>
      <button
        type="button"
        onClick={() => {
          avisarConflicto('Rosa cambió este flujo hace 1 min.')
        }}
      >
        chocar con mensaje
      </button>
    </>
  )
}

const guid = '00000000-0000-4000-8000-000000000001'

describe('ProveedorDelFlujo', () => {
  it('useVersionDelFlujo() entrega la versión leída', () => {
    render(
      <ProveedorDelFlujo flujoId={guid} version="v1">
        <Sonda />
      </ProveedorDelFlujo>,
    )
    expect(screen.getByText('versión v1')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Recargar' })).toBeNull()
  })

  it('un conflicto muestra el aviso con «Recargar», que pide la versión nueva', () => {
    render(
      <ProveedorDelFlujo flujoId={guid} version="v1">
        <Sonda />
      </ProveedorDelFlujo>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'chocar' }))
    expect(screen.getByText('Otra persona cambió este flujo')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Recargar' }))
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('usa el mensaje de la base cuando lo trae', () => {
    render(
      <ProveedorDelFlujo flujoId={guid} version="v1">
        <Sonda />
      </ProveedorDelFlujo>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'chocar con mensaje' }))
    expect(screen.getByText('Rosa cambió este flujo hace 1 min.')).toBeDefined()
  })

  it('el aviso se va cuando llega otra versión, no antes', () => {
    const { rerender } = render(
      <ProveedorDelFlujo flujoId={guid} version="v1">
        <Sonda />
      </ProveedorDelFlujo>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'chocar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Recargar' }))
    expect(screen.getByText('Otra persona cambió este flujo')).toBeDefined()
    act(() => {
      rerender(
        <ProveedorDelFlujo flujoId={guid} version="v2">
          <Sonda />
        </ProveedorDelFlujo>,
      )
    })
    expect(screen.queryByText('Otra persona cambió este flujo')).toBeNull()
    expect(screen.getByText('versión v2')).toBeDefined()
  })

  it('fuera del proveedor falla con su mensaje', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<Sonda />)).toThrow('sólo se usa dentro de <ProveedorDelFlujo>')
    error.mockRestore()
  })
})
