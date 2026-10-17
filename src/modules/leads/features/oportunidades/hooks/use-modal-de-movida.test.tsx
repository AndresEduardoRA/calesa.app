import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EtapaGuardada } from '../../../entities/embudo'
import { useModalDeMovida, type OportunidadAMover } from './use-modal-de-movida'
import { usePanelDeMovida } from './use-panel-de-movida'

const avisarError = vi.fn()
vi.mock('@/shared/ui/toasts', () => ({ avisarError: (e: unknown) => avisarError(e) }))

afterEach(() => {
  cleanup()
  avisarError.mockReset()
})

const etapa = (id: string, nombre: string, esPerdida = false) =>
  ({ id, nombre, esPerdida }) as unknown as EtapaGuardada
const ETAPAS = [etapa('a', 'Nuevo'), etapa('b', 'Cotizado'), etapa('c', 'Perdido', true)]
const OPORTUNIDAD: OportunidadAMover = { id: 'o1', titulo: 'Hilux', etapaId: 'a', etapas: ETAPAS }

function usar(busqueda: string, buscar: (id: string) => OportunidadAMover | null) {
  const envoltura = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter searchParams={busqueda}>{children}</NuqsTestingAdapter>
  )
  return renderHook(
    () => {
      const panel = usePanelDeMovida()
      return { panel, modal: useModalDeMovida(panel, buscar) }
    },
    { wrapper: envoltura },
  )
}

describe('useModalDeMovida', () => {
  it('abre con lo que nombra la URL', () => {
    const { result } = usar('?panel=mover-oportunidad&oportunidad=o1&destino=c', (id) =>
      id === 'o1' ? OPORTUNIDAD : null,
    )
    expect(result.current.modal.abierto).toBe(true)
    expect(result.current.modal.oportunidad?.titulo).toBe('Hilux')
    expect(result.current.modal.destino?.nombre).toBe('Perdido')
    expect(avisarError).not.toHaveBeenCalled()
  })

  it('con un `buscar` que arma un objeto nuevo en cada llamada (como el tablero y la ficha) no entra en un bucle', () => {
    const { result } = usar('?panel=mover-oportunidad&oportunidad=o1&destino=c', (id) =>
      id === 'o1' ? { ...OPORTUNIDAD, etapas: [...ETAPAS] } : null,
    )
    expect(result.current.modal.abierto).toBe(true)
    expect(result.current.modal.destino?.nombre).toBe('Perdido')
  })

  it('sin ?panel= está cerrado', () => {
    const { result } = usar('', () => OPORTUNIDAD)
    expect(result.current.modal.abierto).toBe(false)
  })

  it('una oportunidad que no está no abre: avisa y limpia la URL', async () => {
    const { result } = usar('?panel=mover-oportunidad&oportunidad=zzz&destino=c', () => null)
    expect(result.current.modal.abierto).toBe(false)
    await waitFor(() => {
      expect(avisarError).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Esa oportunidad ya no está en la lista.' }),
      )
    })
    await waitFor(() => {
      expect(result.current.panel.abierto).toBe(false)
    })
  })

  it('una etapa que no pide motivo no abre', async () => {
    const { result } = usar('?panel=mover-oportunidad&oportunidad=o1&destino=b', () => OPORTUNIDAD)
    expect(result.current.modal.abierto).toBe(false)
    await waitFor(() => {
      expect(avisarError).toHaveBeenCalledTimes(1)
    })
  })

  it('si la oportunidad desaparece con el modal abierto, sigue a la vista y dice por qué', () => {
    let hay = true
    const { result, rerender } = usar('?panel=mover-oportunidad&oportunidad=o1&destino=c', () =>
      hay ? OPORTUNIDAD : null,
    )
    expect(result.current.modal.abierto).toBe(true)
    hay = false
    rerender()
    expect(result.current.modal.abierto).toBe(true)
    expect(result.current.modal.noDisponible).toBe('Esa oportunidad ya no está en la lista.')
  })
})
