import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PaginaDeSeguimientos, Seguimiento } from '../../../entities/seguimiento'
import { SIN_VEHICULO } from '../../../entities/vehiculo-de-nota'
import { useSeguimientos } from './use-seguimientos'

const leer = vi.fn<(pedido: { antes: unknown }) => Promise<unknown>>()
vi.mock('../../../composicion.client', () => ({
  leerMasSeguimientos: (pedido: { antes: unknown }) => leer(pedido),
}))
vi.mock('@/shared/ui/toasts', () => ({ avisarError: vi.fn() }))

// Un seguimiento por minuto, más recientes primero.
const de = (n: number): Seguimiento => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  leadId: 'l',
  tipoId: 't',
  tipoNombre: 'Llamada',
  tipoIcono: null,
  titulo: `#${String(n)}`,
  detalleDoc: null,
  detalleTexto: null,
  visibilidad: 'privado',
  ocurridoEn: new Date(Date.UTC(2026, 9, 15, 12, 60 - n)).toISOString(),
  actualizadoEn: '2026-10-15T14:00:00+00:00',
  eliminado: false,
  autorId: 'yo',
  autorNombre: null,
  esMio: true,
  ...SIN_VEHICULO,
})

const pagina = (desde: number, hasta: number, hayMas: boolean) => ({
  ok: true,
  data: {
    seguimientos: Array.from({ length: hasta - desde }, (_, i) => de(desde + i)),
    hayMas,
    puedoAnotar: true,
  },
})

const INICIAL: PaginaDeSeguimientos = { ...pagina(0, 20, true).data }

afterEach(() => {
  cleanup()
  leer.mockReset()
})

describe('useSeguimientos', () => {
  it('«Ver más» suma la página siguiente', async () => {
    leer.mockResolvedValueOnce(pagina(20, 25, false))
    const { result } = renderHook(() => useSeguimientos('l', INICIAL))
    await act(() => result.current.cargarMas())
    expect(result.current.lista).toHaveLength(25)
    expect(result.current.hayMas).toBe(false)
  })

  it('releer vuelve a leer desde el principio tanto como había cargado, con lo nuevo', async () => {
    leer.mockResolvedValueOnce(pagina(20, 40, true))
    const { result } = renderHook(() => useSeguimientos('l', INICIAL))
    await act(() => result.current.cargarMas())
    expect(result.current.lista).toHaveLength(40)
    const cambiado = { ...de(30), titulo: 'Cambiado', actualizadoEn: '2026-10-15T15:00:00+00:00' }
    const primera = pagina(0, 20, true)
    const segunda = pagina(20, 40, true)
    segunda.data.seguimientos[10] = cambiado
    leer.mockResolvedValueOnce(primera).mockResolvedValueOnce(segunda)
    await act(() => result.current.releer())
    expect(leer.mock.calls.at(-2)?.[0].antes).toBeNull()
    expect(result.current.lista).toHaveLength(40)
    expect(result.current.lista.find((s) => s.id === cambiado.id)?.titulo).toBe('Cambiado')
  })

  it('buscar pide páginas hasta encontrarlo, y no más', async () => {
    leer.mockResolvedValueOnce(pagina(20, 40, true)).mockResolvedValueOnce(pagina(40, 60, true))
    const { result } = renderHook(() => useSeguimientos('l', INICIAL))
    await act(() => result.current.buscar(de(45).id))
    expect(leer).toHaveBeenCalledTimes(2)
    expect(result.current.lista.some((s) => s.id === de(45).id)).toBe(true)
  })

  it('buscar se detiene en el tope de páginas si no aparece', async () => {
    leer.mockImplementation(() => Promise.resolve(pagina(100, 101, true)))
    const { result } = renderHook(() => useSeguimientos('l', INICIAL))
    await act(() => result.current.buscar('no-esta'))
    expect(leer).toHaveBeenCalledTimes(5)
  })
})
