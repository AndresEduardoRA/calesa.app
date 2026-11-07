import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import {
  MENSAJE_SIN_LA_CONSTANTE,
  MENSAJE_SIN_LEER_EL_VALOR,
  type ValorPorDefecto,
} from '../../../entities/formula/ajuste'
import { useValorPorDefecto } from './use-valor-por-defecto'

type Respuesta = Resultado<ValorPorDefecto | null>
type Pedido = { origenId: string; nodos: string[]; resolver: (r: Respuesta) => void }
const pedidos: Pedido[] = []
vi.mock('../../../areas/formula/composicion.client', () => ({
  leerValorPorDefecto: (pedido: { origenId: string; nodos: string[] }) =>
    new Promise<Respuesta>((resolver) => {
      pedidos.push({ ...pedido, resolver })
    }),
}))

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const PUBLICADA = '22222222-2222-4222-8222-222222222222'
const NODOS = ['flete']

const leido = (valor: number | null, version = 3): Respuesta => ({
  ok: true,
  data: { publicadaId: PUBLICADA, version, valores: { flete: valor } },
})

const responder = async (n: number, r: Respuesta) => {
  await waitFor(() => {
    expect(pedidos.length).toBeGreaterThanOrEqual(n)
  })
  await act(async () => {
    pedidos[n - 1]?.resolver(r)
    await Promise.resolve()
  })
}

beforeEach(() => {
  pedidos.length = 0
})

describe('useValorPorDefecto', () => {
  it('al montarse lee una vez el origen y sus nodos, y queda listo', async () => {
    const { result } = renderHook(() => useValorPorDefecto({ origenId: ORIGEN, nodos: NODOS }))
    expect(result.current.estado).toEqual({ tipo: 'leyendo' })
    await responder(1, leido(5))
    expect(pedidos.map(({ origenId, nodos }) => ({ origenId, nodos }))).toEqual([
      { origenId: ORIGEN, nodos: NODOS },
    ])
    expect(result.current.estado).toEqual({
      tipo: 'listo',
      publicadaId: PUBLICADA,
      version: 3,
      valores: { flete: 5 },
    })
  })

  it('un error de lectura dice que no se pudo leer; releer pide otra vez', async () => {
    const { result } = renderHook(() => useValorPorDefecto({ origenId: ORIGEN, nodos: NODOS }))
    await responder(1, { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    expect(result.current.estado).toEqual({ tipo: 'error', mensaje: MENSAJE_SIN_LEER_EL_VALOR })
    act(() => {
      result.current.releer()
    })
    expect(result.current.estado).toEqual({ tipo: 'leyendo' })
    await responder(2, leido(7))
    expect(result.current.estado).toMatchObject({ tipo: 'listo', valores: { flete: 7 } })
  })

  it('sin publicada, o sin la constante: lo dice, sin valores', async () => {
    const sinPublicada = renderHook(() => useValorPorDefecto({ origenId: ORIGEN, nodos: NODOS }))
    await responder(1, { ok: true, data: null })
    expect(sinPublicada.result.current.estado).toEqual({
      tipo: 'sin_constante',
      mensaje: MENSAJE_SIN_LA_CONSTANTE,
    })
    const sinConstante = renderHook(() => useValorPorDefecto({ origenId: ORIGEN, nodos: NODOS }))
    await responder(2, leido(null))
    expect(sinConstante.result.current.estado).toEqual({
      tipo: 'sin_constante',
      mensaje: MENSAJE_SIN_LA_CONSTANTE,
    })
  })

  it('el que llega tarde no pisa al último: con el primero resuelto después del segundo, queda el segundo', async () => {
    const { result } = renderHook(() => useValorPorDefecto({ origenId: ORIGEN, nodos: NODOS }))
    await waitFor(() => {
      expect(pedidos.length).toBe(1)
    })
    act(() => {
      result.current.releer()
    })
    await responder(2, leido(8, 4))
    await responder(1, leido(5, 3))
    expect(result.current.estado).toMatchObject({
      tipo: 'listo',
      version: 4,
      valores: { flete: 8 },
    })
  })

  it('una promesa que falla es un error de lectura', async () => {
    pedidos.length = 0
    const { result } = renderHook(() => useValorPorDefecto({ origenId: ORIGEN, nodos: NODOS }))
    await waitFor(() => {
      expect(pedidos.length).toBe(1)
    })
    await act(async () => {
      pedidos[0]?.resolver(Promise.reject(new Error('red')) as unknown as Respuesta)
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(result.current.estado).toEqual({ tipo: 'error', mensaje: MENSAJE_SIN_LEER_EL_VALOR })
    })
  })
})
