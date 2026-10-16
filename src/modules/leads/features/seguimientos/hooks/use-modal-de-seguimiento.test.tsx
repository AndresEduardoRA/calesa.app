import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MENSAJE_SIN_TIPOS_DE_SEGUIMIENTO } from '../../../entities/edicion-de-seguimiento'
import {
  MENSAJE_DE_SEGUIMIENTO_NO_DISPONIBLE,
  type Seguimiento,
} from '../../../entities/seguimiento'
import { SIN_VEHICULO } from '../../../entities/vehiculo-de-nota'
import { useModalDeSeguimiento } from './use-modal-de-seguimiento'
import type { Seguimientos } from './use-seguimientos'

const avisarError = vi.fn()
vi.mock('@/shared/ui/toasts', () => ({ avisarError: (e: unknown) => avisarError(e) }))

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'

const uno = (cambios: Partial<Seguimiento> = {}): Seguimiento => ({
  id: ID,
  leadId: 'l',
  tipoId: 't',
  tipoNombre: 'Llamada',
  tipoIcono: null,
  titulo: 'Llamó',
  detalleDoc: null,
  detalleTexto: null,
  visibilidad: 'privado',
  ocurridoEn: '2026-10-15T14:00:00+00:00',
  actualizadoEn: '2026-10-15T14:00:00+00:00',
  eliminado: false,
  autorId: 'yo',
  autorNombre: null,
  esMio: true,
  ...SIN_VEHICULO,
  ...cambios,
})

const lineaDe = (cambios: Partial<Seguimientos> = {}): Seguimientos => ({
  lista: [],
  hayMas: false,
  puedoAnotar: true,
  cargando: false,
  cargarMas: vi.fn(() => Promise.resolve()),
  releer: vi.fn(() => Promise.resolve()),
  buscar: vi.fn(() => Promise.resolve()),
  poner: vi.fn(),
  ...cambios,
})

type Props = { seguimientos: Seguimientos; hayTipos: boolean }

function montar(url: string, inicial: Props) {
  const alCambiarUrl = vi.fn<(evento: UrlUpdateEvent) => void>()
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter searchParams={url} onUrlUpdate={alCambiarUrl} hasMemory>
      {children}
    </NuqsTestingAdapter>
  )
  const hook = renderHook((p: Props) => useModalDeSeguimiento(p), {
    initialProps: inicial,
    wrapper: envoltorio,
  })
  return { ...hook, alCambiarUrl }
}

afterEach(() => {
  cleanup()
  avisarError.mockReset()
})

describe('useModalDeSeguimiento: anotar', () => {
  it('con la cartera y tipos activos, abre', () => {
    const { result } = montar('?panel=anotar-seguimiento', {
      seguimientos: lineaDe(),
      hayTipos: true,
    })
    expect(result.current.abierto).toBe(true)
    expect(result.current.original).toBeNull()
  })

  it('sin la cartera, la URL escrita a mano no abre nada', () => {
    const { result } = montar('?panel=anotar-seguimiento', {
      seguimientos: lineaDe({ puedoAnotar: false }),
      hayTipos: true,
    })
    expect(result.current.abierto).toBe(false)
    expect(avisarError).not.toHaveBeenCalled()
  })

  it('sin tipos activos, no abre, lo dice y limpia la URL', async () => {
    const { result, alCambiarUrl } = montar('?panel=anotar-seguimiento', {
      seguimientos: lineaDe(),
      hayTipos: false,
    })
    expect(result.current.abierto).toBe(false)
    await waitFor(() => {
      expect(alCambiarUrl).toHaveBeenCalled()
    })
    expect(avisarError).toHaveBeenCalledWith({
      codigo: 'no_encontrado',
      mensaje: MENSAJE_SIN_TIPOS_DE_SEGUIMIENTO,
    })
    expect(alCambiarUrl.mock.lastCall?.[0].queryString).toBe('')
  })
})

describe('useModalDeSeguimiento: editar', () => {
  it('lo propio con la cartera abre con su versión', () => {
    const propio = uno()
    const { result } = montar(`?panel=editar-seguimiento&seguimiento=${ID}`, {
      seguimientos: lineaDe({ lista: [propio] }),
      hayTipos: true,
    })
    expect(result.current.abierto).toBe(true)
    expect(result.current.original).toBe(propio)
    expect(result.current.noDisponible).toBeNull()
  })

  it('lo ajeno no abre y dice lo mismo que lo que no existe', async () => {
    const { result } = montar(`?panel=editar-seguimiento&seguimiento=${ID}`, {
      seguimientos: lineaDe({ lista: [uno({ esMio: false })] }),
      hayTipos: true,
    })
    expect(result.current.abierto).toBe(false)
    await waitFor(() => {
      expect(avisarError).toHaveBeenCalledWith({
        codigo: 'no_encontrado',
        mensaje: MENSAJE_DE_SEGUIMIENTO_NO_DISPONIBLE,
      })
    })
  })

  it('uno más allá de lo cargado se busca antes de decidir', () => {
    const buscar = vi.fn(() => Promise.resolve())
    const { result, rerender } = montar(`?panel=editar-seguimiento&seguimiento=${ID}`, {
      seguimientos: lineaDe({ hayMas: true, buscar }),
      hayTipos: true,
    })
    expect(result.current.abierto).toBe(false)
    expect(buscar).toHaveBeenCalledWith(ID)
    expect(avisarError).not.toHaveBeenCalled()
    // Llegó en la página siguiente.
    rerender({ seguimientos: lineaDe({ lista: [uno()], hayMas: true, buscar }), hayTipos: true })
    expect(result.current.abierto).toBe(true)
  })

  it('si la búsqueda no lo encuentra, no abre y lo dice', async () => {
    const { result } = montar(`?panel=editar-seguimiento&seguimiento=${ID}`, {
      seguimientos: lineaDe({ hayMas: true }),
      hayTipos: true,
    })
    await waitFor(() => {
      expect(avisarError).toHaveBeenCalledOnce()
    })
    expect(result.current.abierto).toBe(false)
  })

  it('el que deja de estar con el modal abierto no lo cierra: lo dice', () => {
    const { result, rerender } = montar(`?panel=editar-seguimiento&seguimiento=${ID}`, {
      seguimientos: lineaDe({ lista: [uno()] }),
      hayTipos: true,
    })
    act(() => {
      rerender({ seguimientos: lineaDe({ lista: [] }), hayTipos: true })
    })
    expect(result.current.abierto).toBe(true)
    expect(result.current.noDisponible).toBe(MENSAJE_DE_SEGUIMIENTO_NO_DISPONIBLE)
    expect(result.current.original?.id).toBe(ID)
  })
})
