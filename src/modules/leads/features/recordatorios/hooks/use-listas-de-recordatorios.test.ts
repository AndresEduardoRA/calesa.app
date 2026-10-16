import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Recordatorio } from '../../../entities/recordatorios'
import { useListasDeRecordatorios } from './use-listas-de-recordatorios'

type Pedido = { leadId: string; completados: boolean; desde: unknown }
const leerPagina = vi.fn<(pedido: Pedido) => Promise<unknown>>()
const leerUno = vi.fn<(id: string) => Promise<unknown>>()
const avisarError = vi.fn()
vi.mock('../../../composicion.client', () => ({
  leerPaginaDeRecordatorios: (pedido: Pedido) => leerPagina(pedido),
  leerRecordatorio: (id: string) => leerUno(id),
}))
vi.mock('@/shared/ui/toasts', () => ({ avisarError: (e: unknown) => avisarError(e) }))

const de = (n: number, completado: string | null = null): Recordatorio => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  titulo: `#${String(n)}`,
  recordarEn: new Date(Date.UTC(2026, 9, 20, 12, n)).toISOString(),
  notificadoEn: null,
  completadoEn: completado,
  actualizadoEn: '2026-10-15T14:00:00+00:00',
  leadId: 'l',
  leadNombre: 'Ana',
  leadNumero: 1,
  vehiculo: null,
  vehiculoOculto: false,
})

const pagina = (desde: number, hasta: number, hayMas: boolean, extra = {}) => ({
  ok: true,
  data: {
    recordatorios: Array.from({ length: hasta - desde }, (_, i) => de(desde + i)),
    hayMas,
    puedoAgendar: true,
    hayCompletados: true,
    ...extra,
  },
})

afterEach(() => {
  cleanup()
  leerPagina.mockReset()
  leerUno.mockReset()
  avisarError.mockReset()
})

describe('useListasDeRecordatorios: leer', () => {
  it('al montar lee una página de pendientes, y nada de completados hasta abrirlos', async () => {
    leerPagina.mockResolvedValueOnce(pagina(0, 20, true))
    const { result } = renderHook(() => useListasDeRecordatorios('l'))
    await waitFor(() => {
      expect(result.current.estado).toBe('listo')
    })
    expect(leerPagina).toHaveBeenCalledOnce()
    expect(leerPagina.mock.calls[0]?.[0]).toMatchObject({ completados: false, desde: null })
    expect(result.current.listas.pendientes.lista).toHaveLength(20)
    expect(result.current.listas.completados).toBeNull()
    leerPagina.mockResolvedValueOnce(pagina(50, 55, false))
    act(() => {
      result.current.abrirCompletados()
    })
    await waitFor(() => {
      expect(result.current.completados).toBe('listo')
    })
    expect(leerPagina.mock.calls[1]?.[0]).toMatchObject({ completados: true, desde: null })
  })

  it('un error al abrir se dice en su lugar y «Reintentar» vuelve a leer', async () => {
    leerPagina.mockResolvedValueOnce({ ok: false, error: { codigo: 'x', mensaje: 'no' } })
    const { result } = renderHook(() => useListasDeRecordatorios('l'))
    await waitFor(() => {
      expect(result.current.estado).toBe('error')
    })
    expect(avisarError).not.toHaveBeenCalled()
    leerPagina.mockResolvedValueOnce(pagina(0, 3, false))
    act(() => {
      result.current.reintentar()
    })
    await waitFor(() => {
      expect(result.current.estado).toBe('listo')
    })
  })

  it('al cambiar de lead no se mezcla: la respuesta del anterior se descarta', async () => {
    let soltar: (valor: unknown) => void = () => undefined
    leerPagina.mockReturnValueOnce(
      new Promise((resolver) => {
        soltar = resolver
      }),
    )
    leerPagina.mockResolvedValueOnce(pagina(100, 102, false))
    const { result, rerender } = renderHook(({ id }) => useListasDeRecordatorios(id), {
      initialProps: { id: 'a' },
    })
    rerender({ id: 'b' })
    await waitFor(() => {
      expect(result.current.estado).toBe('listo')
    })
    await act(async () => {
      soltar(pagina(0, 20, true))
      await Promise.resolve()
    })
    expect(result.current.leadId).toBe('b')
    expect(result.current.listas.pendientes.lista.map((r) => r.titulo)).toEqual(['#100', '#101'])
  })
})

describe('useListasDeRecordatorios: Ver más y recargar', () => {
  it('«Ver más» sigue desde el último; el doble clic pide una sola vez', async () => {
    leerPagina.mockResolvedValueOnce(pagina(0, 20, true))
    const { result } = renderHook(() => useListasDeRecordatorios('l'))
    await waitFor(() => {
      expect(result.current.estado).toBe('listo')
    })
    leerPagina.mockResolvedValueOnce(pagina(20, 25, false))
    act(() => {
      result.current.verMasPendientes()
      result.current.verMasPendientes()
    })
    await waitFor(() => {
      expect(result.current.listas.pendientes.lista).toHaveLength(25)
    })
    expect(leerPagina).toHaveBeenCalledTimes(2)
    expect(leerPagina.mock.calls[1]?.[0].desde).toEqual({
      desdeEn: de(19).recordarEn,
      desdeId: de(19).id,
    })
  })

  it('sin red al paginar: avisa, no pierde lo cargado, y el siguiente intento suma', async () => {
    leerPagina.mockResolvedValueOnce(pagina(0, 20, true))
    const { result } = renderHook(() => useListasDeRecordatorios('l'))
    await waitFor(() => {
      expect(result.current.estado).toBe('listo')
    })
    leerPagina.mockRejectedValueOnce(new Error('sin red'))
    await act(async () => {
      result.current.verMasPendientes()
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(avisarError).toHaveBeenCalledOnce()
    })
    expect(result.current.listas.pendientes.lista).toHaveLength(20)
    leerPagina.mockResolvedValueOnce(pagina(20, 40, true))
    act(() => {
      result.current.verMasPendientes()
    })
    await waitFor(() => {
      expect(result.current.listas.pendientes.lista).toHaveLength(40)
    })
  })

  it('«Recargar» lee sólo el que está en conflicto, por su id; si ya no está, sale', async () => {
    leerPagina.mockResolvedValueOnce(pagina(0, 5, false))
    const { result } = renderHook(() => useListasDeRecordatorios('l'))
    await waitFor(() => {
      expect(result.current.estado).toBe('listo')
    })
    leerUno.mockResolvedValueOnce({ ok: true, data: { ...de(2), titulo: 'Nuevo' } })
    await act(() => result.current.recargarUno(de(2).id))
    expect(leerPagina).toHaveBeenCalledOnce()
    expect(result.current.listas.pendientes.lista[2]?.titulo).toBe('Nuevo')
    leerUno.mockResolvedValueOnce({ ok: true, data: null })
    await act(() => result.current.recargarUno(de(3).id))
    expect(result.current.listas.pendientes.lista.map((r) => r.titulo)).not.toContain('#3')
  })

  it('el de la URL que no está cargado se busca por su id y queda entre los sueltos', async () => {
    leerPagina.mockResolvedValueOnce(pagina(0, 20, true))
    const { result } = renderHook(() => useListasDeRecordatorios('l'))
    await waitFor(() => {
      expect(result.current.estado).toBe('listo')
    })
    leerUno.mockResolvedValueOnce({ ok: true, data: de(300) })
    await act(async () => {
      expect(await result.current.buscar(de(300).id)).toBe('hecha')
    })
    expect(result.current.sueltos.map((r) => r.titulo)).toEqual(['#300'])
    expect(result.current.listas.pendientes.lista).toHaveLength(20)
  })
})
