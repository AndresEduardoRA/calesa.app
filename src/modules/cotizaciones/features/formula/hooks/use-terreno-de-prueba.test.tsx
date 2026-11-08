import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { TerrenoDePrueba } from '../../../entities/formula/terreno-de-prueba'
import { useTerrenoDePrueba } from './use-terreno-de-prueba'

type Pedido = { origenId: string; tablas: string[]; cambios: string[] }
const pedidos: { pedido: Pedido; resolver: (r: Resultado<TerrenoDePrueba>) => void }[] = []
vi.mock('../../../areas/formula/composicion.client', () => ({
  leerElTerrenoDePrueba: (pedido: Pedido) =>
    new Promise<Resultado<TerrenoDePrueba>>((resolver) => {
      pedidos.push({ pedido, resolver })
    }),
}))

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const terreno = (oficial: number): TerrenoDePrueba => ({
  tipos_cambio: { oficial },
  monedas: { oficial: 'BOB' },
  tablas: {},
  avisos: [],
})
const montar = (inicial: { tablas: string[]; cambios: string[] }) =>
  renderHook(
    ({ p }) => useTerrenoDePrueba({ origenId: ORIGEN, tablas: p.tablas, cambios: p.cambios }),
    { initialProps: { p: inicial } },
  )
const responder = async (n: number, r: Resultado<TerrenoDePrueba>) => {
  await waitFor(() => {
    expect(pedidos.length).toBeGreaterThanOrEqual(n)
  })
  await act(async () => {
    pedidos[n - 1]?.resolver(r)
    await Promise.resolve()
  })
}

describe('useTerrenoDePrueba (T5)', () => {
  it('lee al montarse con lo que nombra la fórmula, y mientras tanto está leyendo', async () => {
    pedidos.length = 0
    const { result } = montar({ tablas: ['dep'], cambios: ['oficial'] })
    expect(result.current.estado).toEqual({ tipo: 'leyendo' })
    await responder(1, { ok: true, data: terreno(6.96) })
    expect(pedidos[0]?.pedido).toEqual({ origenId: ORIGEN, tablas: ['dep'], cambios: ['oficial'] })
    expect(result.current.estado).toEqual({ tipo: 'lista', terreno: terreno(6.96) })
  })

  it('sin nada que leer está lista al instante y no pide nada', () => {
    pedidos.length = 0
    const { result } = montar({ tablas: [], cambios: [] })
    expect(result.current.estado.tipo).toBe('lista')
    expect(pedidos).toHaveLength(0)
  })

  it('otro conjunto vuelve a leer; el mismo conjunto, aunque sea otra lista, no', async () => {
    pedidos.length = 0
    const { result, rerender } = montar({ tablas: ['dep'], cambios: ['oficial'] })
    await responder(1, { ok: true, data: terreno(1) })
    rerender({ p: { tablas: ['dep'], cambios: ['oficial'] } })
    expect(pedidos).toHaveLength(1)
    rerender({ p: { tablas: ['dep', 'flete'], cambios: ['oficial'] } })
    expect(result.current.estado).toEqual({ tipo: 'leyendo' })
    await responder(2, { ok: true, data: terreno(2) })
    expect(result.current.estado).toEqual({ tipo: 'lista', terreno: terreno(2) })
  })

  it('la respuesta de un pedido viejo no cambia el estado', async () => {
    pedidos.length = 0
    const { result, rerender } = montar({ tablas: ['a'], cambios: ['oficial'] })
    await waitFor(() => {
      expect(pedidos).toHaveLength(1)
    })
    rerender({ p: { tablas: ['b'], cambios: ['oficial'] } })
    await waitFor(() => {
      expect(pedidos).toHaveLength(2)
    })
    await act(async () => {
      pedidos[0]?.resolver({ ok: true, data: terreno(111) })
      await Promise.resolve()
    })
    expect(result.current.estado).toEqual({ tipo: 'leyendo' })
    await responder(2, { ok: true, data: terreno(222) })
    expect(result.current.estado).toEqual({ tipo: 'lista', terreno: terreno(222) })
  })

  it('el error da «error» y «Reintentar» vuelve a leer', async () => {
    pedidos.length = 0
    const { result } = montar({ tablas: ['dep'], cambios: [] })
    await responder(1, { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    expect(result.current.estado).toEqual({ tipo: 'error' })
    act(() => {
      result.current.reintentar()
    })
    expect(result.current.estado).toEqual({ tipo: 'leyendo' })
    await responder(2, { ok: true, data: terreno(3) })
    expect(result.current.estado.tipo).toBe('lista')
  })

  it('el desmontaje descarta lo que llega después', async () => {
    pedidos.length = 0
    const { unmount } = montar({ tablas: ['dep'], cambios: [] })
    await waitFor(() => {
      expect(pedidos).toHaveLength(1)
    })
    unmount()
    await act(async () => {
      pedidos[0]?.resolver({ ok: true, data: terreno(4) })
      await Promise.resolve()
    })
    expect(pedidos).toHaveLength(1)
  })
})
