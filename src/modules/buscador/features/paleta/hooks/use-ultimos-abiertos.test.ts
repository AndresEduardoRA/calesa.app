import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MENSAJE_SIN_RESPUESTA, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Abierto } from '../../../entities/ranking'
import { useUltimosAbiertos } from './use-ultimos-abiertos'

// `leerUltimosAbiertos` vive en `infra/visitados.client.ts` y trae supabase: aquí la lectura entra por argumento.
type Pedido = { signal: AbortSignal; responder: (r: Resultado<Abierto[]>) => void }

const abierto = (n: number): Abierto => ({
  tipo: 'lead',
  fila: {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    nombre: `Lead ${String(n)}`,
    numero_visible: n,
  },
})

function lecturaManual() {
  const pedidos: Pedido[] = []
  const leer = vi.fn(
    ({ signal }: { signal: AbortSignal }) =>
      new Promise<Resultado<Abierto[]>>((responder) => {
        pedidos.push({ signal, responder })
      }),
  )
  return { pedidos, leer }
}

const responder = (pedido: Pedido | undefined, r: Resultado<Abierto[]>) =>
  act(async () => {
    pedido?.responder(r)
    await Promise.resolve()
  })

describe('useUltimosAbiertos', () => {
  it('abrir lee una vez y cerrar y abrir otra vez vuelve a leer, sin enseñar la lista vieja', async () => {
    const { pedidos, leer } = lecturaManual()
    const { result, rerender } = renderHook(
      ({ abierta }: { abierta: boolean }) => useUltimosAbiertos({ abierta, leer }),
      { initialProps: { abierta: true } },
    )
    expect(result.current.estado).toEqual({ tipo: 'cargando' })
    expect(leer).toHaveBeenCalledTimes(1)
    await responder(pedidos[0], ok([abierto(1)]))
    expect(result.current.estado).toEqual({ tipo: 'listo', abiertos: [abierto(1)] })
    rerender({ abierta: false })
    rerender({ abierta: true })
    expect(leer).toHaveBeenCalledTimes(2)
    expect(result.current.estado).toEqual({ tipo: 'cargando' })
    await responder(pedidos[1], ok([abierto(2)]))
    expect(result.current.estado).toEqual({ tipo: 'listo', abiertos: [abierto(2)] })
  })

  it('cerrada no lee', () => {
    const { leer } = lecturaManual()
    renderHook(() => useUltimosAbiertos({ abierta: false, leer }))
    expect(leer).not.toHaveBeenCalled()
  })

  it('cerrar con la lectura en vuelo la aborta y su respuesta tardía no se guarda', async () => {
    const { pedidos, leer } = lecturaManual()
    const { result, rerender } = renderHook(
      ({ abierta }: { abierta: boolean }) => useUltimosAbiertos({ abierta, leer }),
      { initialProps: { abierta: true } },
    )
    rerender({ abierta: false })
    expect(pedidos[0]?.signal.aborted).toBe(true)
    await responder(pedidos[0], ok([abierto(1)]))
    rerender({ abierta: true })
    expect(result.current.estado).toEqual({ tipo: 'cargando' })
  })

  it('un error se dice y reintentar vuelve a leer', async () => {
    const { pedidos, leer } = lecturaManual()
    const { result } = renderHook(() => useUltimosAbiertos({ abierta: true, leer }))
    await responder(pedidos[0], fallo('inesperado', MENSAJE_SIN_RESPUESTA))
    expect(result.current.estado).toEqual({ tipo: 'error', mensaje: MENSAJE_SIN_RESPUESTA })
    act(() => {
      result.current.reintentar()
    })
    expect(leer).toHaveBeenCalledTimes(2)
    expect(result.current.estado).toEqual({ tipo: 'cargando' })
    await responder(pedidos[1], ok([]))
    expect(result.current.estado).toEqual({ tipo: 'listo', abiertos: [] })
  })

  it('sin red es «sin conexión»', async () => {
    const { pedidos, leer } = lecturaManual()
    const enLinea = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
    const { result } = renderHook(() => useUltimosAbiertos({ abierta: true, leer }))
    await responder(pedidos[0], fallo('inesperado', MENSAJE_SIN_RESPUESTA))
    enLinea.mockRestore()
    expect(result.current.estado).toEqual({ tipo: 'sin_conexion', mensaje: MENSAJE_SIN_RESPUESTA })
  })
})
