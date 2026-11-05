import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import type { PaginaDeRevisiones } from '../../../entities/revisiones'

type Respuesta = Resultado<PaginaDeRevisiones>
type Pedido = { cotizacionId: string; antes: number | null; resolver: (r: Respuesta) => void }
const pedidos: Pedido[] = []
vi.mock('../../../composicion-revisiones.client', () => ({
  leerRevisiones: (pedido: { cotizacionId: string; antes: number | null }) =>
    new Promise<Respuesta>((resolver) => {
      pedidos.push({ ...pedido, resolver })
    }),
}))

import { useRevisiones } from './use-revisiones'

const COTIZACION = '00000000-0000-4000-8000-0000000000aa'
const revision = (id: number) => ({
  id,
  usuarioId: null,
  creadoEn: '2026-11-04T10:00:00+00:00',
  autor: null,
  diff: {},
})
const pagina = (desde: number, cuantas: number, siguiente: number | null): Respuesta => ({
  ok: true,
  data: {
    revisiones: Array.from({ length: cuantas }, (_, i) => revision(desde - i)),
    siguiente,
    etiquetas: { nodos: new Map([[`n${String(desde)}`, 'Etiqueta']]), grupos: new Map() },
  },
})

beforeEach(() => {
  pedidos.length = 0
})

const montar = (inicial: { abierto: boolean; version: string }) =>
  renderHook(
    (props: { abierto: boolean; version: string }) =>
      useRevisiones({ cotizacionId: COTIZACION, ...props }),
    { initialProps: inicial },
  )

describe('useRevisiones: las revisiones de una guardada', () => {
  it('no lee con el panel cerrado, lee al abrirlo y no otra vez con la misma versión', async () => {
    const { result, rerender } = montar({ abierto: false, version: 'v1' })
    expect(pedidos).toHaveLength(0)
    rerender({ abierto: true, version: 'v1' })
    await waitFor(() => {
      expect(pedidos).toHaveLength(1)
    })
    expect(pedidos[0]).toMatchObject({ cotizacionId: COTIZACION, antes: null })
    expect(result.current.leido).toBe(false)
    await act(async () => {
      pedidos[0]?.resolver(pagina(30, 3, null))
      await Promise.resolve()
    })
    expect(result.current.leido).toBe(true)
    expect(result.current.revisiones.map((r) => r.id)).toEqual([30, 29, 28])
    rerender({ abierto: false, version: 'v1' })
    rerender({ abierto: true, version: 'v1' })
    expect(pedidos).toHaveLength(1)
  })

  it('otra versión de la cotización olvida lo leído y la próxima apertura lee de nuevo', async () => {
    const { result, rerender } = montar({ abierto: true, version: 'v1' })
    await waitFor(() => {
      expect(pedidos).toHaveLength(1)
    })
    await act(async () => {
      pedidos[0]?.resolver(pagina(30, 3, null))
      await Promise.resolve()
    })
    rerender({ abierto: false, version: 'v2' })
    expect(result.current.leido).toBe(false)
    expect(result.current.revisiones).toEqual([])
    rerender({ abierto: true, version: 'v2' })
    await waitFor(() => {
      expect(pedidos).toHaveLength(2)
    })
    expect(pedidos[1]?.antes).toBeNull()
  })
})

describe('useRevisiones: «Ver más»', () => {
  it('«Ver más» pide desde el cursor, junta las filas y las etiquetas y no repite el pedido en vuelo', async () => {
    const { result } = montar({ abierto: true, version: 'v1' })
    await waitFor(() => {
      expect(pedidos).toHaveLength(1)
    })
    await act(async () => {
      pedidos[0]?.resolver(pagina(30, 20, 11))
      await Promise.resolve()
    })
    expect(result.current.hayMasParaPedir).toBe(true)
    act(() => {
      result.current.verMas()
      result.current.verMas()
    })
    expect(pedidos).toHaveLength(2)
    expect(pedidos[1]?.antes).toBe(11)
    await act(async () => {
      pedidos[1]?.resolver(pagina(10, 5, null))
      await Promise.resolve()
    })
    expect(result.current.revisiones).toHaveLength(25)
    expect(result.current.etiquetas.nodos.get('n30')).toBe('Etiqueta')
    expect(result.current.etiquetas.nodos.get('n10')).toBe('Etiqueta')
    expect(result.current.hayMasParaPedir).toBe(false)
  })

  it('descarta la respuesta de un pedido que ya no es el último (otra versión)', async () => {
    const { result, rerender } = montar({ abierto: true, version: 'v1' })
    await waitFor(() => {
      expect(pedidos).toHaveLength(1)
    })
    rerender({ abierto: true, version: 'v2' })
    await waitFor(() => {
      expect(pedidos).toHaveLength(2)
    })
    await act(async () => {
      pedidos[0]?.resolver(pagina(99, 2, null))
      await Promise.resolve()
    })
    expect(result.current.leido).toBe(false)
    await act(async () => {
      pedidos[1]?.resolver(pagina(50, 2, null))
      await Promise.resolve()
    })
    expect(result.current.revisiones.map((r) => r.id)).toEqual([50, 49])
  })

  it('en el tope de lo cargado, con más por pedir: enElTope y sin «Ver más»', async () => {
    const { result } = montar({ abierto: true, version: 'v1' })
    await waitFor(() => {
      expect(pedidos).toHaveLength(1)
    })
    await act(async () => {
      pedidos[0]?.resolver(pagina(TOPE_DE_LO_CARGADO, TOPE_DE_LO_CARGADO, 1))
      await Promise.resolve()
    })
    expect(result.current.enElTope).toBe(true)
    expect(result.current.hayMasParaPedir).toBe(false)
    act(() => {
      result.current.verMas()
    })
    expect(pedidos).toHaveLength(1)
  })
})

describe('useRevisiones: errores', () => {
  it('un error de la primera página se reintenta; uno de «Ver más» deja lo leído', async () => {
    const { result } = montar({ abierto: true, version: 'v1' })
    await waitFor(() => {
      expect(pedidos).toHaveLength(1)
    })
    await act(async () => {
      pedidos[0]?.resolver({ ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
      await Promise.resolve()
    })
    expect(result.current.error).not.toBeNull()
    expect(result.current.leido).toBe(false)
    act(() => {
      result.current.reintentar()
    })
    await waitFor(() => {
      expect(pedidos).toHaveLength(2)
    })
    await act(async () => {
      pedidos[1]?.resolver(pagina(30, 20, 11))
      await Promise.resolve()
    })
    act(() => {
      result.current.verMas()
    })
    await act(async () => {
      pedidos[2]?.resolver({ ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
      await Promise.resolve()
    })
    expect(result.current.revisiones).toHaveLength(20)
    expect(result.current.error).not.toBeNull()
    expect(result.current.leido).toBe(true)
    act(() => {
      result.current.reintentar()
    })
    expect(pedidos[3]?.antes).toBe(11)
  })
})
