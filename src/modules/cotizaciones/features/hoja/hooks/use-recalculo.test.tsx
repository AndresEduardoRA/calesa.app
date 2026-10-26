import { Activity, StrictMode, type ReactNode } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import { ENTRADAS_VACIAS, type Entradas } from '../../../entities/entradas'
import type { RespuestaDeRecalculo } from '../../../entities/recalculo'
import { ESPERA_DE_RECALCULO_MS, useRecalculo } from './use-recalculo'

type Pendiente = {
  entradas: Entradas
  soltar: (r: Resultado<RespuestaDeRecalculo>) => void
}

const INICIAL = { respuesta: respuestaDePrueba({ usd: 1 }), estado: { tipo: 'al_dia' } } as const
const conTotal = (usd: number) => ok(respuestaDePrueba({ usd }))
const entradas = (n: number): Entradas => ({
  ...ENTRADAS_VACIAS,
  inputs: new Map([['remate', n]]),
})

// Un `pedir` que se contesta a mano: cada llamada queda en `pendientes` hasta que el test la suelta, y se cuenta cuántos van en vuelo a la vez.
function pedidor() {
  const pendientes: Pendiente[] = []
  let enVuelo = 0
  const cuenta = { maximo: 0 }
  const pedir = vi.fn(
    (e: Entradas) =>
      new Promise<Resultado<RespuestaDeRecalculo>>((resolver) => {
        enVuelo += 1
        cuenta.maximo = Math.max(cuenta.maximo, enVuelo)
        pendientes.push({
          entradas: e,
          soltar: (r) => {
            enVuelo -= 1
            resolver(r)
          },
        })
      }),
  )
  return { pedir, pendientes, cuenta }
}

const avanzar = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useRecalculo: la cola del recálculo de la hoja', () => {
  it('nace como lo dejó el servidor y no pide nada solo', async () => {
    const { pedir } = pedidor()
    const hook = renderHook(() => useRecalculo({ inicial: INICIAL, pedir }))
    await avanzar(1000)
    expect(pedir).not.toHaveBeenCalled()
    expect(hook.result.current.estado).toEqual({ tipo: 'al_dia' })
    expect(hook.result.current.respuesta?.totales.usd).toBe(1)
  })

  it('pide 150 ms después de la confirmación, con las entradas de ese momento, y aplica la respuesta', async () => {
    const { pedir, pendientes } = pedidor()
    const hook = renderHook(() => useRecalculo({ inicial: INICIAL, pedir }))
    act(() => {
      hook.result.current.programar(entradas(5))
    })
    expect(hook.result.current.estado).toEqual({ tipo: 'esperando' })
    await avanzar(ESPERA_DE_RECALCULO_MS - 1)
    expect(pedir).not.toHaveBeenCalled()
    await avanzar(1)
    expect(pedir).toHaveBeenCalledOnce()
    expect(pendientes[0]?.entradas.inputs.get('remate')).toBe(5)
    expect(hook.result.current.estado).toEqual({ tipo: 'recalculando' })
    await act(async () => {
      pendientes[0]?.soltar(conTotal(77))
      await Promise.resolve()
    })
    expect(hook.result.current.estado).toEqual({ tipo: 'al_dia' })
    expect(hook.result.current.respuesta?.totales.usd).toBe(77)
  })

  it('varias confirmaciones seguidas son un solo pedido, con la última', async () => {
    const { pedir, pendientes } = pedidor()
    const hook = renderHook(() => useRecalculo({ inicial: INICIAL, pedir }))
    for (const n of [1, 2, 3]) {
      act(() => {
        hook.result.current.programar(entradas(n))
      })
      await avanzar(100)
    }
    await avanzar(ESPERA_DE_RECALCULO_MS)
    expect(pedir).toHaveBeenCalledOnce()
    expect(pendientes[0]?.entradas.inputs.get('remate')).toBe(3)
  })
})

describe('useRecalculo: uno en vuelo y la respuesta más nueva', () => {
  it('con uno en vuelo no sale otro: queda pendiente y sale uno solo, con lo último, cuando vuelve; la respuesta vieja no se aplica', async () => {
    const { pedir, pendientes, cuenta } = pedidor()
    const hook = renderHook(() => useRecalculo({ inicial: INICIAL, pedir }))
    act(() => {
      hook.result.current.programar(entradas(1))
    })
    await avanzar(ESPERA_DE_RECALCULO_MS)
    expect(pedir).toHaveBeenCalledOnce()
    for (const n of [2, 3]) {
      act(() => {
        hook.result.current.programar(entradas(n))
      })
      await avanzar(ESPERA_DE_RECALCULO_MS)
    }
    expect(pedir).toHaveBeenCalledOnce()
    await act(async () => {
      pendientes[0]?.soltar(conTotal(111))
      await Promise.resolve()
    })
    // La vieja (de las entradas 1) no se aplica: el total sigue siendo el de antes y sale el pedido con las entradas 3.
    expect(hook.result.current.respuesta?.totales.usd).toBe(1)
    expect(pedir).toHaveBeenCalledTimes(2)
    expect(pendientes[1]?.entradas.inputs.get('remate')).toBe(3)
    await act(async () => {
      pendientes[1]?.soltar(conTotal(333))
      await Promise.resolve()
    })
    expect(hook.result.current.respuesta?.totales.usd).toBe(333)
    expect(hook.result.current.estado).toEqual({ tipo: 'al_dia' })
    expect(cuenta.maximo).toBe(1)
  })

  it('si la espera todavía no venció cuando vuelve la vieja, no sale un pedido de más', async () => {
    const { pedir, pendientes } = pedidor()
    const hook = renderHook(() => useRecalculo({ inicial: INICIAL, pedir }))
    act(() => {
      hook.result.current.programar(entradas(1))
    })
    await avanzar(ESPERA_DE_RECALCULO_MS)
    act(() => {
      hook.result.current.programar(entradas(2))
    })
    await act(async () => {
      pendientes[0]?.soltar(conTotal(111))
      await Promise.resolve()
    })
    expect(pedir).toHaveBeenCalledOnce()
    await avanzar(ESPERA_DE_RECALCULO_MS)
    expect(pedir).toHaveBeenCalledTimes(2)
    expect(pendientes[1]?.entradas.inputs.get('remate')).toBe(2)
  })

  it('un error de un pedido que ya no es el último no se aplica', async () => {
    const { pedir, pendientes } = pedidor()
    const hook = renderHook(() => useRecalculo({ inicial: INICIAL, pedir }))
    act(() => {
      hook.result.current.programar(entradas(1))
    })
    await avanzar(ESPERA_DE_RECALCULO_MS)
    act(() => {
      hook.result.current.programar(entradas(2))
    })
    await act(async () => {
      pendientes[0]?.soltar(fallo('inesperado', 'x'))
      await Promise.resolve()
    })
    expect(hook.result.current.estado).not.toMatchObject({ tipo: 'fallo' })
  })
})

describe('useRecalculo: fallos y reintentos', () => {
  it('un fallo deja «No se pudo recalcular» (y el total viejo no pasa por bueno); Reintentar vuelve a pedir y lo arregla', async () => {
    const { pedir, pendientes } = pedidor()
    const hook = renderHook(() => useRecalculo({ inicial: INICIAL, pedir }))
    act(() => {
      hook.result.current.programar(entradas(5))
    })
    await avanzar(ESPERA_DE_RECALCULO_MS)
    await act(async () => {
      pendientes[0]?.soltar(fallo('inesperado', 'x'))
      await Promise.resolve()
    })
    expect(hook.result.current.estado).toEqual({ tipo: 'fallo', recargar: false })
    await act(async () => {
      hook.result.current.reintentar()
      await Promise.resolve()
    })
    expect(pedir).toHaveBeenCalledTimes(2)
    expect(pendientes[1]?.entradas.inputs.get('remate')).toBe(5)
    await act(async () => {
      pendientes[1]?.soltar(conTotal(9))
      await Promise.resolve()
    })
    expect(hook.result.current.estado).toEqual({ tipo: 'al_dia' })
  })

  it('una regla rota (la fórmula cambió) pide Recargar, no Reintentar', async () => {
    const { pedir, pendientes } = pedidor()
    const hook = renderHook(() => useRecalculo({ inicial: INICIAL, pedir }))
    act(() => {
      hook.result.current.programar(entradas(5))
    })
    await avanzar(ESPERA_DE_RECALCULO_MS)
    await act(async () => {
      pendientes[0]?.soltar(fallo('regla', 'x'))
      await Promise.resolve()
    })
    expect(hook.result.current.estado).toEqual({ tipo: 'fallo', recargar: true })
  })

  it('un pedido que se rechaza (la red se cortó a mitad) es un fallo, no una pantalla rota', async () => {
    const pedir = vi.fn(() => Promise.reject(new Error('sin red')))
    const hook = renderHook(() => useRecalculo({ inicial: INICIAL, pedir }))
    act(() => {
      hook.result.current.programar(entradas(5))
    })
    await avanzar(ESPERA_DE_RECALCULO_MS)
    expect(hook.result.current.estado).toEqual({ tipo: 'fallo', recargar: false })
  })

  it('reintentar con uno en vuelo descarta esa respuesta y sale uno solo', async () => {
    const { pedir, pendientes, cuenta } = pedidor()
    const hook = renderHook(() => useRecalculo({ inicial: INICIAL, pedir }))
    act(() => {
      hook.result.current.programar(entradas(5))
    })
    await avanzar(ESPERA_DE_RECALCULO_MS)
    act(() => {
      hook.result.current.reintentar()
    })
    expect(pedir).toHaveBeenCalledOnce()
    await act(async () => {
      pendientes[0]?.soltar(conTotal(1))
      await Promise.resolve()
    })
    expect(pedir).toHaveBeenCalledTimes(2)
    expect(cuenta.maximo).toBe(1)
  })
})

describe('useRecalculo: montaje y pantalla escondida', () => {
  it('con StrictMode (monta, desmonta y vuelve a montar) pide lo mismo: uno por pausa', async () => {
    const { pedir } = pedidor()
    const hook = renderHook(() => useRecalculo({ inicial: INICIAL, pedir }), {
      wrapper: StrictMode,
    })
    act(() => {
      hook.result.current.programar(entradas(5))
    })
    await avanzar(ESPERA_DE_RECALCULO_MS)
    expect(pedir).toHaveBeenCalledOnce()
  })

  it('al esconderse la pantalla (Next la guarda en un <Activity> oculto) no manda nada y, si algo quedaba sin aplicar, dice que no se pudo recalcular', async () => {
    const { pedir } = pedidor()
    let modo: 'visible' | 'hidden' = 'visible'
    const Pantalla = ({ children }: { children: ReactNode }) => (
      <Activity mode={modo}>{children}</Activity>
    )
    const hook = renderHook(() => useRecalculo({ inicial: INICIAL, pedir }), { wrapper: Pantalla })
    act(() => {
      hook.result.current.programar(entradas(5))
    })
    modo = 'hidden'
    await act(async () => {
      hook.rerender()
      await Promise.resolve()
    })
    await avanzar(1000)
    expect(pedir).not.toHaveBeenCalled()
    modo = 'visible'
    await act(async () => {
      hook.rerender()
      await Promise.resolve()
    })
    expect(hook.result.current.estado).toEqual({ tipo: 'fallo', recargar: false })
    await act(async () => {
      hook.result.current.reintentar()
      await Promise.resolve()
    })
    expect(pedir).toHaveBeenCalledOnce()
  })
})
