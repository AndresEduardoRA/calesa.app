import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fallo, type Resultado } from '@/shared/lib/errores'
import type { TipoCambioDelNodo } from '../../../entities/formula/tipo-cambio'
import { useTipoCambioDelNodo } from './use-tipo-cambio-del-nodo'

type Respuesta = Resultado<TipoCambioDelNodo | null>
type Pedido = {
  formulaId: string
  nodo: string
  resolver: (r: Respuesta) => void
  rechazar: (e: Error) => void
}
const pedidos: Pedido[] = []
vi.mock('../../../areas/formula/composicion.client', () => ({
  leerTipoCambioDelNodo: (pedido: { formulaId: string; nodo: string }) =>
    new Promise<Respuesta>((resolver, rechazar) => {
      pedidos.push({ ...pedido, resolver, rechazar })
    }),
}))

const FORMULA = '44444444-4444-4444-8444-444444444444'
const FILA: TipoCambioDelNodo = {
  id: '55555555-5555-4555-8555-555555555555',
  clave: 'oficial',
  nombre: 'Oficial',
  monedaDe: 'USD',
  monedaA: 'BOB',
  valor: 11.68,
  activo: true,
  actualizadoEn: '2026-11-06T22:27:12.123456-04:00',
}

const responder = async (n: number, r: Respuesta) => {
  await waitFor(() => {
    expect(pedidos.length).toBeGreaterThanOrEqual(n)
  })
  await act(async () => {
    pedidos[n - 1]?.resolver(r)
    await Promise.resolve()
  })
}

const montar = () => renderHook(() => useTipoCambioDelNodo({ formulaId: FORMULA, nodo: 'tc' }))

beforeEach(() => {
  pedidos.length = 0
})

describe('useTipoCambioDelNodo', () => {
  it('al montarse lee una vez la versión de la hoja y el nodo, y queda listo con la fila', async () => {
    const { result } = montar()
    expect(result.current.estado).toEqual({ tipo: 'leyendo' })
    await responder(1, { ok: true, data: FILA })
    expect(pedidos.map(({ formulaId, nodo }) => ({ formulaId, nodo }))).toEqual([
      { formulaId: FORMULA, nodo: 'tc' },
    ])
    expect(result.current.estado).toEqual({ tipo: 'listo', tipoCambio: FILA })
  })

  it('sin fila (la base da nulo) queda sin tipo de cambio', async () => {
    const { result } = montar()
    await responder(1, { ok: true, data: null })
    expect(result.current.estado).toEqual({ tipo: 'sin_tipo' })
  })

  it('un error o la promesa caída quedan en error; releer vuelve a leer', async () => {
    const { result } = montar()
    await responder(1, fallo('inesperado', 'algo'))
    expect(result.current.estado).toEqual({ tipo: 'error' })
    act(() => {
      result.current.releer()
    })
    expect(result.current.estado).toEqual({ tipo: 'leyendo' })
    await waitFor(() => {
      expect(pedidos).toHaveLength(2)
    })
    await act(async () => {
      pedidos[1]?.rechazar(new Error('sin red'))
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(result.current.estado).toEqual({ tipo: 'error' })
    })
  })

  it('la respuesta de un pedido anterior se descarta: gana el último', async () => {
    const { result } = montar()
    await waitFor(() => {
      expect(pedidos).toHaveLength(1)
    })
    act(() => {
      result.current.releer()
    })
    await responder(2, { ok: true, data: { ...FILA, valor: 12 } })
    await responder(1, { ok: true, data: FILA })
    expect(result.current.estado).toEqual({ tipo: 'listo', tipoCambio: { ...FILA, valor: 12 } })
  })

  it('lo que llega con el componente desmontado no cambia nada', async () => {
    const { result, unmount } = montar()
    await waitFor(() => {
      expect(pedidos).toHaveLength(1)
    })
    unmount()
    await responder(1, { ok: true, data: FILA })
    expect(result.current.estado).toEqual({ tipo: 'leyendo' })
  })
})
