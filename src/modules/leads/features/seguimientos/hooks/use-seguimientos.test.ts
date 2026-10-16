import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PaginaDeSeguimientos, Seguimiento } from '../../../entities/seguimiento'
import { SIN_VEHICULO } from '../../../entities/vehiculo-de-nota'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { useSeguimientos } from './use-seguimientos'

const leer = vi.fn<(pedido: { antes: unknown }) => Promise<unknown>>()
const leerUno = vi.fn<(pedido: { id: string }) => Promise<unknown>>()
vi.mock('../../../composicion.client', () => ({
  leerMasSeguimientos: (pedido: { antes: unknown }) => leer(pedido),
  leerSeguimiento: (pedido: { id: string }) => leerUno(pedido),
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
  leerUno.mockReset()
})

describe('useSeguimientos: «Ver más» y buscar', () => {
  it('«Ver más» suma la página siguiente', async () => {
    leer.mockResolvedValueOnce(pagina(20, 25, false))
    const { result } = renderHook(() => useSeguimientos('l', INICIAL))
    await act(() => result.current.cargarMas())
    expect(result.current.lista).toHaveLength(25)
    expect(result.current.hayMas).toBe(false)
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

  it('lo eliminado mientras «Ver más» esperaba no vuelve, y un segundo clic no pide otra vez', async () => {
    let soltar: (valor: unknown) => void = () => undefined
    leer.mockReturnValueOnce(
      new Promise((resolver) => {
        soltar = resolver
      }),
    )
    const { result } = renderHook(() => useSeguimientos('l', INICIAL))
    let primera: Promise<unknown> = Promise.resolve()
    let segunda: unknown
    await act(async () => {
      primera = result.current.cargarMas()
      segunda = await result.current.cargarMas()
    })
    expect(segunda).toBe('ocupada')
    act(() => {
      result.current.poner({ ...de(3), eliminado: true })
    })
    await act(async () => {
      soltar(pagina(20, 25, false))
      await primera
    })
    expect(leer).toHaveBeenCalledOnce()
    expect(result.current.lista).toHaveLength(24)
    expect(result.current.lista.some((s) => s.id === de(3).id)).toBe(false)
  })
})

describe('useSeguimientos: Recargar', () => {
  it('releer lee sólo la primera página: lo cargado más allá vuelve a «Ver más»', async () => {
    leer.mockResolvedValueOnce(pagina(20, 40, true))
    const { result } = renderHook(() => useSeguimientos('l', INICIAL))
    await act(() => result.current.cargarMas())
    expect(result.current.lista).toHaveLength(40)
    const primera = pagina(0, 20, true)
    primera.data.seguimientos[3] = { ...de(3), titulo: 'Cambiado' }
    leer.mockResolvedValueOnce(primera)
    await act(() => result.current.releer())
    expect(leer).toHaveBeenCalledTimes(2)
    expect(leer.mock.calls.at(-1)?.[0].antes).toBeNull()
    expect(result.current.lista).toHaveLength(20)
    expect(result.current.lista[3]?.titulo).toBe('Cambiado')
    expect(result.current.hayMas).toBe(true)
  })

  it('releer con uno en conflicto fuera de la primera página lo trae por su id: dos pedidos', async () => {
    leer.mockResolvedValueOnce(pagina(20, 40, true))
    const { result } = renderHook(() => useSeguimientos('l', INICIAL))
    await act(() => result.current.cargarMas())
    const nuevo = { ...de(33), titulo: 'Versión nueva', actualizadoEn: '2026-10-15T15:00:00+00:00' }
    leer.mockResolvedValueOnce(pagina(0, 20, true))
    leerUno.mockResolvedValueOnce({ ok: true, data: nuevo })
    await act(() => result.current.releer(de(33).id))
    expect(leer).toHaveBeenCalledTimes(2)
    expect(leerUno).toHaveBeenCalledOnce()
    // Queda para el modal, no en la lista (correría el cursor).
    expect(result.current.lista.some((s) => s.id === nuevo.id)).toBe(false)
    expect(result.current.sueltos).toEqual([nuevo])
    // Si vino en la primera página, no se pide aparte.
    leer.mockResolvedValueOnce(pagina(0, 20, true))
    await act(() => result.current.releer(de(5).id))
    expect(leerUno).toHaveBeenCalledOnce()
  })

  it('lo anotado mientras se relee no se pierde ni vuelve a su versión vieja', async () => {
    let soltar: (valor: unknown) => void = () => undefined
    leer.mockReturnValueOnce(
      new Promise((resolver) => {
        soltar = resolver
      }),
    )
    const { result } = renderHook(() => useSeguimientos('l', INICIAL))
    let lectura: Promise<unknown> = Promise.resolve()
    act(() => {
      lectura = result.current.releer()
    })
    act(() => {
      result.current.poner(de(-1))
      result.current.poner({ ...de(2), titulo: 'Editado' })
    })
    await act(async () => {
      soltar(pagina(0, 20, true))
      await lectura
    })
    expect(result.current.lista[0]?.id).toBe(de(-1).id)
    expect(result.current.lista.find((s) => s.id === de(2).id)?.titulo).toBe('Editado')
  })
})

describe('useSeguimientos: el tope y una fecha', () => {
  it('«Ver más» no pasa del tope de lo cargado', async () => {
    let n = 20
    leer.mockImplementation(() => {
      n += 20
      return Promise.resolve(pagina(n - 20, n, true))
    })
    const { result } = renderHook(() => useSeguimientos('l', INICIAL))
    for (let i = 0; i < 30; i += 1) {
      await act(() => result.current.cargarMas())
    }
    expect(result.current.lista).toHaveLength(TOPE_DE_LO_CARGADO)
    expect(result.current.enElTope).toBe(true)
    expect(leer).toHaveBeenCalledTimes(TOPE_DE_LO_CARGADO / 20 - 1)
  })

  it('«Ir a una fecha» siembra el cursor de ese día y «Volver» lee desde el principio', async () => {
    leer.mockResolvedValueOnce(pagina(100, 120, true))
    const { result } = renderHook(() => useSeguimientos('l', INICIAL))
    await act(() => result.current.irAUnaFecha('2026-10-15', 'America/La_Paz'))
    expect(leer.mock.calls.at(-1)?.[0].antes).toEqual({
      antesEn: '2026-10-16T04:00:00.000Z',
      antesId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    })
    expect(result.current.desde).toBe('2026-10-15')
    expect(result.current.lista[0]?.titulo).toBe('#100')
    leer.mockResolvedValueOnce(pagina(0, 20, true))
    await act(() => result.current.volverAlPrincipio())
    expect(result.current.desde).toBeNull()
    expect(leer.mock.calls.at(-1)?.[0].antes).toBeNull()
  })
})
