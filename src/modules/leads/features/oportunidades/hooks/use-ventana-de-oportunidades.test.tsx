import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OportunidadDelLead } from '../../../entities/oportunidad'
import {
  useVentanaDeOportunidades,
  type PaginaDeOportunidades,
} from './use-ventana-de-oportunidades'

const leer = vi.fn<(pedido: { leadId: string; antes: unknown }) => Promise<unknown>>()
vi.mock('../../../composicion.client', () => ({
  leerMasOportunidades: (pedido: { leadId: string; antes: unknown }) => leer(pedido),
}))
const avisarError = vi.fn()
vi.mock('@/shared/ui/toasts', () => ({ avisarError: (e: unknown) => avisarError(e) }))

afterEach(() => {
  cleanup()
  leer.mockReset()
  avisarError.mockReset()
})

// Una por segundo, más recientes primero: la 1 es la más nueva.
const de = (n: number, actualizadoEn = 'v1'): OportunidadDelLead =>
  ({
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    estado: 'abierta',
    titulo: `#${String(n)}`,
    enEtapaDesde: `2026-11-06T12:00:${String(59 - n).padStart(2, '0')}+00:00`,
    actualizadoEn,
    eliminada: false,
  }) as unknown as OportunidadDelLead

const pagina = (desde: number, hasta: number, hayMas: boolean): PaginaDeOportunidades => ({
  oportunidades: Array.from({ length: hasta - desde }, (_, i) => de(desde + i)),
  hayMas,
})

// Lo que devuelve la lectura de una página.
const leida = (desde: number, hasta: number, hayMas: boolean) => ({
  ok: true,
  data: { puedoCrear: true, ...pagina(desde, hasta, hayMas) },
})

const titulos = (lista: readonly OportunidadDelLead[]) => lista.map((o) => o.titulo)

describe('useVentanaDeOportunidades: lo que trae el servidor y lo que vuelve de una action', () => {
  it('arranca con la página del servidor', () => {
    const { result } = renderHook(() => useVentanaDeOportunidades('l', pagina(1, 4, true)))
    expect(titulos(result.current.lista)).toEqual(['#1', '#2', '#3'])
    expect(result.current.hayMas).toBe(true)
  })

  it('una página con la misma firma no reinicia lo puesto; una distinta sí', () => {
    const { result, rerender } = renderHook(
      ({ inicial }) => useVentanaDeOportunidades('l', inicial),
      {
        initialProps: { inicial: pagina(1, 4, false) },
      },
    )
    act(() => {
      result.current.poner({ ...de(2, 'v2'), titulo: 'Editada' })
    })
    // Otra página con la misma firma (un objeto nuevo, lo mismo dentro): no se reinicia.
    rerender({ inicial: pagina(1, 4, false) })
    expect(titulos(result.current.lista)).toEqual(['#1', 'Editada', '#3'])
    // Otra versión de una de ellas: lo que trae el servidor manda.
    rerender({ inicial: { oportunidades: [de(1), de(2, 'v3'), de(3)], hayMas: false } })
    expect(titulos(result.current.lista)).toEqual(['#1', '#2', '#3'])
  })

  it('poner pone la respuesta en su lugar, también una nueva arriba, y quitar la saca', () => {
    const { result } = renderHook(() => useVentanaDeOportunidades('l', pagina(2, 4, false)))
    act(() => {
      result.current.poner(de(1))
    })
    expect(titulos(result.current.lista)).toEqual(['#1', '#2', '#3'])
    act(() => {
      result.current.quitar(de(2).id)
    })
    expect(titulos(result.current.lista)).toEqual(['#1', '#3'])
  })

  it('con más por leer, lo que cae después de lo cargado no entra', () => {
    const { result } = renderHook(() => useVentanaDeOportunidades('l', pagina(1, 4, true)))
    act(() => {
      result.current.poner(de(30))
    })
    expect(titulos(result.current.lista)).toEqual(['#1', '#2', '#3'])
  })

  it('cambiarEnSitio cambia una sin moverla', () => {
    const { result } = renderHook(() => useVentanaDeOportunidades('l', pagina(1, 4, false)))
    act(() => {
      result.current.cambiarEnSitio(de(2).id, (o) => ({ ...o, estado: 'ganada' }))
    })
    expect(result.current.lista.map((o) => o.estado)).toEqual(['abierta', 'ganada', 'abierta'])
  })
})

describe('useVentanaDeOportunidades: «Ver más»', () => {
  it('suma la página siguiente, con el cursor de la última cargada, y apaga «cargando»', async () => {
    leer.mockResolvedValueOnce(leida(4, 6, false))
    const { result } = renderHook(() => useVentanaDeOportunidades('lead-1', pagina(1, 4, true)))
    await act(() => result.current.cargarMas())
    expect(titulos(result.current.lista)).toEqual(['#1', '#2', '#3', '#4', '#5'])
    expect(result.current.hayMas).toBe(false)
    expect(result.current.cargando).toBe(false)
    expect(leer).toHaveBeenCalledWith({
      leadId: 'lead-1',
      antes: { antesAbierta: true, antesEn: de(3).enEtapaDesde, antesId: de(3).id },
    })
  })

  it('dos llamadas a la vez piden una sola página', async () => {
    let soltar: (valor: unknown) => void = () => undefined
    leer.mockReturnValueOnce(
      new Promise((resolver) => {
        soltar = resolver
      }),
    )
    const { result } = renderHook(() => useVentanaDeOportunidades('l', pagina(1, 4, true)))
    let primera: Promise<void> = Promise.resolve()
    act(() => {
      primera = result.current.cargarMas()
      void result.current.cargarMas()
    })
    expect(result.current.cargando).toBe(true)
    soltar(leida(4, 6, false))
    await act(() => primera)
    expect(leer).toHaveBeenCalledTimes(1)
    expect(result.current.lista).toHaveLength(5)
  })

  it('un fallo avisa y deja lo cargado igual', async () => {
    leer.mockResolvedValueOnce({ ok: false, error: { codigo: 'inesperado', mensaje: 'Falló.' } })
    const { result } = renderHook(() => useVentanaDeOportunidades('l', pagina(1, 4, true)))
    await act(() => result.current.cargarMas())
    expect(avisarError).toHaveBeenCalledWith({ codigo: 'inesperado', mensaje: 'Falló.' })
    expect(result.current.lista).toHaveLength(3)
    expect(result.current.hayMas).toBe(true)
    expect(result.current.cargando).toBe(false)
  })

  it('sin red avisa «No pudimos llegar al servidor.»', async () => {
    leer.mockRejectedValueOnce(new Error('red'))
    const { result } = renderHook(() => useVentanaDeOportunidades('l', pagina(1, 4, true)))
    await act(() => result.current.cargarMas())
    expect(avisarError).toHaveBeenCalledWith({
      codigo: 'inesperado',
      mensaje: 'No pudimos llegar al servidor.',
    })
    expect(result.current.cargando).toBe(false)
  })
})

describe('useVentanaDeOportunidades: «Ver más» con cambios en camino', () => {
  it('lo eliminado mientras la página venía en camino no vuelve con ella', async () => {
    let soltar: (valor: unknown) => void = () => undefined
    leer.mockReturnValueOnce(
      new Promise((resolver) => {
        soltar = resolver
      }),
    )
    const { result } = renderHook(() => useVentanaDeOportunidades('l', pagina(1, 4, true)))
    let espera: Promise<void> = Promise.resolve()
    act(() => {
      espera = result.current.cargarMas()
    })
    // La que se quita es la última cargada: el cursor retrocede, y la página pedida antes la trae.
    act(() => {
      result.current.quitar(de(3).id)
    })
    soltar(leida(3, 6, false))
    await act(() => espera)
    expect(titulos(result.current.lista)).toEqual(['#1', '#2', '#4', '#5'])
  })

  it('una restaurada vuelve a poder llegar', async () => {
    const { result } = renderHook(() => useVentanaDeOportunidades('l', pagina(1, 4, true)))
    act(() => {
      result.current.quitar(de(3).id)
    })
    act(() => {
      result.current.poner(de(3))
    })
    leer.mockResolvedValueOnce(leida(3, 5, false))
    await act(() => result.current.cargarMas())
    expect(titulos(result.current.lista)).toEqual(['#1', '#2', '#3', '#4'])
  })

  it('lo que se puso mientras la página venía no se pierde al llegar', async () => {
    let soltar: (valor: unknown) => void = () => undefined
    leer.mockReturnValueOnce(
      new Promise((resolver) => {
        soltar = resolver
      }),
    )
    const { result } = renderHook(() => useVentanaDeOportunidades('l', pagina(2, 5, true)))
    let espera: Promise<void> = Promise.resolve()
    act(() => {
      espera = result.current.cargarMas()
    })
    act(() => {
      result.current.poner({ ...de(1), titulo: 'Nueva' })
    })
    soltar(leida(5, 7, false))
    await act(() => espera)
    expect(titulos(result.current.lista)).toEqual(['Nueva', '#2', '#3', '#4', '#5', '#6'])
  })

  it('una página pedida antes de que el servidor cambiara lo cargado se descarta', async () => {
    let soltar: (valor: unknown) => void = () => undefined
    leer.mockReturnValueOnce(
      new Promise((resolver) => {
        soltar = resolver
      }),
    )
    const { result, rerender } = renderHook(
      ({ inicial }) => useVentanaDeOportunidades('l', inicial),
      { initialProps: { inicial: pagina(1, 4, true) } },
    )
    let espera: Promise<void> = Promise.resolve()
    act(() => {
      espera = result.current.cargarMas()
    })
    rerender({ inicial: { oportunidades: [de(1), de(2, 'v2'), de(3)], hayMas: true } })
    soltar(leida(4, 6, false))
    await act(() => espera)
    expect(titulos(result.current.lista)).toEqual(['#1', '#2', '#3'])
    expect(result.current.hayMas).toBe(true)
  })

  it('en el tope no hay «Ver más» que pedir: enElTope lo dice', () => {
    const { result } = renderHook(() => useVentanaDeOportunidades('l', pagina(1, 501, true)))
    expect(result.current.lista).toHaveLength(500)
    expect(result.current.enElTope).toBe(true)
  })
})
