import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Recordatorio } from '../../../entities/recordatorios'
import { useModalDeRecordatorio } from './use-modal-de-recordatorio'

const avisarError = vi.fn()
vi.mock('@/shared/ui/toasts', () => ({ avisarError: (e: unknown) => avisarError(e) }))

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const HECHO = '9b2c7d1e-1f3a-4b6c-8d4e-2a5f6b7c8d90'

const uno = (cambios: Partial<Recordatorio>): Recordatorio => ({
  id: ID,
  titulo: 'Llamar',
  recordarEn: '2099-01-15T13:00:00+00:00',
  notificadoEn: null,
  completadoEn: null,
  actualizadoEn: '2026-10-15T14:00:00+00:00',
  leadId: null,
  leadNombre: null,
  leadNumeros: { numero: null, numeroPropio: null, creadorDelPropio: null },
  vehiculo: null,
  vehiculoOculto: false,
  ...cambios,
})

const PENDIENTE = uno({})
const COMPLETADO = uno({ id: HECHO, completadoEn: '2026-10-15T15:00:00+00:00' })

type Props = { lista: readonly Recordatorio[]; puedeAgendar: boolean; buscando?: boolean }

function montar(url: string, inicial: Props) {
  const alCambiarUrl = vi.fn<(evento: UrlUpdateEvent) => void>()
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter searchParams={url} onUrlUpdate={alCambiarUrl} hasMemory>
      {children}
    </NuqsTestingAdapter>
  )
  const hook = renderHook((p: Props) => useModalDeRecordatorio(p), {
    initialProps: inicial,
    wrapper: envoltorio,
  })
  return { ...hook, alCambiarUrl }
}

afterEach(() => {
  cleanup()
  avisarError.mockReset()
})

describe('useModalDeRecordatorio', () => {
  it('editar uno propio y pendiente lo abre con su versión', () => {
    const { result } = montar(`?panel=editar-recordatorio&recordatorio=${ID}`, {
      lista: [PENDIENTE],
      puedeAgendar: true,
    })
    expect(result.current.abierto).toBe(true)
    expect(result.current.original).toBe(PENDIENTE)
    expect(result.current.noDisponible).toBeNull()
  })

  it('un id que no está no abre: lo dice y limpia la URL', async () => {
    const { result, alCambiarUrl } = montar('?panel=editar-recordatorio&recordatorio=inventado', {
      lista: [PENDIENTE],
      puedeAgendar: true,
    })
    expect(result.current.abierto).toBe(false)
    expect(avisarError).toHaveBeenCalledWith({
      codigo: 'no_encontrado',
      mensaje: 'No encontramos este recordatorio.',
    })
    await waitFor(() => {
      expect(alCambiarUrl).toHaveBeenCalled()
    })
    expect(alCambiarUrl.mock.lastCall?.[0].queryString).toBe('')
  })

  it('uno completado no se edita: lo dice', () => {
    const { result } = montar(`?panel=editar-recordatorio&recordatorio=${HECHO}`, {
      lista: [PENDIENTE, COMPLETADO],
      puedeAgendar: true,
    })
    expect(result.current.abierto).toBe(false)
    expect(avisarError).toHaveBeenCalledWith(
      expect.objectContaining({ mensaje: expect.stringMatching(/completado/) as string }),
    )
  })

  it('si se completa con el modal abierto, sigue abierto y dice por qué ya no se guarda', () => {
    const { result, rerender } = montar(`?panel=editar-recordatorio&recordatorio=${ID}`, {
      lista: [PENDIENTE],
      puedeAgendar: true,
    })
    const completado = uno({ completadoEn: '2026-10-15T15:00:00+00:00' })
    rerender({ lista: [completado], puedeAgendar: true })
    expect(result.current.abierto).toBe(true)
    expect(result.current.noDisponible).toMatch(/completado/)
    expect(avisarError).not.toHaveBeenCalled()

    // Eliminado en otra pestaña: el último que se vio sigue a la vista.
    rerender({ lista: [], puedeAgendar: true })
    expect(result.current.abierto).toBe(true)
    expect(result.current.original?.id).toBe(ID)
    expect(result.current.noDisponible).toBe('No encontramos este recordatorio.')
  })

  it('agendar sólo con permiso; sin él la URL no abre nada', () => {
    expect(
      montar('?panel=agendar-recordatorio', { lista: [], puedeAgendar: true }).result.current
        .abierto,
    ).toBe(true)
    cleanup()
    const sin = montar('?panel=agendar-recordatorio', { lista: [], puedeAgendar: false })
    expect(sin.result.current.abierto).toBe(false)
    expect(sin.result.current.original).toBeNull()
  })

  it('abrir la edición escribe el id en la URL y suma al historial', async () => {
    const { result, alCambiarUrl } = montar('', { lista: [PENDIENTE], puedeAgendar: true })
    act(() => {
      result.current.abrirEdicion(ID)
    })
    await waitFor(() => {
      expect(alCambiarUrl).toHaveBeenCalled()
    })
    const ultima = alCambiarUrl.mock.lastCall?.[0]
    expect(ultima?.searchParams.get('panel')).toBe('editar-recordatorio')
    expect(ultima?.searchParams.get('recordatorio')).toBe(ID)
    expect(ultima?.options.history).toBe('push')
  })
})

describe('useModalDeRecordatorio: el de la URL que no estaba cargado', () => {
  it('mientras se busca el de la URL no abre ni dice que no está; al encontrarlo, abre', () => {
    const { result, rerender } = montar(`?panel=editar-recordatorio&recordatorio=${ID}`, {
      lista: [],
      puedeAgendar: true,
      buscando: true,
    })
    expect(result.current.abierto).toBe(false)
    expect(avisarError).not.toHaveBeenCalled()
    rerender({ lista: [PENDIENTE], puedeAgendar: true, buscando: false })
    expect(result.current.abierto).toBe(true)
    expect(result.current.original).toBe(PENDIENTE)
  })
})
